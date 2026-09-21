export type Nivel = {
  id: number;
  nombre: string;
  descripcion: string;
  etiqueta: string;
};

export type Alumno = {
  id: number;
  nombre: string;
  apellido: string;
  dni: string;
  fecha_nacimiento: string;
  nivel: string;
  curso: string;
  division: string;
  tutor_nombre: string;
  tutor_email: string;
  tutor_telefono: string;
  estado: string;
  created_at: string;
};

export type Docente = {
  id: number;
  nombre: string;
  apellido: string;
  dni: string;
  email: string;
  telefono: string;
  especialidad: string;
  estado: string;
  created_at: string;
};

export type Curso = {
  id: number;
  nivel: string;
  anio: string;
  division: string;
  turno: string;
  descripcion: string;
};

export type AsignacionDocente = {
  id: number;
  docente_id: number;
  curso_id: number;
  materia: string;
  dia: string;
  horario: string;
};

export type Servicio = {
  id: number;
  nombre: string;
  descripcion: string;
  tipo: string;
  disponible: number;
  icono: string;
};

export type Instalacion = {
  id: number;
  nombre: string;
  descripcion: string;
  tipo: string;
  disponible: number;
  imagen_url: string;
};

export type Noticia = {
  id: number;
  titulo: string;
  descripcion: string;
  contenido: string;
  fecha_publicacion: string;
  tipo: string;
  visible: number;
  imagen_url: string;
};

export type Opinion = {
  id: number;
  autor_anonimo: string;
  comentario: string;
  fecha_publicacion: string;
  estado_moderacion: string;
  visible: number;
};

export type SolicitudInscripcion = {
  id?: number;
  nombre_tutor: string;
  nombre_aspirante: string;
  nivel_solicitado: string;
  email_contacto: string;
  telefono: string;
  mensaje: string;
  fecha_solicitud?: string;
  estado_tramite?: string;
};

export type PostulacionEmpleo = {
  id?: number;
  nombre_candidato: string;
  email: string;
  telefono: string;
  puesto_interes: string;
  enlace_cv: string;
  mensaje: string;
  fecha_recepcion?: string;
  estado?: string;
};

export type ActividadEscolar = {
  id: number;
  titulo: string;
  descripcion: string;
  nivel: string;
  fecha: string;
  visible: number;
};

export type GaleriaImagen = {
  id: number;
  titulo: string;
  descripcion: string;
  url_imagen: string;
  categoria: string;
  visible: number;
};

export type UsuarioAcceso = {
  id: number;
  nombre: string;
  nombre_usuario: string;
  email: string;
  rol: 'admin' | 'docente' | 'padre' | 'alumno' | 'personal';
  estado: string;
  created_at: string;
};

export type ContactoMensaje = {
  nombre: string;
  email: string;
  asunto: string;
  mensaje: string;
};
