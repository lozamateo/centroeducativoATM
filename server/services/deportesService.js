// Disciplinas deportivas, comisiones y horarios (RF-10).
import { query, queryOne, transaction } from '../db.js';
import { badRequest, notFound } from '../errors.js';
import { requireFields } from '../validation.js';
import { cicloActivo } from './academicoService.js';

export function listarDeportes() {
  return query(
    `select d.*, (select count(*)::int from comisiones c where c.deporte_id = d.id) as comisiones
     from deportes d order by d.nombre`,
  );
}

export async function crearDeporte(body) {
  requireFields(body, ['nombre']);
  return queryOne('insert into deportes (nombre, descripcion) values ($1, $2) returning *', [body.nombre, body.descripcion || null]);
}

export async function actualizarDeporte(id, body) {
  const row = await queryOne(
    `update deportes set nombre = coalesce($2, nombre), descripcion = coalesce($3, descripcion), activo = coalesce($4, activo)
     where id = $1 returning *`,
    [id, body.nombre || null, body.descripcion ?? null, body.activo ?? null],
  );
  if (!row) throw notFound('Deporte no encontrado.');
  return row;
}

export function listarComisiones({ deporte_id, nivel_id } = {}) {
  return query(
    `select co.*, d.nombre as deporte, n.nombre as nivel, p.apellido || ', ' || p.nombre as profesor,
            (select count(*)::int from inscripciones_deporte i where i.comision_id = co.id and i.activa) as inscriptos,
            coalesce((select json_agg(json_build_object('id', h.id, 'dia_semana', h.dia_semana, 'hora_inicio', h.hora_inicio, 'hora_fin', h.hora_fin)
                               order by h.dia_semana, h.hora_inicio)
                      from horarios h where h.comision_id = co.id), '[]') as horarios
     from comisiones co
     join deportes d on d.id = co.deporte_id
     join niveles_educativos n on n.id = co.nivel_id
     left join profesores p on p.id = co.profesor_id
     where ($1::int is null or co.deporte_id = $1) and ($2::int is null or co.nivel_id = $2)
     order by d.nombre, n.id`,
    [deporte_id ?? null, nivel_id ?? null],
  );
}

function validarHorarios(horarios) {
  if (!Array.isArray(horarios) || !horarios.length) throw badRequest('La comision debe tener al menos un horario.');
  for (const h of horarios) {
    if (!(h.dia_semana >= 1 && h.dia_semana <= 6)) throw badRequest('El dia debe ser de lunes (1) a sabado (6).');
    if (!h.hora_inicio || !h.hora_fin || h.hora_fin <= h.hora_inicio) {
      throw badRequest('Cada horario debe tener hora de inicio menor a la de fin.');
    }
  }
}

export async function crearComision(usuarioId, body) {
  requireFields(body, ['deporte_id', 'nivel_id', 'nombre']);
  validarHorarios(body.horarios);
  return transaction(usuarioId, async (tx) => {
    const ciclo = await cicloActivo(tx);
    const comision = await tx.queryOne(
      `insert into comisiones (deporte_id, nivel_id, ciclo_id, nombre, profesor_id, cupo)
       values ($1, $2, $3, $4, $5, coalesce($6, 20)) returning *`,
      [body.deporte_id, body.nivel_id, ciclo.id, body.nombre, body.profesor_id || null, body.cupo || null],
    );
    for (const h of body.horarios) {
      await tx.query('insert into horarios (comision_id, dia_semana, hora_inicio, hora_fin) values ($1, $2, $3, $4)', [
        comision.id,
        h.dia_semana,
        h.hora_inicio,
        h.hora_fin,
      ]);
    }
    return comision;
  });
}

export async function actualizarComision(usuarioId, id, body) {
  if (body.horarios) validarHorarios(body.horarios);
  return transaction(usuarioId, async (tx) => {
    const comision = await tx.queryOne(
      `update comisiones set nombre = coalesce($2, nombre), profesor_id = $3, cupo = coalesce($4, cupo)
       where id = $1 returning *`,
      [id, body.nombre || null, body.profesor_id || null, body.cupo || null],
    );
    if (!comision) throw notFound('Comision no encontrada.');
    if (body.horarios) {
      await tx.query('delete from horarios where comision_id = $1', [id]);
      for (const h of body.horarios) {
        await tx.query('insert into horarios (comision_id, dia_semana, hora_inicio, hora_fin) values ($1, $2, $3, $4)', [
          id,
          h.dia_semana,
          h.hora_inicio,
          h.hora_fin,
        ]);
      }
    }
    return comision;
  });
}

export async function eliminarComision(id) {
  const row = await queryOne('delete from comisiones where id = $1 returning id', [id]);
  if (!row) throw notFound('Comision no encontrada.');
}
