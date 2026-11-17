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
  return query(
    `select v.*, a.legajo, a.apellido, a.nombre from v_padron_curso v join alumnos a on a.id = v.alumno_id
     where ($1::int is null or v.curso_id = $1) order by v.nivel, v.curso, a.apellido, a.nombre`,
    [cursoId ?? null],
  );
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

// ----- Reportes de la Parte 2 del TP integrador -----

const diaCorto = (col) => `case ${col} when 1 then 'Lun' when 2 then 'Mar' when 3 then 'Mié' when 4 then 'Jue' when 5 then 'Vie' else 'Sáb' end`;
const horariosDe = (tabla, fk, id) => `(select string_agg(${diaCorto('h.dia_semana')} || ' ' || to_char(h.hora_inicio, 'HH24:MI') || '-' || to_char(h.hora_fin, 'HH24:MI'), ' · ' order by h.dia_semana, h.hora_inicio)
  from ${tabla} h where h.${fk} = ${id})`;

// Por docente: cursos a cargo por nivel y horarios de cada curso.
export function porDocente(profesorId) {
  return query(
    `select p.id as profesor_id, p.legajo, p.apellido || ', ' || p.nombre as profesor, n.nombre as nivel,
            c.anio || ' ' || c.division as curso, ma.nombre as materia, ${horariosDe('horarios_materia', 'curso_materia_id', 'cm.id')} as horario
     from cursos_materias cm
     join profesores p on p.id = cm.profesor_id
     join cursos c on c.id = cm.curso_id
     join niveles_educativos n on n.id = c.nivel_id
     join materias ma on ma.id = cm.materia_id
     where ($1::bigint is null or p.id = $1)
     order by p.apellido, n.id, c.id, ma.nombre`,
    [profesorId ?? null],
  );
}

// Listado de alumnos por materia: nivel, curso, materia, profesor a cargo, alumno y legajo.
export function alumnosPorMateria({ materia_id, curso_id } = {}) {
  return query(
    `select n.nombre as nivel, c.anio || ' ' || c.division as curso, ma.nombre as materia,
            coalesce(p.apellido || ', ' || p.nombre, 'A designar') as profesor,
            a.apellido || ', ' || a.nombre as alumno, a.legajo
     from matriculas m
     join alumnos a on a.id = m.alumno_id
     join cursos c on c.id = m.curso_id
     join niveles_educativos n on n.id = c.nivel_id
     join cursos_materias cm on cm.curso_id = c.id
     join materias ma on ma.id = cm.materia_id
     left join profesores p on p.id = cm.profesor_id
     where m.estado <> 'Baja' and ($1::bigint is null or ma.id = $1) and ($2::bigint is null or c.id = $2)
     order by n.id, c.id, ma.nombre, a.apellido`,
    [materia_id ?? null, curso_id ?? null],
  );
}

// Listado de docentes por nivel educativo: nivel, profesor, materias a cargo y cursos.
export function docentesPorNivel(nivelId) {
  return query(
    `select n.nombre as nivel, p.legajo, p.apellido || ', ' || p.nombre as profesor,
            string_agg(distinct ma.nombre, ', ') as materias,
            string_agg(distinct c.anio || ' ' || c.division, ', ') as cursos
     from cursos_materias cm
     join profesores p on p.id = cm.profesor_id
     join cursos c on c.id = cm.curso_id
     join niveles_educativos n on n.id = c.nivel_id
     join materias ma on ma.id = cm.materia_id
     where ($1::int is null or n.id = $1)
     group by n.id, n.nombre, p.id
     order by n.id, p.apellido`,
    [nivelId ?? null],
  );
}

// Listado de alumnos por deporte (con nivel, horario y profesor a cargo; se filtra por deporte, nivel o profesor).
export function alumnosPorDeporte({ deporte_id, nivel_id, profesor_id } = {}) {
  return query(
    `select d.nombre as deporte, co.nombre as comision, n.nombre as nivel,
            ${horariosDe('horarios', 'comision_id', 'co.id')} as horario,
            coalesce(p.apellido || ', ' || p.nombre, 'A designar') as profesor,
            a.apellido || ', ' || a.nombre as alumno, a.legajo,
            (select c.anio || ' ' || c.division from matriculas m join cursos c on c.id = m.curso_id
              where m.alumno_id = a.id and m.estado <> 'Baja' order by m.ciclo_id desc limit 1) as curso
     from inscripciones_deporte i
     join comisiones co on co.id = i.comision_id
     join deportes d on d.id = co.deporte_id
     join niveles_educativos n on n.id = co.nivel_id
     join alumnos a on a.id = i.alumno_id
     left join profesores p on p.id = co.profesor_id
     where i.activa and ($1::bigint is null or d.id = $1) and ($2::int is null or n.id = $2) and ($3::bigint is null or co.profesor_id = $3)
     order by d.nombre, n.id, co.nombre, a.apellido`,
    [deporte_id ?? null, nivel_id ?? null, profesor_id ?? null],
  );
}

// Por alumno: curso, materias con su profesor, deportes con horarios, transporte y comedor.
export async function porAlumno(alumnoId) {
  const base = await queryOne(
    `select a.id as alumno_id, a.legajo, a.apellido || ', ' || a.nombre as alumno, a.dni, n.nombre as nivel,
            (select c.anio || ' ' || c.division from matriculas m join cursos c on c.id = m.curso_id
              where m.alumno_id = a.id and m.estado <> 'Baja' order by m.ciclo_id desc limit 1) as curso,
            (select r.nombre || coalesce(' (parada: ' || t.parada || ')', '') from inscripciones_transporte t
               join recorridos_transporte r on r.id = t.recorrido_id where t.alumno_id = a.id and t.activa) as transporte,
            (select ic.modalidad from inscripciones_comedor ic where ic.alumno_id = a.id and ic.activa limit 1) as comedor
     from alumnos a left join niveles_educativos n on n.id = a.nivel_id where a.id = $1`,
    [alumnoId],
  );
  if (!base) throw notFound('Alumno no encontrado.');
  const [materias, deportes] = await Promise.all([
    query(
      `select ma.nombre as materia, coalesce(p.apellido || ', ' || p.nombre, 'A designar') as profesor,
              ${horariosDe('horarios_materia', 'curso_materia_id', 'cm.id')} as horario
       from matriculas m join cursos_materias cm on cm.curso_id = m.curso_id
       join materias ma on ma.id = cm.materia_id left join profesores p on p.id = cm.profesor_id
       where m.alumno_id = $1 and m.estado <> 'Baja' order by ma.nombre`,
      [alumnoId],
    ),
    query(
      `select d.nombre as deporte, co.nombre as comision, ${horariosDe('horarios', 'comision_id', 'co.id')} as horario,
              coalesce(p.apellido || ', ' || p.nombre, 'A designar') as profesor
       from inscripciones_deporte i join comisiones co on co.id = i.comision_id join deportes d on d.id = co.deporte_id
       left join profesores p on p.id = co.profesor_id where i.alumno_id = $1 and i.activa order by d.nombre`,
      [alumnoId],
    ),
  ]);
  return { ...base, materias, deportes };
}
