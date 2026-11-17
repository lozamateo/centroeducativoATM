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

// ----- Opiniones (se pueden dejar sin iniciar sesión) -----

const RELACIONES = ['Familia', 'Alumno', 'Ex alumno', 'Docente', 'Visitante'];

export function listarOpiniones({ todas = false } = {}) {
  return query(
    `select id, nombre, relacion, comentario, puntaje, visible, created_at from opiniones
     where $1 or visible order by created_at desc limit 50`,
    [todas],
  );
}

export async function crearOpinion(body) {
  requireFields(body, ['nombre', 'comentario', 'puntaje']);
  const puntaje = Number(body.puntaje);
  if (!Number.isInteger(puntaje) || puntaje < 1 || puntaje > 5) throw badRequest('El puntaje debe ser de 1 a 5 estrellas.');
  if (body.nombre.length > 80) throw badRequest('El nombre no puede superar los 80 caracteres.');
  if (body.comentario.length < 5 || body.comentario.length > 600) throw badRequest('La opinión debe tener entre 5 y 600 caracteres.');
  const relacion = RELACIONES.includes(body.relacion) ? body.relacion : 'Visitante';
  return queryOne(
    'insert into opiniones (nombre, relacion, comentario, puntaje) values ($1, $2, $3, $4) returning id, nombre, relacion, comentario, puntaje, created_at',
    [body.nombre, relacion, body.comentario, puntaje],
  );
}

// El administrador puede ocultar opiniones inapropiadas.
export async function cambiarVisibilidadOpinion(id, visible) {
  const row = await queryOne('update opiniones set visible = $2 where id = $1 returning *', [id, Boolean(visible)]);
  if (!row) throw notFound('Opinión no encontrada.');
  return row;
}

// ----- Empleo -----

export function listarBusquedas({ todas = false } = {}) {
  return query('select * from busquedas_laborales where $1 or activa order by area, puesto', [todas]);
}

export async function postular(body) {
  requireFields(body, ['nombre', 'email', 'puesto']);
  checkEmail(body.email);
  if (body.cv_url && !/^https?:\/\/\S+$/.test(body.cv_url)) throw badRequest('El enlace al CV debe empezar con http:// o https://.');
  if ((body.mensaje ?? '').length > 2000) throw badRequest('El mensaje no puede superar los 2000 caracteres.');
  await queryOne(
    `insert into postulaciones (busqueda_id, nombre, email, telefono, puesto, mensaje, cv_url)
     values ((select id from busquedas_laborales where id = $1::bigint and activa), $2, $3, $4, $5, $6, $7) returning id`,
    [Number(body.busqueda_id) || null, body.nombre, body.email, body.telefono || null, body.puesto, body.mensaje || null, body.cv_url || null],
  );
  return { mensaje: 'Recibimos tu postulación. Si tu perfil coincide con la búsqueda, te contactaremos.' };
}

export const listarPostulaciones = () => query('select * from postulaciones order by created_at desc');

export async function cambiarEstadoPostulacion(id, estado) {
  if (!['Nueva', 'Revisada', 'Entrevista', 'Descartada'].includes(estado)) throw badRequest('Estado inválido.');
  const row = await queryOne('update postulaciones set estado = $2 where id = $1 returning *', [id, estado]);
  if (!row) throw notFound('Postulación no encontrada.');
  return row;
}
