export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const badRequest = (message) => new HttpError(400, message);
export const notFound = (message = 'Registro no encontrado.') => new HttpError(404, message);
export const forbidden = (message = 'No tiene permisos para esta operacion.') => new HttpError(403, message);

// Mensajes claros para las restricciones definidas en supabase/schema.sql.
const uniqueMessages = {
  matriculas_una_por_ciclo: 'El alumno ya tiene una matricula en este ciclo lectivo.',
  transporte_un_recorrido_activo: 'El alumno ya tiene un recorrido de transporte activo.',
  comedor_una_inscripcion_activa: 'El alumno ya esta inscripto al comedor en este ciclo.',
  deporte_sin_duplicados: 'El alumno ya esta inscripto en esta comision.',
  usuarios_email_key: 'Ya existe un usuario con ese email.',
  alumnos_dni_key: 'Ya existe un alumno con ese DNI.',
  tutores_dni_key: 'Ya existe un tutor con ese DNI.',
  profesores_dni_key: 'Ya existe un profesor con ese DNI.',
  alumnos_tutores_pkey: 'El tutor ya esta vinculado a este alumno.',
};

export function toHttpError(error) {
  if (error instanceof HttpError) return error;

  switch (error.code) {
    case 'P0001':
      return new HttpError(400, error.message);
    case '23505':
      return new HttpError(409, uniqueMessages[error.constraint] ?? 'El registro ya existe.');
    case '23503':
      return new HttpError(400, 'El registro hace referencia a datos inexistentes o esta en uso.');
    case '23514':
    case '22P02':
    case '22007':
    case '22008':
      return new HttpError(400, 'Hay datos con formato invalido.');
    default:
      console.error(error);
      return new HttpError(500, 'Error interno del servidor.');
  }
}
