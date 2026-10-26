// InscripcionService: matricula, deportes, transporte y comedor (RF-09 a RF-13).
// Las reglas tambien estan en la base (triggers), aca se validan antes para
// dar mensajes claros y se ejecuta todo en una transaccion.
import { query, queryOne, transaction } from '../db.js';
import { badRequest, notFound } from '../errors.js';
import { toId } from '../validation.js';
import { cicloActivo } from './academicoService.js';

// ----- Matricula (RF-09) -----

export function listarMatriculas({ curso_id, ciclo_id } = {}) {
  return query(
    `select m.*, a.apellido || ', ' || a.nombre as alumno, a.dni,
            n.nombre || ' - ' || c.anio || ' ' || c.division as curso
     from matriculas m
     join alumnos a on a.id = m.alumno_id
     join cursos c on c.id = m.curso_id
     join niveles_educativos n on n.id = c.nivel_id
     where ($1::int is null or m.curso_id = $1) and ($2::int is null or m.ciclo_id = $2)
     order by m.created_at desc`,
    [curso_id ?? null, ciclo_id ?? null],
  );
}

export async function matricular(usuarioId, alumnoId, cursoId) {
  toId(cursoId, 'curso_id');
  return transaction(usuarioId, async (tx) => {
    const alumno = await tx.queryOne('select id, nivel_id from alumnos where id = $1 and activo', [alumnoId]);
    if (!alumno) throw notFound('Alumno no encontrado o inactivo.');

    const curso = await tx.queryOne('select id, nivel_id, ciclo_id from cursos where id = $1', [cursoId]);
    if (!curso) throw notFound('Curso no encontrado.');
    if (curso.nivel_id !== alumno.nivel_id) throw badRequest('El curso no corresponde al nivel del alumno.');

    const previa = await tx.queryOne(
      "select id from matriculas where alumno_id = $1 and ciclo_id = $2 and estado <> 'Baja'",
      [alumnoId, curso.ciclo_id],
    );
    if (previa) throw badRequest('El alumno ya tiene una matrícula en este ciclo lectivo.');

    return tx.queryOne(
      `insert into matriculas (alumno_id, curso_id, ciclo_id, registrado_por)
       values ($1, $2, $3, $4) returning *`,
      [alumnoId, cursoId, curso.ciclo_id, usuarioId],
    );
  });
}

export async function bajaMatricula(usuarioId, id) {
  const row = await transaction(usuarioId, (tx) =>
    tx.queryOne("update matriculas set estado = 'Baja' where id = $1 and estado <> 'Baja' returning *", [id]),
  );
  if (!row) throw notFound('Matrícula no encontrada o ya dada de baja.');
  return row;
}

// ----- Deportes (RF-10 / RF-11) -----

export function listarInscripcionesDeporte({ comision_id, alumno_id } = {}) {
  return query(
    `select i.*, a.apellido || ', ' || a.nombre as alumno, a.dni, d.nombre as deporte, co.nombre as comision
     from inscripciones_deporte i
     join alumnos a on a.id = i.alumno_id
     join comisiones co on co.id = i.comision_id
     join deportes d on d.id = co.deporte_id
     where i.activa and ($1::int is null or i.comision_id = $1) and ($2::int is null or i.alumno_id = $2)
     order by d.nombre, a.apellido`,
    [comision_id ?? null, alumno_id ?? null],
  );
}

export async function inscribirDeporte(usuarioId, alumnoId, comisionId) {
  toId(comisionId, 'comision_id');
  return transaction(usuarioId, (tx) =>
    // validar_inscripcion_deporte() controla: nivel, apto fisico, duplicado, max. 2 y solapes.
    tx.queryOne(
      'insert into inscripciones_deporte (alumno_id, comision_id, registrado_por) values ($1, $2, $3) returning *',
      [alumnoId, comisionId, usuarioId],
    ),
  );
}

export async function bajaDeporte(usuarioId, id, alumnoId) {
  const row = await transaction(usuarioId, (tx) =>
    tx.queryOne(
      `update inscripciones_deporte set activa = false
       where id = $1 and activa and ($2::bigint is null or alumno_id = $2) returning *`,
      [id, alumnoId ?? null],
    ),
  );
  if (!row) throw notFound('Inscripción no encontrada.');
  return row;
}

// Comisiones del nivel del alumno indicando si se puede inscribir y por que no.
export async function comisionesDisponibles(alumnoId) {
  const alumno = await queryOne(
    `select a.id, a.nivel_id, f.apto_fisico_vence
     from alumnos a left join fichas_medicas f on f.alumno_id = a.id where a.id = $1`,
    [alumnoId],
  );
  if (!alumno) throw notFound('Alumno no encontrado.');

  const comisiones = await query(
    `select co.id, co.nombre, co.cupo, d.id as deporte_id, d.nombre as deporte,
            p.apellido || ', ' || p.nombre as profesor,
            (select count(*)::int from inscripciones_deporte i where i.comision_id = co.id and i.activa) as inscriptos,
            coalesce((select json_agg(json_build_object('dia_semana', h.dia_semana, 'hora_inicio', h.hora_inicio, 'hora_fin', h.hora_fin)
                               order by h.dia_semana, h.hora_inicio)
                      from horarios h where h.comision_id = co.id), '[]') as horarios
     from comisiones co
     join deportes d on d.id = co.deporte_id
     join ciclos_lectivos cl on cl.id = co.ciclo_id and cl.activo
     left join profesores p on p.id = co.profesor_id
     where co.nivel_id = $1 and d.activo
     order by d.nombre`,
    [alumno.nivel_id],
  );

  const actuales = await query(
    `select i.id, co.id as comision_id, co.deporte_id, h.dia_semana, h.hora_inicio, h.hora_fin
     from inscripciones_deporte i
     join comisiones co on co.id = i.comision_id
     left join horarios h on h.comision_id = co.id
     where i.alumno_id = $1 and i.activa`,
    [alumnoId],
  );
  const cantidadActual = new Set(actuales.map((row) => row.id)).size;
  const aptoVigente = alumno.apto_fisico_vence && alumno.apto_fisico_vence >= new Date().toISOString().slice(0, 10);

  return comisiones.map((comision) => {
    let motivo = null;
    if (actuales.some((row) => row.comision_id === comision.id)) motivo = 'Ya inscripto';
    else if (!aptoVigente) motivo = 'Apto físico vencido o ausente';
    else if (actuales.some((row) => row.deporte_id === comision.deporte_id)) motivo = 'Ya inscripto en este deporte';
    else if (cantidadActual >= 2) motivo = 'Máximo de 2 deportes alcanzado';
    else if (comision.inscriptos >= comision.cupo) motivo = 'Sin cupo';
    else if (
      comision.horarios.some((h) =>
        actuales.some((a) => a.dia_semana === h.dia_semana && a.hora_inicio < h.hora_fin && h.hora_inicio < a.hora_fin),
      )
    )
      motivo = 'Se superpone con otro deporte';
    return { ...comision, disponible: motivo === null, motivo };
  });
}

// ----- Transporte (RF-12) -----

export function listarRecorridos() {
  return query(
    `select r.*, (select count(*)::int from inscripciones_transporte t where t.recorrido_id = r.id and t.activa) as inscriptos
     from recorridos_transporte r order by r.id`,
  );
}

export async function inscribirTransporte(usuarioId, alumnoId, { recorrido_id, parada }) {
  toId(recorrido_id, 'recorrido_id');
  return transaction(usuarioId, async (tx) => {
    const previa = await tx.queryOne('select id from inscripciones_transporte where alumno_id = $1 and activa', [alumnoId]);
    if (previa) throw badRequest('El alumno ya tiene un recorrido de transporte activo. Debe darlo de baja primero.');
    const ciclo = await cicloActivo(tx);
    return tx.queryOne(
      `insert into inscripciones_transporte (alumno_id, recorrido_id, ciclo_id, parada, registrado_por)
       values ($1, $2, $3, $4, $5) returning *`,
      [alumnoId, recorrido_id, ciclo.id, parada || null, usuarioId],
    );
  });
}

export async function bajaTransporte(usuarioId, id, alumnoId) {
  const row = await transaction(usuarioId, (tx) =>
    tx.queryOne(
      `update inscripciones_transporte set activa = false
       where id = $1 and activa and ($2::bigint is null or alumno_id = $2) returning *`,
      [id, alumnoId ?? null],
    ),
  );
  if (!row) throw notFound('Inscripción de transporte no encontrada.');
  return row;
}

// ----- Comedor (RF-13) -----

export async function inscribirComedor(usuarioId, alumnoId, { modalidad, dias, dieta_especial }) {
  if (dias && (!Array.isArray(dias) || !dias.every((dia) => [1, 2, 3, 4, 5].includes(Number(dia))))) {
    throw badRequest('Los días del comedor deben ser de lunes (1) a viernes (5).');
  }
  return transaction(usuarioId, async (tx) => {
    const ciclo = await cicloActivo(tx);
    const previa = await tx.queryOne(
      'select id from inscripciones_comedor where alumno_id = $1 and ciclo_id = $2 and activa',
      [alumnoId, ciclo.id],
    );
    if (previa) throw badRequest('El alumno ya está inscripto al comedor en este ciclo.');
    return tx.queryOne(
      `insert into inscripciones_comedor (alumno_id, ciclo_id, modalidad, dias, dieta_especial, registrado_por)
       values ($1, $2, coalesce($3, 'Almuerzo'), coalesce($4::smallint[], '{1,2,3,4,5}'), $5, $6) returning *`,
      [alumnoId, ciclo.id, modalidad || null, dias ?? null, dieta_especial || null, usuarioId],
    );
  });
}

export async function bajaComedor(usuarioId, id, alumnoId) {
  const row = await transaction(usuarioId, (tx) =>
    tx.queryOne(
      `update inscripciones_comedor set activa = false
       where id = $1 and activa and ($2::bigint is null or alumno_id = $2) returning *`,
      [id, alumnoId ?? null],
    ),
  );
  if (!row) throw notFound('Inscripción al comedor no encontrada.');
  return row;
}

export function listarComedor() {
  return query(
    `select ic.*, a.apellido || ', ' || a.nombre as alumno, a.dni
     from inscripciones_comedor ic join alumnos a on a.id = ic.alumno_id
     where ic.activa order by a.apellido`,
  );
}

export function listarTransporte() {
  return query(
    `select t.*, a.apellido || ', ' || a.nombre as alumno, a.dni, r.nombre as recorrido
     from inscripciones_transporte t
     join alumnos a on a.id = t.alumno_id
     join recorridos_transporte r on r.id = t.recorrido_id
     where t.activa order by r.id, a.apellido`,
  );
}
