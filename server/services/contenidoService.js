// Portal publico: noticias, mensajes de contacto y solicitudes de pre-inscripcion.
import { query, queryOne } from '../db.js';
import { badRequest, notFound } from '../errors.js';
import { checkEmail, requireFields } from '../validation.js';

export function listarNoticias({ todas = false } = {}) {
  return query(
    `select n.*, u.nombre || ' ' || u.apellido as autor
     from noticias n left join usuarios u on u.id = n.autor_id
     where $1 or n.publicada order by n.fecha desc`,
    [todas],
  );
}

export async function crearNoticia(usuarioId, body) {
  requireFields(body, ['titulo', 'resumen']);
  return queryOne(
    `insert into noticias (titulo, resumen, contenido, imagen_url, categoria, publicada, autor_id)
     values ($1, $2, $3, $4, coalesce($5, 'Institucional'), coalesce($6, true), $7) returning *`,
    [body.titulo, body.resumen, body.contenido || null, body.imagen_url || null, body.categoria || null, body.publicada ?? null, usuarioId],
  );
}

export async function actualizarNoticia(id, body) {
  const row = await queryOne(
    `update noticias set titulo = coalesce($2, titulo), resumen = coalesce($3, resumen), contenido = coalesce($4, contenido),
            imagen_url = coalesce($5, imagen_url), categoria = coalesce($6, categoria), publicada = coalesce($7, publicada)
     where id = $1 returning *`,
    [id, body.titulo || null, body.resumen || null, body.contenido ?? null, body.imagen_url ?? null, body.categoria || null, body.publicada ?? null],
  );
  if (!row) throw notFound('Noticia no encontrada.');
  return row;
}

export async function eliminarNoticia(id) {
  const row = await queryOne('delete from noticias where id = $1 returning id', [id]);
  if (!row) throw notFound('Noticia no encontrada.');
}

export async function enviarContacto(body) {
  requireFields(body, ['nombre', 'email', 'asunto', 'mensaje']);
  checkEmail(body.email);
  if (body.mensaje.length > 2000) throw badRequest('El mensaje no puede superar los 2000 caracteres.');
  await queryOne(
    'insert into mensajes_contacto (nombre, email, telefono, asunto, mensaje) values ($1, $2, $3, $4, $5) returning id',
    [body.nombre, body.email, body.telefono || null, body.asunto, body.mensaje],
  );
  return { mensaje: 'Gracias por escribirnos. Te responderemos a la brevedad.' };
}

export const listarMensajes = () => query('select * from mensajes_contacto order by created_at desc');

export async function marcarMensajeLeido(id) {
  const row = await queryOne('update mensajes_contacto set leido = true where id = $1 returning *', [id]);
  if (!row) throw notFound('Mensaje no encontrado.');
  return row;
}

export async function enviarSolicitud(body) {
  requireFields(body, ['tutor_nombre', 'tutor_email', 'tutor_telefono', 'alumno_nombre', 'nivel_id']);
  checkEmail(body.tutor_email, 'tutor_email');
  await queryOne(
    `insert into solicitudes_inscripcion
       (tutor_nombre, tutor_email, tutor_telefono, alumno_nombre, alumno_fecha_nac, nivel_id, anio_solicitado, servicios, comentarios)
     values ($1, $2, $3, $4, $5, $6, $7, coalesce($8::text[], '{}'), $9) returning id`,
    [
      body.tutor_nombre, body.tutor_email, body.tutor_telefono, body.alumno_nombre, body.alumno_fecha_nac || null,
      body.nivel_id, body.anio_solicitado || null, body.servicios ?? null, body.comentarios || null,
    ],
  );
  return { mensaje: 'Recibimos tu solicitud. Secretaría se comunicará para completar la matrícula.' };
}

export function listarSolicitudes() {
  return query(
    `select s.*, n.nombre as nivel from solicitudes_inscripcion s
     left join niveles_educativos n on n.id = s.nivel_id order by s.created_at desc`,
  );
}

export async function cambiarEstadoSolicitud(id, estado) {
  if (!['Pendiente', 'Contactada', 'Aceptada', 'Rechazada'].includes(estado)) throw badRequest('Estado inválido.');
  const row = await queryOne('update solicitudes_inscripcion set estado = $2 where id = $1 returning *', [id, estado]);
  if (!row) throw notFound('Solicitud no encontrada.');
  return row;
}
