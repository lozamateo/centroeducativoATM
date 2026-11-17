// FacturacionService: tarifas, facturas mensuales, pagos por transferencia y reportes de pagos.
// Los pagos son una simulación para el trabajo práctico: no se procesa dinero real.
import { query, queryOne, transaction } from '../db.js';
import { badRequest, notFound } from '../errors.js';
import {
  METODO_PAGO, deudaPorTipo, esPeriodo, estadoFactura, hoyArgentina, nombrePeriodo, tieneDeuda, validarPago,
} from '../rules/facturacion.js';

// ----- Tarifas (el administrador solo define valores) -----

export async function tarifas() {
  const [generales, deportes, recorridos] = await Promise.all([
    query('select clave, descripcion, importe, updated_at from tarifas order by importe desc'),
    query(
      `select d.id, d.nombre, d.precio_mensual, p.apellido || ', ' || p.nombre as profesor_responsable
       from deportes d left join profesores p on p.id = d.profesor_responsable_id
       where d.activo order by d.nombre`,
    ),
    query('select id, nombre, zona, precio_mensual from recorridos_transporte order by id'),
  ]);
  return { generales, deportes, recorridos };
}

function importeValido(valor) {
  const importe = Number(valor);
  if (!Number.isInteger(importe) || importe < 0 || importe > 10_000_000) throw badRequest('El importe debe ser un número entero positivo.');
  return importe;
}

export async function actualizarTarifa(usuarioId, tipo, id, valor) {
  const importe = importeValido(valor);
  const sql = {
    general: 'update tarifas set importe = $2, updated_at = now() where clave = $1 returning clave',
    deporte: 'update deportes set precio_mensual = $2 where id = $1::bigint returning id',
    recorrido: 'update recorridos_transporte set precio_mensual = $2 where id = $1::smallint returning id',
  }[tipo];
  if (!sql) throw badRequest('Tipo de tarifa inválido.');
  const row = await transaction(usuarioId, (tx) => tx.queryOne(sql, [id, importe]));
  if (!row) throw notFound('Tarifa no encontrada.');
  return tarifas();
}

// ----- Facturas -----

export async function generarFacturas(usuarioId, periodo) {
  if (!esPeriodo(periodo)) throw badRequest('El período debe tener formato AAAA-MM.');
  const row = await transaction(usuarioId, (tx) => tx.queryOne('select generar_facturas($1) as creadas', [periodo]));
  return { periodo, creadas: row.creadas };
}

const facturaSql = `
  select f.id, f.numero, f.alumno_id, a.apellido || ', ' || a.nombre as alumno, a.legajo, f.periodo,
         f.fecha_emision, f.vence, f.total,
         coalesce((select sum(i.importe) from factura_items i where i.factura_id = f.id and i.pago_id is not null), 0)::int as pagado
  from facturas f join alumnos a on a.id = f.alumno_id`;

function conEstado(factura, hoy = hoyArgentina()) {
  const estado = estadoFactura(factura, hoy);
  return { ...factura, mes: nombrePeriodo(factura.periodo), saldo: factura.total - factura.pagado, estado };
}

function rango({ desde, hasta } = {}) {
  if (desde && !esPeriodo(desde)) throw badRequest('El período "desde" debe tener formato AAAA-MM.');
  if (hasta && !esPeriodo(hasta)) throw badRequest('El período "hasta" debe tener formato AAAA-MM.');
  return [desde || null, hasta || null];
}

// Facturas de un alumno en un rango de períodos, con sus ítems, pagos y comprobantes.
export async function facturasAlumno(alumnoId, filtros = {}) {
  const [desde, hasta] = rango(filtros);
  const facturas = (await query(
    `${facturaSql} where f.alumno_id = $1 and ($2::text is null or f.periodo >= $2) and ($3::text is null or f.periodo <= $3)
     order by f.periodo desc`,
    [alumnoId, desde, hasta],
  )).map((f) => conEstado(f));
  if (!facturas.length) return [];

  const ids = facturas.map((f) => f.id);
  const [items, pagos, comprobantes] = await Promise.all([
    query('select id, factura_id, tipo, descripcion, importe, pago_id from factura_items where factura_id = any($1) order by factura_id, id', [ids]),
    query(
      `select p.id, p.numero, p.factura_id, p.importe, p.metodo, p.numero_operacion, p.fecha_transferencia, p.fecha,
              u.nombre || ' ' || u.apellido as registrado_por
       from pagos p left join usuarios u on u.id = p.registrado_por where p.factura_id = any($1) order by p.fecha`,
      [ids],
    ),
    query(
      'select id, pago_id, factura_id, nombre_archivo, tipo_mime, tamano, created_at from comprobantes_transferencia where factura_id = any($1) order by id',
      [ids],
    ),
  ]);

  return facturas.map((f) => ({
    ...f,
    items: items.filter((i) => i.factura_id === f.id),
    pagos: pagos.filter((p) => p.factura_id === f.id).map((p) => ({
      ...p,
      items: items.filter((i) => i.pago_id === p.id).map((i) => i.descripcion),
      comprobantes: comprobantes.filter((c) => c.pago_id === p.id),
    })),
  }));
}

// Historial de deuda del alumno discriminado por ítem de pago.
export async function historialDeuda(alumnoId) {
  const hoy = hoyArgentina();
  const items = await query(
    `select i.id, i.tipo, i.descripcion, i.importe, f.id as factura_id, f.numero as factura, f.periodo, f.vence
     from factura_items i join facturas f on f.id = i.factura_id
     where f.alumno_id = $1 and i.pago_id is null
     order by f.periodo, i.id`,
    [alumnoId],
  );
  const conMes = items.map((i) => ({ ...i, mes: nombrePeriodo(i.periodo), vencido: hoy > i.vence }));
  const vencidos = conMes.filter((i) => i.vencido);
  return {
    total_adeudado: vencidos.reduce((s, i) => s + i.importe, 0),
    a_vencer: conMes.filter((i) => !i.vencido).reduce((s, i) => s + i.importe, 0),
    adeuda_desde: vencidos[0]?.periodo ?? null,
    por_tipo: deudaPorTipo(vencidos),
    items: conMes,
  };
}

// Estado de cuenta completo de un alumno (para la familia, el alumno y la administración).
export async function cuentaAlumno(alumnoId, filtros = {}) {
  const alumno = await queryOne(
    `select a.id as alumno_id, a.apellido || ', ' || a.nombre as alumno, a.legajo,
            coalesce((select count(distinct a2.id)::int from alumnos_tutores t1
                      join alumnos_tutores t2 on t2.tutor_id = t1.tutor_id
                      join alumnos a2 on a2.id = t2.alumno_id and a2.activo
                      where t1.alumno_id = a.id), 1) as hijos_en_el_colegio
     from alumnos a where a.id = $1`,
    [alumnoId],
  );
  if (!alumno) throw notFound('Alumno no encontrado.');
  const [facturas, deuda] = await Promise.all([facturasAlumno(alumnoId, filtros), historialDeuda(alumnoId)]);
  return { ...alumno, descuento_hermanos: alumno.hijos_en_el_colegio >= 2, metodo_pago: METODO_PAGO, deuda, facturas };
}

// La familia elige los ítems de una factura, informa la transferencia y adjunta el comprobante.
export async function pagar(usuarioId, alumnoId, facturaId, body) {
  const itemIds = Array.isArray(body.item_ids) ? body.item_ids.map(Number) : [];
  const comprobante = body.comprobante && {
    nombre: String(body.comprobante.nombre ?? '').slice(0, 120),
    tipo: body.comprobante.tipo,
    contenido: String(body.comprobante.contenido ?? '').replace(/^data:[^,]+,/, ''),
  };

  return transaction(usuarioId, async (tx) => {
    const factura = await tx.queryOne('select * from facturas where id = $1 and alumno_id = $2 for update', [facturaId, alumnoId]);
    if (!factura) throw notFound('Factura no encontrada.');
    const itemsFactura = await tx.query('select id, descripcion, importe, pago_id from factura_items where factura_id = $1', [facturaId]);

    const error = validarPago({
      itemIds,
      itemsFactura,
      numeroOperacion: body.numero_operacion,
      fechaTransferencia: body.fecha_transferencia,
      comprobante,
      hoy: hoyArgentina(),
    });
    if (error) throw badRequest(error);

    const importe = itemsFactura.filter((i) => itemIds.includes(i.id)).reduce((s, i) => s + i.importe, 0);
    if (importe <= 0) throw badRequest('Los ítems elegidos no tienen importe a pagar.');

    const pago = await tx.queryOne(
      `insert into pagos (factura_id, alumno_id, importe, numero_operacion, fecha_transferencia, registrado_por)
       values ($1, $2, $3, $4, $5, $6) returning id, numero, importe, metodo, fecha`,
      [facturaId, alumnoId, importe, body.numero_operacion, body.fecha_transferencia, usuarioId],
    );
    await tx.query('update factura_items set pago_id = $1 where factura_id = $2 and id = any($3) and pago_id is null', [pago.id, facturaId, itemIds]);
    await tx.query(
      `insert into comprobantes_transferencia (pago_id, factura_id, nombre_archivo, tipo_mime, tamano, contenido)
       values ($1, $2, $3, $4, $5, $6)`,
      [pago.id, facturaId, comprobante.nombre, comprobante.tipo, Math.floor((comprobante.contenido.length * 3) / 4), comprobante.contenido],
    );
    return { ...pago, factura: factura.numero, recibo: pago.numero };
  });
}

// Descarga del comprobante adjunto. alumnoIds limita el acceso (familia: solo sus hijos).
export async function comprobante(id, alumnoIds = null) {
  const row = await queryOne(
    `select c.nombre_archivo, c.tipo_mime, c.contenido, f.alumno_id
     from comprobantes_transferencia c join facturas f on f.id = c.factura_id where c.id = $1`,
    [id],
  );
  if (!row || (alumnoIds && !alumnoIds.includes(row.alumno_id))) throw notFound('Comprobante no encontrado.');
  return row;
}

// ----- Panel de administración -----

export async function panel({ periodo, nivel_id } = {}) {
  if (periodo && !esPeriodo(periodo)) throw badRequest('El período debe tener formato AAAA-MM.');
  const hoy = hoyArgentina();
  const actual = periodo || hoy.slice(0, 7);
  const facturas = (await query(
    `${facturaSql} where f.periodo = $1 and ($2::int is null or a.nivel_id = $2) order by a.apellido, a.nombre`,
    [actual, nivel_id ?? null],
  )).map((f) => conEstado(f, hoy));
  const deudores = await query(
    `select a.id as alumno_id, a.apellido || ', ' || a.nombre as alumno, a.legajo, n.nombre as nivel,
            min(f.periodo) as adeuda_desde, sum(i.importe)::int as total_adeudado, count(distinct f.id)::int as facturas
     from factura_items i
     join facturas f on f.id = i.factura_id
     join alumnos a on a.id = f.alumno_id
     left join niveles_educativos n on n.id = a.nivel_id
     where i.pago_id is null and f.vence < $1::date and ($2::int is null or a.nivel_id = $2)
     group by a.id, n.nombre order by min(f.periodo), a.apellido`,
    [hoy, nivel_id ?? null],
  );
  const periodos = (await query('select distinct periodo from facturas order by periodo')).map((r) => r.periodo);
  return {
    hoy,
    periodo: actual,
    periodos,
    resumen: {
      facturado: facturas.reduce((s, f) => s + f.total, 0),
      cobrado: facturas.reduce((s, f) => s + f.pagado, 0),
      pagadas: facturas.filter((f) => f.estado === 'Pagada').length,
      incompletas: facturas.filter((f) => f.estado.startsWith('Pago incompleto')).length,
      impagas: facturas.filter((f) => f.pagado === 0).length,
      deuda_vencida: deudores.reduce((s, d) => s + d.total_adeudado, 0),
    },
    facturas,
    deudores: deudores.map((d) => ({ ...d, adeuda_desde_mes: nombrePeriodo(d.adeuda_desde) })),
  };
}

// ----- Reportes de pagos (aplicación web) -----

const rangoPagos = `($1::text is null or to_char(p.fecha_transferencia, 'YYYY-MM') >= $1)
                and ($2::text is null or to_char(p.fecha_transferencia, 'YYYY-MM') <= $2)`;

// Listado de ingresos por período de tiempo (por fecha de la transferencia).
export async function ingresos(filtros) {
  const [desde, hasta] = rango(filtros);
  const detalle = await query(
    `select p.id, p.numero as recibo, p.fecha_transferencia, p.numero_operacion, p.importe, p.metodo,
            f.numero as factura, f.periodo, a.apellido || ', ' || a.nombre as alumno, a.legajo
     from pagos p join facturas f on f.id = p.factura_id join alumnos a on a.id = p.alumno_id
     where ${rangoPagos} order by p.fecha_transferencia, p.id`,
    [desde, hasta],
  );
  const porMes = {};
  for (const p of detalle) {
    const mes = p.fecha_transferencia.slice(0, 7);
    porMes[mes] = (porMes[mes] ?? 0) + p.importe;
  }
  return {
    total: detalle.reduce((s, p) => s + p.importe, 0),
    por_mes: Object.entries(porMes).map(([periodo, total]) => ({ periodo, mes: nombrePeriodo(periodo), total })),
    detalle,
  };
}

// Pagos completos o incompletos por período, discriminados por año y por alumno.
export async function pagosPorEstado(filtros, completos) {
  const [desde, hasta] = rango(filtros);
  const hoy = hoyArgentina();
  const filas = (await query(
    `${facturaSql}
     where ($1::text is null or f.periodo >= $1) and ($2::text is null or f.periodo <= $2)
     order by left(f.periodo, 4), a.apellido, a.nombre, f.periodo`,
    [desde, hasta],
  )).map((f) => conEstado(f, hoy));
  const elegidas = filas.filter((f) => (completos ? f.estado === 'Pagada' : tieneDeuda(f.estado) && f.pagado > 0));

  const anios = [];
  for (const f of elegidas) {
    const anio = f.periodo.slice(0, 4);
    let grupoAnio = anios.find((g) => g.anio === anio);
    if (!grupoAnio) anios.push((grupoAnio = { anio, total: 0, pagado: 0, saldo: 0, alumnos: [] }));
    let grupoAlumno = grupoAnio.alumnos.find((g) => g.alumno_id === f.alumno_id);
    if (!grupoAlumno) grupoAnio.alumnos.push((grupoAlumno = { alumno_id: f.alumno_id, alumno: f.alumno, legajo: f.legajo, total: 0, pagado: 0, saldo: 0, facturas: [] }));
    for (const g of [grupoAnio, grupoAlumno]) {
      g.total += f.total;
      g.pagado += f.pagado;
      g.saldo += f.saldo;
    }
    grupoAlumno.facturas.push({ numero: f.numero, periodo: f.periodo, mes: f.mes, total: f.total, pagado: f.pagado, saldo: f.saldo, estado: f.estado });
  }
  return { cantidad: elegidas.length, anios };
}

// Pagos de deportes por alumno, con deporte, nivel, horario y profesor a cargo.
export async function pagosDeportes(filtros = {}) {
  const [desde, hasta] = rango(filtros);
  return query(
    `select i.id, d.nombre as deporte, co.nombre as comision, n.nombre as nivel,
            (select string_agg(case h.dia_semana when 1 then 'Lun' when 2 then 'Mar' when 3 then 'Mié' when 4 then 'Jue'
                                when 5 then 'Vie' else 'Sáb' end || ' ' || to_char(h.hora_inicio, 'HH24:MI') || '-' || to_char(h.hora_fin, 'HH24:MI'), ' · '
                               order by h.dia_semana)
               from horarios h where h.comision_id = co.id) as horario,
            coalesce(p.apellido || ', ' || p.nombre, 'A designar') as profesor,
            a.apellido || ', ' || a.nombre as alumno, a.legajo, f.periodo, f.numero as factura, i.importe,
            (i.pago_id is not null) as pagado, pg.numero as recibo
     from factura_items i
     join facturas f on f.id = i.factura_id
     join alumnos a on a.id = f.alumno_id
     join comisiones co on co.id = i.comision_id
     join deportes d on d.id = co.deporte_id
     join niveles_educativos n on n.id = co.nivel_id
     left join profesores p on p.id = co.profesor_id
     left join pagos pg on pg.id = i.pago_id
     where i.tipo = 'Deporte'
       and ($1::text is null or f.periodo >= $1) and ($2::text is null or f.periodo <= $2)
       and ($3::bigint is null or d.id = $3) and ($4::int is null or n.id = $4) and ($5::bigint is null or co.profesor_id = $5)
     order by d.nombre, n.nombre, a.apellido, f.periodo`,
    [desde, hasta, filtros.deporte_id ?? null, filtros.nivel_id ?? null, filtros.profesor_id ?? null],
  );
}

// Pagos del servicio de transporte por recorrido.
export async function pagosTransporte(filtros = {}) {
  const [desde, hasta] = rango(filtros);
  return query(
    `select i.id, r.id as recorrido_id, r.nombre as recorrido, r.zona,
            a.apellido || ', ' || a.nombre as alumno, a.legajo, f.periodo, f.numero as factura, i.importe,
            (i.pago_id is not null) as pagado, pg.numero as recibo
     from factura_items i
     join facturas f on f.id = i.factura_id
     join alumnos a on a.id = f.alumno_id
     join recorridos_transporte r on r.id = i.recorrido_id
     left join pagos pg on pg.id = i.pago_id
     where i.tipo = 'Transporte'
       and ($1::text is null or f.periodo >= $1) and ($2::text is null or f.periodo <= $2)
       and ($3::int is null or r.id = $3)
     order by r.id, a.apellido, f.periodo`,
    [desde, hasta, filtros.recorrido_id ?? null],
  );
}

// Una factura con sus ítems (para descargarla en PDF desde la web, la app o el correo).
export async function factura(id) {
  const row = await queryOne(`${facturaSql} where f.id = $1`, [id]);
  if (!row) throw notFound('Factura no encontrada.');
  const items = await query('select id, tipo, descripcion, importe, pago_id from factura_items where factura_id = $1 order by id', [id]);
  const tutor = await queryOne(
    `select t.apellido || ', ' || t.nombre as tutor, t.dni from alumnos_tutores at join tutores t on t.id = at.tutor_id
     where at.alumno_id = $1 order by at.es_responsable desc limit 1`,
    [row.alumno_id],
  );
  return { ...conEstado(row), items, tutor: tutor?.tutor ?? null, tutor_dni: tutor?.dni ?? null };
}
