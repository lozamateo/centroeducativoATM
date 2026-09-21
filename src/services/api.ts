import type {
  ActividadEscolar,
  Alumno,
  AsignacionDocente,
  ContactoMensaje,
  Curso,
  Docente,
  GaleriaImagen,
  Instalacion,
  Noticia,
  Opinion,
  PostulacionEmpleo,
  Servicio,
  SolicitudInscripcion,
  UsuarioAcceso,
  Nivel,
} from '../types';

const API_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? '/api' : 'http://localhost:3001/api');

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const message = await response.json().catch(() => ({ error: 'No se pudo completar la solicitud.' }));
    throw new Error(message.error ?? 'No se pudo completar la solicitud.');
  }

  return response.json() as Promise<T>;
}

const post = <T, D>(path: string, data: D) =>
  request<T>(path, { method: 'POST', body: JSON.stringify(data) });

const put = <T, D>(path: string, data: D) =>
  request<T>(path, { method: 'PUT', body: JSON.stringify(data) });

export const api = {
  getNiveles: () => request<Nivel[]>('/niveles'),
  getServicios: () => request<Servicio[]>('/servicios'),
  crearServicio: (data: Partial<Servicio>) => post<Servicio, Partial<Servicio>>('/servicios', data),
  getInstalaciones: () => request<Instalacion[]>('/instalaciones'),
  crearInstalacion: (data: Partial<Instalacion>) => post<Instalacion, Partial<Instalacion>>('/instalaciones', data),
  getNoticias: (all = false) => request<Noticia[]>(`/noticias${all ? '?all=1' : ''}`),
  crearNoticia: (data: Partial<Noticia>) => post<Noticia, Partial<Noticia>>('/noticias', data),
  getOpiniones: (all = false) => request<Opinion[]>(`/opiniones${all ? '?all=1' : ''}`),
  crearOpinion: (data: Pick<Opinion, 'autor_anonimo' | 'comentario'>) =>
    post<Opinion, Pick<Opinion, 'autor_anonimo' | 'comentario'>>('/opiniones', data),
  moderarOpinion: (id: number, estado_moderacion: string) =>
    put<Opinion, { estado_moderacion: string }>(`/opiniones/${id}/moderar`, { estado_moderacion }),
  crearSolicitud: (data: SolicitudInscripcion) =>
    post<SolicitudInscripcion, SolicitudInscripcion>('/solicitudes-inscripcion', data),
  getSolicitudes: () => request<SolicitudInscripcion[]>('/solicitudes-inscripcion'),
  cambiarEstadoSolicitud: (id: number, estado_tramite: string) =>
    put<SolicitudInscripcion, { estado_tramite: string }>(`/solicitudes-inscripcion/${id}/estado`, { estado_tramite }),
  crearPostulacion: (data: PostulacionEmpleo) =>
    post<PostulacionEmpleo, PostulacionEmpleo>('/postulaciones', data),
  getPostulaciones: () => request<PostulacionEmpleo[]>('/postulaciones'),
  cambiarEstadoPostulacion: (id: number, estado: string) =>
    put<PostulacionEmpleo, { estado: string }>(`/postulaciones/${id}/estado`, { estado }),
  getAlumnos: () => request<Alumno[]>('/alumnos'),
  crearAlumno: (data: Partial<Alumno>) => post<Alumno, Partial<Alumno>>('/alumnos', data),
  getDocentes: () => request<Docente[]>('/docentes'),
  crearDocente: (data: Partial<Docente>) => post<Docente, Partial<Docente>>('/docentes', data),
  getCursos: () => request<Curso[]>('/cursos'),
  crearCurso: (data: Partial<Curso>) => post<Curso, Partial<Curso>>('/cursos', data),
  getAsignaciones: () => request<AsignacionDocente[]>('/asignaciones-docentes'),
  getActividades: () => request<ActividadEscolar[]>('/actividades'),
  crearActividad: (data: Partial<ActividadEscolar>) => post<ActividadEscolar, Partial<ActividadEscolar>>('/actividades', data),
  getGaleria: () => request<GaleriaImagen[]>('/galeria'),
  crearGaleriaImagen: (data: Partial<GaleriaImagen>) => post<GaleriaImagen, Partial<GaleriaImagen>>('/galeria', data),
  getUsuarios: () => request<UsuarioAcceso[]>('/usuarios'),
  crearUsuario: (data: Partial<UsuarioAcceso> & { password_demo: string }) => post<UsuarioAcceso, Partial<UsuarioAcceso> & { password_demo: string }>('/usuarios', data),
  loginDemo: (email: string, password: string) =>
    post<{ usuario: UsuarioAcceso }, { email: string; password: string }>('/login-demo', { email, password }),
  enviarContacto: (data: ContactoMensaje) => post<ContactoMensaje, ContactoMensaje>('/contacto', data),
};
