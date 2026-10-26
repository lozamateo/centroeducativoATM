// AcademicoService: niveles, ciclos, cursos, materias y cuerpo docente (RF-02 a RF-06).
import { query, queryOne, transaction } from '../db.js';
import { badRequest, notFound } from '../errors.js';
import { checkDni, checkEmail, pick, requireFields } from '../validation.js';

export const listarNiveles = () => query('select * from niveles_educativos order by id');

export const listarCiclos = () => query('select * from ciclos_lectivos order by anio desc');

export async function cicloActivo(tx = { queryOne }) {
  const ciclo = await tx.queryOne('select * from ciclos_lectivos where activo');
  if (!ciclo) throw badRequest('No hay un ciclo lectivo activo configurado.');
  return ciclo;
}

export function listarCursos({ nivel_id, ciclo_id } = {}) {
  return query(
    `select c.*, n.nombre as nivel, cl.anio as ciclo,
            (select count(*)::int from matriculas m where m.curso_id = c.id and m.estado <> 'Baja') as inscriptos
     from cursos c
     join niveles_educativos n on n.id = c.nivel_id
     join ciclos_lectivos cl on cl.id = c.ciclo_id
     where ($1::int is null or c.nivel_id = $1) and ($2::int is null or c.ciclo_id = $2)
     order by c.nivel_id, c.id`,
    [nivel_id ?? null, ciclo_id ?? null],
  );
}

export async function crearCurso(usuarioId, body) {
  requireFields(body, ['nivel_id', 'anio', 'division']);
  return transaction(usuarioId, async (tx) => {
    const ciclo = body.ciclo_id ? { id: body.ciclo_id } : await cicloActivo(tx);
    const curso = await tx.queryOne(
      `insert into cursos (nivel_id, ciclo_id, anio, division, turno, cupo)
       values ($1, $2, $3, $4, coalesce($5, 'Jornada extendida'), coalesce($6, 30)) returning *`,
      [body.nivel_id, ciclo.id, body.anio, body.division, body.turno ?? null, body.cupo ?? null],
    );
    // Asocia automaticamente las materias del nivel al curso nuevo.
    await tx.query(
      'insert into cursos_materias (curso_id, materia_id) select $1, id from materias where nivel_id = $2',
      [curso.id, curso.nivel_id],
    );
    return curso;
  });
}

export async function actualizarCurso(id, body) {
  const data = pick(body, ['anio', 'division', 'turno', 'cupo']);
  const curso = await queryOne(
    `update cursos set anio = coalesce($2, anio), division = coalesce($3, division),
            turno = coalesce($4, turno), cupo = coalesce($5, cupo)
     where id = $1 returning *`,
    [id, data.anio ?? null, data.division ?? null, data.turno ?? null, data.cupo ?? null],
  );
  if (!curso) throw notFound('Curso no encontrado.');
  return curso;
}

export async function eliminarCurso(id) {
  const curso = await queryOne('delete from cursos where id = $1 returning id', [id]);
  if (!curso) throw notFound('Curso no encontrado.');
}

export function materiasDeCurso(cursoId) {
  return query(
    `select cm.id, m.id as materia_id, m.nombre, m.es_idioma, m.carga_horaria_semanal,
            p.id as profesor_id, p.apellido || ', ' || p.nombre as profesor
     from cursos_materias cm
     join materias m on m.id = cm.materia_id
     left join profesores p on p.id = cm.profesor_id
     where cm.curso_id = $1 order by m.nombre`,
    [cursoId],
  );
}

export async function asignarProfesor(cursoMateriaId, profesorId) {
  const row = await queryOne('update cursos_materias set profesor_id = $2 where id = $1 returning *', [
    cursoMateriaId,
    profesorId ?? null,
  ]);
  if (!row) throw notFound('Materia del curso no encontrada.');
  return row;
}

export function listarMaterias() {
  return query(
    `select m.*, n.nombre as nivel from materias m join niveles_educativos n on n.id = m.nivel_id
     order by m.nivel_id, m.nombre`,
  );
}

export async function crearMateria(body) {
  requireFields(body, ['nombre', 'nivel_id']);
  return transaction(null, async (tx) => {
    const materia = await tx.queryOne(
      `insert into materias (nombre, nivel_id, es_idioma, carga_horaria_semanal)
       values ($1, $2, coalesce($3, false), $4) returning *`,
      [body.nombre, body.nivel_id, body.es_idioma ?? null, body.carga_horaria_semanal ?? null],
    );
    await tx.query(
      'insert into cursos_materias (curso_id, materia_id) select id, $1 from cursos where nivel_id = $2',
      [materia.id, materia.nivel_id],
    );
    return materia;
  });
}

export async function eliminarMateria(id) {
  const row = await queryOne('delete from materias where id = $1 returning id', [id]);
  if (!row) throw notFound('Materia no encontrada.');
}

// ----- Profesores -----

const camposProfesor = ['dni', 'nombre', 'apellido', 'email', 'telefono', 'especialidad', 'fecha_ingreso', 'activo'];

export function listarProfesores() {
  return query(
    `select p.*,
            (select count(*)::int from cursos_materias cm where cm.profesor_id = p.id) as materias_asignadas,
            (select count(*)::int from comisiones c where c.profesor_id = p.id) as comisiones_a_cargo
     from profesores p order by p.apellido, p.nombre`,
  );
}

export async function crearProfesor(usuarioId, body) {
  requireFields(body, ['dni', 'nombre', 'apellido']);
  checkDni(body.dni);
  checkEmail(body.email);
  const data = pick(body, camposProfesor);
  const cols = Object.keys(data);
  return transaction(usuarioId, (tx) =>
    tx.queryOne(
      `insert into profesores (${cols.join(', ')}) values (${cols.map((_, i) => `$${i + 1}`).join(', ')}) returning *`,
      Object.values(data),
    ),
  );
}

export async function actualizarProfesor(usuarioId, id, body) {
  checkDni(body.dni);
  checkEmail(body.email);
  return actualizarGenerico(usuarioId, 'profesores', id, pick(body, camposProfesor), 'Profesor no encontrado.');
}

export async function eliminarProfesor(id) {
  const row = await queryOne('delete from profesores where id = $1 returning id', [id]);
  if (!row) throw notFound('Profesor no encontrado.');
}

// Utilidad compartida para UPDATE parciales con columnas permitidas.
export async function actualizarGenerico(usuarioId, tabla, id, data, mensajeNoEncontrado) {
  const cols = Object.keys(data);
  if (!cols.length) throw badRequest('No hay datos para actualizar.');
  const row = await transaction(usuarioId, (tx) =>
    tx.queryOne(
      `update ${tabla} set ${cols.map((col, i) => `${col} = $${i + 2}`).join(', ')} where id = $1 returning *`,
      [id, ...Object.values(data)],
    ),
  );
  if (!row) throw notFound(mensajeNoEncontrado);
  return row;
}
