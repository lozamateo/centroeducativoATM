// NotificacionesService: correos automáticos a las familias.
// Es una bandeja simulada (trabajo práctico): los correos se guardan en la base y se ven en la web y la app,
// pero no se envían mails reales.
import { query, transaction } from '../db.js';
import { badRequest } from '../errors.js';
import { esFecha, esPeriodo, hoyArgentina, nombrePeriodo, tareasDelDia } from '../rules/facturacion.js';

const pesos = (n) => `$ ${Number(n).toLocaleString('es-AR')}`;

// Tutores con su correo y los alumnos que tienen a cargo.
const tutoresSql = `
  select t.id as tutor_id, t.nombre || ' ' || t.apellido as nombre, coalesce(u.email, t.email) as email, u.id as usuario_id,
         array_agg(at.alumno_id order by at.alumno_id) as alumnos
  from tutores t
  join alumnos_tutores at on at.tutor_id = t.id
  join alumnos a on a.id = at.alumno_id and a.activo
  left join usuarios u on u.id = t.usuario_id
  where coalesce(u.email, t.email) is not null
  group by t.id, u.email, u.id`;

// Último día hábil: total a abonar el mes siguiente, con la composición y la factura adjunta.
export async function enviarRecordatorios(periodo, usuarioId = null) {
  if (!esPeriodo(periodo)) throw badRequest('El período debe tener formato AAAA-MM.');
  return transaction(usuarioId, async (tx) => {
    await tx.query('select generar_facturas($1)', [periodo]);
    const tutores = await tx.query(tutoresSql);
    let enviados = 0;
    for (const tutor of tutores) {
      const facturas = await tx.query(
        `select f.id, f.numero, f.total, f.vence, a.apellido || ', ' || a.nombre as alumno,
                (select json_agg(json_build_object('descripcion', i.descripcion, 'importe', i.importe) order by i.id)
                   from factura_items i where i.factura_id = f.id) as items
         from facturas f join alumnos a on a.id = f.alumno_id
         where f.periodo = $1 and f.alumno_id = any($2) order by a.apellido, a.nombre`,
        [periodo, tutor.alumnos],
      );
      if (!facturas.length) continue;
      const total = facturas.reduce((s, f) => s + f.total, 0);
      const detalle = facturas.map((f) => [
        `${f.alumno} — Factura ${f.numero} (vence el ${f.vence.split('-').reverse().join('/')})`,
        ...f.items.map((i) => `   • ${i.descripcion}: ${pesos(i.importe)}`),
        `   Subtotal: ${pesos(f.total)}`,
      ].join('\n')).join('\n\n');
      const cuerpo = `Hola ${tutor.nombre}:\n\nTe recordamos el total a abonar por la cuota de ${nombrePeriodo(periodo)}: ${pesos(total)}.\n\n` +
        `${detalle}\n\nSe paga del 1 al 15 de ${nombrePeriodo(periodo).split(' ')[0].toLowerCase()} por transferencia bancaria. ` +
        'Desde la web o la app podés elegir qué ítems pagar y adjuntar el comprobante.\n\n' +
        'Adjuntamos las facturas.\n\nEducar para Transformar';
      const row = await tx.queryOne(
        `insert into notificaciones (tipo, periodo, tutor_id, usuario_id, destinatario_nombre, destinatario_email, asunto, cuerpo, factura_ids, total)
         values ('Recordatorio de pago', $1, $2, $3, $4, $5, $6, $7, $8, $9)
         on conflict (tipo, tutor_id, periodo) where tipo <> 'Recuperar contraseña' do nothing returning id`,
        [periodo, tutor.tutor_id, tutor.usuario_id, tutor.nombre, tutor.email,
          `Cuota de ${nombrePeriodo(periodo)}: total a abonar ${pesos(total)}`, cuerpo, facturas.map((f) => f.id), total],
      );
      if (row) enviados += 1;
    }
    return { tipo: 'Recordatorio de pago', periodo, enviados };
  });
}

// Día 20: deuda pendiente a quien no completó el pago (todas las facturas vencidas hasta ese mes).
export async function enviarAvisosDeuda(periodo, usuarioId = null) {
  if (!esPeriodo(periodo)) throw badRequest('El período debe tener formato AAAA-MM.');
  return transaction(usuarioId, async (tx) => {
    const tutores = await tx.query(tutoresSql);
    let enviados = 0;
    for (const tutor of tutores) {
      const items = await tx.query(
        `select f.id as factura_id, f.numero, f.periodo, a.apellido || ', ' || a.nombre as alumno, i.descripcion, i.importe
         from factura_items i join facturas f on f.id = i.factura_id join alumnos a on a.id = f.alumno_id
         where i.pago_id is null and f.periodo <= $1 and f.alumno_id = any($2)
         order by a.apellido, f.periodo, i.id`,
        [periodo, tutor.alumnos],
      );
      if (!items.length) continue;
      const total = items.reduce((s, i) => s + i.importe, 0);
      const lineas = items.map((i) => `   • ${i.alumno} — ${nombrePeriodo(i.periodo)} (${i.numero}): ${i.descripcion} ${pesos(i.importe)}`);
      const cuerpo = `Hola ${tutor.nombre}:\n\nAl día de hoy no registramos el pago completo de los siguientes conceptos:\n\n` +
        `${lineas.join('\n')}\n\nDeuda total: ${pesos(total)}.\n\n` +
        'Podés regularizarla por transferencia desde la web o la app, adjuntando el comprobante. ' +
        'Si ya pagaste, desestimá este mensaje.\n\nEducar para Transformar';
      const row = await tx.queryOne(
        `insert into notificaciones (tipo, periodo, tutor_id, usuario_id, destinatario_nombre, destinatario_email, asunto, cuerpo, factura_ids, total)
         values ('Aviso de deuda', $1, $2, $3, $4, $5, $6, $7, $8, $9)
         on conflict (tipo, tutor_id, periodo) where tipo <> 'Recuperar contraseña' do nothing returning id`,
        [periodo, tutor.tutor_id, tutor.usuario_id, tutor.nombre, tutor.email, `Aviso de deuda: ${pesos(total)}`, cuerpo,
          [...new Set(items.map((i) => i.factura_id))], total],
      );
      if (row) enviados += 1;
    }
    return { tipo: 'Aviso de deuda', periodo, enviados };
  });
}

// Tarea diaria (cron de Vercel o botón del administrador para simular una fecha).
export async function ejecutarTareasDiarias(fecha = hoyArgentina(), usuarioId = null) {
  if (!esFecha(fecha)) throw badRequest('La fecha debe tener formato AAAA-MM-DD.');
  const tareas = tareasDelDia(fecha);
  const resultados = [];
  if (tareas.recordatorio) resultados.push(await enviarRecordatorios(tareas.recordatorio, usuarioId));
  if (tareas.avisoDeuda) resultados.push(await enviarAvisosDeuda(tareas.avisoDeuda, usuarioId));
  return { fecha, resultados, mensaje: resultados.length ? null : 'Hoy no corresponde enviar correos (último día hábil o día 20).' };
}

export function listar({ tipo, limite } = {}) {
  return query(
    `select id, tipo, periodo, destinatario_nombre, destinatario_email, asunto, cuerpo, factura_ids, total, enviado_en
     from notificaciones where ($1::text is null or tipo = $1)
     order by enviado_en desc, id desc limit $2`,
    [tipo || null, Math.min(Number(limite) || 200, 500)],
  );
}

// Correos recibidos por la familia que inició sesión.
export function deUsuario(usuarioId) {
  return query(
    `select n.id, n.tipo, n.periodo, n.asunto, n.cuerpo, n.factura_ids, n.total, n.enviado_en
     from notificaciones n
     where n.usuario_id = $1 or n.tutor_id = (select id from tutores where usuario_id = $1)
     order by n.enviado_en desc limit 100`,
    [usuarioId],
  );
}
