// SaludService: ficha medica, apto fisico y credencial QR (RF-22).
import { query, queryOne, transaction } from '../db.js';
import { notFound } from '../errors.js';
import { checkDate, pick } from '../validation.js';

const camposFicha = [
  'grupo_sanguineo', 'alergias', 'enfermedades_cronicas', 'medicacion', 'obra_social', 'nro_afiliado',
  'contacto_emergencia', 'telefono_emergencia', 'apto_fisico_emision', 'apto_fisico_vence', 'apto_fisico_archivo',
  'observaciones',
];

const estadoApto = `
  case when f.apto_fisico_vence is null then 'Sin apto'
       when f.apto_fisico_vence < current_date then 'Vencido'
       else 'Vigente' end`;

export function listarFichas({ buscar, estado } = {}) {
  return query(
    `select a.id as alumno_id, a.dni, a.apellido || ', ' || a.nombre as alumno, n.nombre as nivel,
            f.grupo_sanguineo, f.alergias, f.apto_fisico_vence, ${estadoApto} as estado_apto
     from alumnos a
     left join fichas_medicas f on f.alumno_id = a.id
     left join niveles_educativos n on n.id = a.nivel_id
     where a.activo
       and ($1::text is null or a.dni like $1 || '%' or (a.apellido || ' ' || a.nombre) ilike '%' || $1 || '%')
       and ($2::text is null or ${estadoApto} = $2)
     order by a.apellido, a.nombre`,
    [buscar || null, estado || null],
  );
}

export async function obtenerFicha(alumnoId) {
  const ficha = await queryOne(
    `select f.*, a.id as alumno_id, a.dni, a.nombre, a.apellido, a.fecha_nacimiento, n.nombre as nivel,
            ${estadoApto} as estado_apto
     from alumnos a
     left join fichas_medicas f on f.alumno_id = a.id
     left join niveles_educativos n on n.id = a.nivel_id
     where a.id = $1`,
    [alumnoId],
  );
  if (!ficha) throw notFound('Alumno no encontrado.');
  return ficha;
}

export async function guardarFicha(usuarioId, alumnoId, body) {
  checkDate(body.apto_fisico_emision, 'apto_fisico_emision');
  checkDate(body.apto_fisico_vence, 'apto_fisico_vence');
  const data = { ...pick(body, camposFicha), actualizado_por: usuarioId };
  const cols = Object.keys(data);

  await transaction(usuarioId, (tx) =>
    tx.query(
      `insert into fichas_medicas (alumno_id, ${cols.join(', ')})
       values ($1, ${cols.map((_, i) => `$${i + 2}`).join(', ')})
       on conflict (alumno_id) do update set ${cols.map((col) => `${col} = excluded.${col}`).join(', ')}`,
      [alumnoId, ...Object.values(data)],
    ),
  );
  return obtenerFicha(alumnoId);
}

// Verificacion publica de la credencial QR: solo datos minimos, sin informacion medica.
export async function verificarCredencial(token) {
  const row = await queryOne(
    `select a.nombre || ' ' || a.apellido as alumno, n.nombre as nivel, f.apto_fisico_vence, ${estadoApto} as estado_apto,
            coalesce((select string_agg(d.nombre, ', ')
                        from inscripciones_deporte i
                        join comisiones co on co.id = i.comision_id
                        join deportes d on d.id = co.deporte_id
                       where i.alumno_id = a.id and i.activa), '') as deportes
     from fichas_medicas f
     join alumnos a on a.id = f.alumno_id
     left join niveles_educativos n on n.id = a.nivel_id
     where f.qr_token::text = $1`,
    [token],
  );
  if (!row) throw notFound('Credencial invalida.');
  return { ...row, habilitado: row.estado_apto === 'Vigente' };
}
