// Portales de autogestion para familias, docentes y alumnos (RF-14 / RF-15).
import { query, queryOne } from '../db.js';
import { forbidden, notFound } from '../errors.js';
import { listarCursos } from './academicoService.js';
import { comisionesDisponibles, listarRecorridos } from './inscripcionService.js';

// Garantiza que el tutor solo opere sobre sus propios hijos (aislamiento por rol).
export async function verificarHijo(usuarioId, alumnoId) {
  const row = await queryOne(
    `select 1 from alumnos_tutores at join tutores t on t.id = at.tutor_id
     where t.usuario_id = $1 and at.alumno_id = $2`,
    [usuarioId, alumnoId],
  );
  if (!row) throw forbidden('El alumno no está vinculado a su cuenta.');
}

export function hijos(usuarioId) {
  return query(
    `select v.*, at.parentesco
     from tutores t
     join alumnos_tutores at on at.tutor_id = t.id
     join v_alumno_360 v on v.alumno_id = at.alumno_id
     where t.usuario_id = $1 order by v.alumno`,
    [usuarioId],
  );
}

// Detalle completo de un alumno para su familia o para el propio alumno.
export async function detalleAlumno(alumnoId) {
  const resumen = await queryOne('select * from v_alumno_360 where alumno_id = $1', [alumnoId]);
  if (!resumen) throw notFound('Alumno no encontrado.');

  const [matricula, materias, deportes, transporte, comedor, ficha] = await Promise.all([
    queryOne(
      `select m.id, m.estado, m.comprobante, m.created_at, c.id as curso_id, n.nombre || ' - ' || c.anio || ' ' || c.division as curso, c.turno
       from matriculas m join cursos c on c.id = m.curso_id join niveles_educativos n on n.id = c.nivel_id
       where m.alumno_id = $1 and m.estado <> 'Baja' order by m.ciclo_id desc limit 1`,
      [alumnoId],
    ),
    query(
      `select ma.nombre, ma.es_idioma, p.apellido || ', ' || p.nombre as profesor
       from matriculas m
       join cursos_materias cm on cm.curso_id = m.curso_id
       join materias ma on ma.id = cm.materia_id
       left join profesores p on p.id = cm.profesor_id
       where m.alumno_id = $1 and m.estado <> 'Baja' order by ma.nombre`,
      [alumnoId],
    ),
    query(
      `select i.id, d.nombre as deporte, co.nombre as comision,
              coalesce((select json_agg(json_build_object('dia_semana', h.dia_semana, 'hora_inicio', h.hora_inicio, 'hora_fin', h.hora_fin)
                                 order by h.dia_semana) from horarios h where h.comision_id = co.id), '[]') as horarios
       from inscripciones_deporte i join comisiones co on co.id = i.comision_id join deportes d on d.id = co.deporte_id
       where i.alumno_id = $1 and i.activa order by d.nombre`,
      [alumnoId],
    ),
    queryOne(
      `select t.id, t.parada, t.comprobante, r.id as recorrido_id, r.nombre as recorrido, r.horario_ida, r.horario_vuelta
       from inscripciones_transporte t join recorridos_transporte r on r.id = t.recorrido_id
       where t.alumno_id = $1 and t.activa`,
      [alumnoId],
    ),
    queryOne(
      'select id, modalidad, dias, dieta_especial from inscripciones_comedor where alumno_id = $1 and activa order by ciclo_id desc limit 1',
      [alumnoId],
    ),
    queryOne(
      `select grupo_sanguineo, alergias, medicacion, obra_social, contacto_emergencia, telefono_emergencia,
              apto_fisico_vence, qr_token from fichas_medicas where alumno_id = $1`,
      [alumnoId],
    ),
  ]);

  return { ...resumen, matricula, materias, deportes, transporte, comedor, ficha };
}

// Opciones para que la familia complete inscripciones.
export async function opcionesInscripcion(alumnoId) {
  const alumno = await queryOne('select nivel_id from alumnos where id = $1', [alumnoId]);
  if (!alumno) throw notFound('Alumno no encontrado.');
  const ciclo = await queryOne('select id from ciclos_lectivos where activo');
  const [cursos, comisiones, recorridos] = await Promise.all([
    listarCursos({ nivel_id: alumno.nivel_id, ciclo_id: ciclo?.id }),
    comisionesDisponibles(alumnoId),
    listarRecorridos(),
  ]);
  return { cursos, comisiones, recorridos };
}

export async function docente(usuarioId) {
  const profesor = await queryOne('select * from profesores where usuario_id = $1', [usuarioId]);
  if (!profesor) throw notFound('El usuario no está vinculado a un legajo docente.');

  const [materias, comisiones] = await Promise.all([
    query(
      `select cm.id, ma.nombre as materia, n.nombre || ' - ' || c.anio || ' ' || c.division as curso, c.id as curso_id,
              coalesce((select json_agg(json_build_object('alumno', a.apellido || ', ' || a.nombre, 'dni', a.dni) order by a.apellido)
                          from matriculas m join alumnos a on a.id = m.alumno_id
                         where m.curso_id = c.id and m.estado <> 'Baja'), '[]') as alumnos
       from cursos_materias cm
       join materias ma on ma.id = cm.materia_id
       join cursos c on c.id = cm.curso_id
       join niveles_educativos n on n.id = c.nivel_id
       where cm.profesor_id = $1 order by c.id, ma.nombre`,
      [profesor.id],
    ),
    query(
      `select co.id, d.nombre as deporte, co.nombre as comision, co.cupo,
              coalesce((select json_agg(json_build_object('dia_semana', h.dia_semana, 'hora_inicio', h.hora_inicio, 'hora_fin', h.hora_fin)
                                 order by h.dia_semana) from horarios h where h.comision_id = co.id), '[]') as horarios,
              coalesce((select json_agg(json_build_object(
                                 'alumno', a.apellido || ', ' || a.nombre, 'dni', a.dni,
                                 'apto', case when f.apto_fisico_vence >= current_date then 'Vigente' else 'Vencido' end,
                                 'alergias', f.alergias) order by a.apellido)
                          from inscripciones_deporte i
                          join alumnos a on a.id = i.alumno_id
                          left join fichas_medicas f on f.alumno_id = a.id
                         where i.comision_id = co.id and i.activa), '[]') as alumnos
       from comisiones co join deportes d on d.id = co.deporte_id
       where co.profesor_id = $1 order by d.nombre`,
      [profesor.id],
    ),
  ]);

  return { profesor, materias, comisiones };
}

export async function alumnoPropio(usuarioId) {
  const alumno = await queryOne('select id from alumnos where usuario_id = $1', [usuarioId]);
  if (!alumno) throw notFound('El usuario no está vinculado a un legajo de alumno.');
  return detalleAlumno(alumno.id);
}
