// ReporteEngineService: reportes gerenciales MIS (RF-16 a RF-21).
import { query, queryOne } from '../db.js';
import { notFound } from '../errors.js';

// RF-16: tablero con indicadores generales.
export async function resumen() {
  const totales = await queryOne(
    `select
       (select count(*)::int from alumnos where activo) as alumnos,
       (select count(*)::int from profesores where activo) as profesores,
       (select count(*)::int from tutores) as tutores,
       (select count(*)::int from matriculas m join ciclos_lectivos c on c.id = m.ciclo_id and c.activo where m.estado <> 'Baja') as matriculados,
       (select count(*)::int from inscripciones_deporte where activa) as inscripciones_deporte,
       (select count(*)::int from inscripciones_transporte where activa) as usuarios_transporte,
       (select count(*)::int from inscripciones_comedor where activa) as usuarios_comedor,
       (select count(*)::int from fichas_medicas where apto_fisico_vence is null or apto_fisico_vence < current_date) as aptos_vencidos,
       (select count(*)::int from solicitudes_inscripcion where estado = 'Pendiente') as solicitudes_pendientes,
       (select count(*)::int from mensajes_contacto where not leido) as mensajes_sin_leer`,
  );
  const porNivel = await query(
    `select n.nombre as nivel,
            (select count(*)::int from matriculas m join cursos c on c.id = m.curso_id
              where c.nivel_id = n.id and m.estado <> 'Baja') as matriculados,
            (select coalesce(sum(cupo), 0)::int from cursos where nivel_id = n.id) as cupo
     from niveles_educativos n order by n.id`,
  );
  return { ...totales, por_nivel: porNivel };
}

// RF-17: padron por curso.
export function padronCurso(cursoId) {
  return query('select * from v_padron_curso where ($1::int is null or curso_id = $1) order by nivel, curso, alumno', [
    cursoId ?? null,
  ]);
}

// RF-18: padron logistico de transporte (HU-05).
export function padronTransporte(recorridoId) {
  return query(
    'select * from v_padron_transporte where ($1::int is null or recorrido_id = $1) order by recorrido_id, alumno',
    [recorridoId ?? null],
  );
}

// RF-19: ocupacion de deportes por comision.
export function ocupacionDeportes() {
  return query(
    `select d.nombre as deporte, co.nombre as comision, n.nombre as nivel, co.cupo,
            count(i.id)::int as inscriptos,
            round(count(i.id) * 100.0 / co.cupo)::int as ocupacion
     from comisiones co
     join deportes d on d.id = co.deporte_id
     join niveles_educativos n on n.id = co.nivel_id
     left join inscripciones_deporte i on i.comision_id = co.id and i.activa
     group by d.nombre, co.id, n.nombre
     order by d.nombre, n.nombre`,
  );
}

// RF-20: comedor por dia de la semana.
export async function comedor() {
  const porDia = await query(
    `select dia, count(*)::int as raciones
     from inscripciones_comedor ic, unnest(ic.dias) as dia
     where ic.activa and ic.modalidad <> 'Vianda propia'
     group by dia order by dia`,
  );
  const detalle = await query(
    `select a.apellido || ', ' || a.nombre as alumno, a.dni, ic.modalidad, ic.dias, ic.dieta_especial, f.alergias
     from inscripciones_comedor ic
     join alumnos a on a.id = ic.alumno_id
     left join fichas_medicas f on f.alumno_id = a.id
     where ic.activa order by a.apellido`,
  );
  return { por_dia: porDia, detalle };
}

// RF-21: ficha integral del alumno (reporte 360).
export async function alumno360(alumnoId) {
  const alumno = await queryOne('select * from v_alumno_360 where alumno_id = $1', [alumnoId]);
  if (!alumno) throw notFound('Alumno no encontrado.');
  return alumno;
}

export function listado360() {
  return query('select * from v_alumno_360 order by alumno');
}

export function auditoria(limite = 100) {
  return query(
    `select au.id, au.tabla, au.operacion, au.registro_id, au.fecha,
            coalesce(u.nombre || ' ' || u.apellido, 'Sistema') as usuario
     from auditoria au left join usuarios u on u.id = au.usuario_id
     order by au.fecha desc, au.id desc limit $1`,
    [Math.min(Number(limite) || 100, 500)],
  );
}
