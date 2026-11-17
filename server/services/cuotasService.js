// CuotasService: cuotas mensuales y pagos simulados (efectivo o transferencia).
import { query, queryOne, transaction } from '../db.js';
import { badRequest, notFound } from '../errors.js';
import {
  METODOS_PAGO, estadoCuota, esPeriodoValido, hoyArgentina, importeMensual, nombrePeriodo, periodos,
  resumenDeuda, sePuedePagar, vencimiento,
} from '../rules/cuotas.js';

// Cantidad de hijos activos del grupo familiar (alumnos que comparten algún tutor), incluido el alumno.
const hijosSql = `
  coalesce((
    select count(distinct a2.id)::int
    from alumnos_tutores t1
    join alumnos_tutores t2 on t2.tutor_id = t1.tutor_id
    join alumnos a2 on a2.id = t2.alumno_id and a2.activo
    where t1.alumno_id = a.id
  ), 0)`;

function armarCuotas(alumno, pagos, hoy) {
  const importe = importeMensual(alumno.hijos);
  const porPeriodo = new Map(pagos.map((p) => [p.periodo, p]));
  const cuotas = periodos().map((periodo) => {
    const pago = porPeriodo.get(periodo) ?? null;
    const estado = estadoCuota(periodo, hoy, Boolean(pago));
    return {
      periodo,
      mes: nombrePeriodo(periodo),
      vence: vencimiento(periodo),
      importe: pago?.importe ?? importe,
      estado,
      se_puede_pagar: sePuedePagar(estado),
      pago: pago && { id: pago.id, metodo: pago.metodo, fecha: pago.fecha, comprobante: pago.comprobante, registrado_por: pago.registrado_por_nombre },
    };
  });
  return { cuotas, importe };
}

// Cuotas de un alumno con su estado y el resumen de deuda.
export async function cuotasAlumno(alumnoId) {
  const alumno = await queryOne(
    `select a.id, a.apellido || ', ' || a.nombre as alumno, ${hijosSql} as hijos from alumnos a where a.id = $1`,
    [alumnoId],
  );
  if (!alumno) throw notFound('Alumno no encontrado.');
  const pagos = await query(
    `select p.*, u.nombre || ' ' || u.apellido as registrado_por_nombre
     from pagos_cuotas p left join usuarios u on u.id = p.registrado_por
     where p.alumno_id = $1 order by p.periodo`,
    [alumnoId],
  );
  const { cuotas, importe } = armarCuotas(alumno, pagos, hoyArgentina());
  return {
    alumno_id: alumno.id,
    alumno: alumno.alumno,
    hijos_en_el_colegio: Math.max(alumno.hijos, 1),
    importe_mensual: importe,
    descuento_hermanos: alumno.hijos >= 2,
    ...resumenDeuda(cuotas),
    pagadas: cuotas.filter((c) => c.estado === 'Pagada').length,
    cuotas,
  };
}

// Registra el pago simulado de una cuota.
export async function pagarCuota(usuarioId, alumnoId, { periodo, metodo }) {
  if (!esPeriodoValido(periodo)) throw badRequest('El mes de la cuota no es válido.');
  if (!METODOS_PAGO.includes(metodo)) throw badRequest('El método de pago debe ser Efectivo o Transferencia.');

  return transaction(usuarioId, async (tx) => {
    const alumno = await tx.queryOne(
      `select a.id, ${hijosSql} as hijos from alumnos a where a.id = $1 and a.activo for update`,
      [alumnoId],
    );
    if (!alumno) throw notFound('Alumno no encontrado o inactivo.');

    const previo = await tx.queryOne('select id from pagos_cuotas where alumno_id = $1 and periodo = $2', [alumnoId, periodo]);
    const estado = estadoCuota(periodo, hoyArgentina(), Boolean(previo));
    if (estado === 'Pagada') throw badRequest('Esa cuota ya está pagada.');
    if (!sePuedePagar(estado)) throw badRequest(`La cuota de ${nombrePeriodo(periodo)} se habilita el 1 de ese mes.`);

    return tx.queryOne(
      `insert into pagos_cuotas (alumno_id, periodo, importe, metodo, registrado_por)
       values ($1, $2, $3, $4, $5) returning *`,
      [alumnoId, periodo, importeMensual(alumno.hijos), metodo, usuarioId],
    );
  });
}

// Panel de la administración: estado de cada mes por alumno y desde cuándo adeuda.
export async function panelCuotas({ nivel_id, solo_deudores } = {}) {
  const alumnos = await query(
    `select a.id, a.dni, a.apellido || ', ' || a.nombre as alumno, n.nombre as nivel,
            (select c.anio || ' ' || c.division from matriculas m join cursos c on c.id = m.curso_id
              where m.alumno_id = a.id and m.estado <> 'Baja' order by m.ciclo_id desc limit 1) as curso,
            ${hijosSql} as hijos
     from alumnos a left join niveles_educativos n on n.id = a.nivel_id
     where a.activo and ($1::int is null or a.nivel_id = $1)
     order by a.apellido, a.nombre`,
    [nivel_id ?? null],
  );
  const pagos = await query('select alumno_id, periodo, importe, metodo, fecha, comprobante from pagos_cuotas');
  const hoy = hoyArgentina();

  const filas = alumnos.map((alumno) => {
    const { cuotas, importe } = armarCuotas(alumno, pagos.filter((p) => p.alumno_id === alumno.id), hoy);
    return {
      alumno_id: alumno.id,
      alumno: alumno.alumno,
      dni: alumno.dni,
      nivel: alumno.nivel,
      curso: alumno.curso,
      importe_mensual: importe,
      ...resumenDeuda(cuotas),
      meses: cuotas.map((c) => ({ periodo: c.periodo, estado: c.estado })),
    };
  });

  const resultado = solo_deudores ? filas.filter((f) => f.cuotas_vencidas > 0) : filas;
  const mesActual = hoy.slice(0, 7);
  return {
    hoy,
    periodos: periodos().map((p) => ({ periodo: p, mes: nombrePeriodo(p) })),
    resumen: {
      alumnos: filas.length,
      al_dia: filas.filter((f) => f.cuotas_vencidas === 0).length,
      con_deuda: filas.filter((f) => f.cuotas_vencidas > 0).length,
      total_adeudado: filas.reduce((t, f) => t + f.total_adeudado, 0),
      cobrado_mes_actual: pagos.filter((p) => p.periodo === mesActual).reduce((t, p) => t + p.importe, 0),
      cobrado_total: pagos.reduce((t, p) => t + p.importe, 0),
    },
    filas: resultado,
  };
}
