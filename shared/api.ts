// Cliente de la API RESTful, compartido por la web y la app movil.
// Cada plataforma le indica la URL base y como leer el token JWT.
import type * as T from './types';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export interface ApiConfig {
  baseUrl: string;
  getToken: () => string | null | Promise<string | null>;
  onUnauthorized?: () => void;
}

type Body = Record<string, unknown>;

export function createApi(config: ApiConfig) {
  async function request<R>(method: string, path: string, body?: Body): Promise<R> {
    const token = await config.getToken();
    let response: Response;
    try {
      response = await fetch(`${config.baseUrl}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new ApiError(0, 'No se pudo conectar con el servidor. Revise su conexión.');
    }

    if (response.status === 401 && token) config.onUnauthorized?.();
    if (response.status === 204) return undefined as R;

    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new ApiError(response.status, data.error ?? 'No se pudo completar la operación.');
    return data as R;
  }

  const get = <R>(path: string) => request<R>('GET', path);
  const post = <R>(path: string, body: Body = {}) => request<R>('POST', path, body);
  const put = <R>(path: string, body: Body = {}) => request<R>('PUT', path, body);
  const del = <R = void>(path: string) => request<R>('DELETE', path);
  const qs = (params: Record<string, string | number | undefined | null>) => {
    const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
    return entries.length ? `?${entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&')}` : '';
  };

  return {
    // ----- Publico -----
    login: (email: string, password: string) => post<T.LoginResponse>('/auth/login', { email, password }),
    perfil: () => get<T.Usuario>('/auth/me'),
    niveles: () => get<T.Nivel[]>('/niveles'),
    noticias: () => get<T.Noticia[]>('/noticias'),
    deportesPublicos: () => get<T.Comision[]>('/deportes'),
    recorridos: () => get<T.Recorrido[]>('/recorridos'),
    enviarContacto: (data: Body) => post<T.MensajeOk>('/contacto', data),
    enviarSolicitud: (data: Body) => post<T.MensajeOk>('/solicitudes', data),
    credencial: (token: string) => get<T.Credencial>(`/credencial/${encodeURIComponent(token)}`),

    // ----- Portal familia -----
    familia: {
      hijos: () => get<T.Alumno360[]>('/portal/familia/hijos'),
      hijo: (id: number) => get<T.DetalleAlumno>(`/portal/familia/hijos/${id}`),
      opciones: (id: number) => get<T.OpcionesInscripcion>(`/portal/familia/hijos/${id}/opciones`),
      matricular: (id: number, curso_id: number) => post(`/portal/familia/hijos/${id}/matricula`, { curso_id }),
      inscribirDeporte: (id: number, comision_id: number) => post(`/portal/familia/hijos/${id}/deportes`, { comision_id }),
      bajaDeporte: (id: number, inscripcionId: number) => del(`/portal/familia/hijos/${id}/deportes/${inscripcionId}`),
      inscribirTransporte: (id: number, recorrido_id: number, parada: string) =>
        post(`/portal/familia/hijos/${id}/transporte`, { recorrido_id, parada }),
      bajaTransporte: (id: number, inscripcionId: number) => del(`/portal/familia/hijos/${id}/transporte/${inscripcionId}`),
      inscribirComedor: (id: number, data: Body) => post(`/portal/familia/hijos/${id}/comedor`, data),
      bajaComedor: (id: number, inscripcionId: number) => del(`/portal/familia/hijos/${id}/comedor/${inscripcionId}`),
    },

    // ----- Portales docente y alumno -----
    portalDocente: () => get<T.PortalDocente>('/portal/docente'),
    portalAlumno: () => get<T.DetalleAlumno>('/portal/alumno'),

    // ----- Enfermeria -----
    salud: {
      fichas: (params: { buscar?: string; estado?: string } = {}) => get<T.FichaResumen[]>(`/salud/fichas${qs(params)}`),
      ficha: (alumnoId: number) => get<T.FichaMedica>(`/salud/fichas/${alumnoId}`),
      guardar: (alumnoId: number, data: Body) => put<T.FichaMedica>(`/salud/fichas/${alumnoId}`, data),
    },

    // ----- Administracion -----
    admin: {
      ciclos: () => get<T.Ciclo[]>('/admin/ciclos'),
      cursos: (params: { nivel_id?: number } = {}) => get<T.Curso[]>(`/admin/cursos${qs(params)}`),
      crearCurso: (data: Body) => post<T.Curso>('/admin/cursos', data),
      actualizarCurso: (id: number, data: Body) => put<T.Curso>(`/admin/cursos/${id}`, data),
      eliminarCurso: (id: number) => del(`/admin/cursos/${id}`),
      materiasCurso: (id: number) => get<T.CursoMateria[]>(`/admin/cursos/${id}/materias`),
      asignarProfesor: (cursoMateriaId: number, profesor_id: number | null) =>
        put(`/admin/cursos-materias/${cursoMateriaId}`, { profesor_id }),
      materias: () => get<T.Materia[]>('/admin/materias'),
      crearMateria: (data: Body) => post<T.Materia>('/admin/materias', data),
      eliminarMateria: (id: number) => del(`/admin/materias/${id}`),

      profesores: () => get<T.Profesor[]>('/admin/profesores'),
      crearProfesor: (data: Body) => post<T.Profesor>('/admin/profesores', data),
      actualizarProfesor: (id: number, data: Body) => put<T.Profesor>(`/admin/profesores/${id}`, data),
      eliminarProfesor: (id: number) => del(`/admin/profesores/${id}`),

      alumnos: (params: { buscar?: string; nivel_id?: number } = {}) => get<T.Alumno[]>(`/admin/alumnos${qs(params)}`),
      alumno: (id: number) => get<T.Alumno>(`/admin/alumnos/${id}`),
      crearAlumno: (data: Body) => post<T.Alumno>('/admin/alumnos', data),
      actualizarAlumno: (id: number, data: Body) => put<T.Alumno>(`/admin/alumnos/${id}`, data),
      eliminarAlumno: (id: number) => del(`/admin/alumnos/${id}`),
      vincularTutor: (alumnoId: number, data: Body) => post(`/admin/alumnos/${alumnoId}/tutores`, data),
      desvincularTutor: (alumnoId: number, tutorId: number) => del(`/admin/alumnos/${alumnoId}/tutores/${tutorId}`),

      tutores: (params: { buscar?: string } = {}) => get<T.Tutor[]>(`/admin/tutores${qs(params)}`),
      crearTutor: (data: Body) => post<T.Tutor>('/admin/tutores', data),
      actualizarTutor: (id: number, data: Body) => put<T.Tutor>(`/admin/tutores/${id}`, data),
      eliminarTutor: (id: number) => del(`/admin/tutores/${id}`),

      roles: () => get<T.RolInfo[]>('/admin/roles'),
      usuarios: () => get<T.UsuarioListado[]>('/admin/usuarios'),
      crearUsuario: (data: Body) => post('/admin/usuarios', data),
      actualizarUsuario: (id: number, data: Body) => put(`/admin/usuarios/${id}`, data),

      matriculas: (params: { curso_id?: number } = {}) => get<T.Matricula[]>(`/admin/matriculas${qs(params)}`),
      matricular: (alumno_id: number, curso_id: number) => post('/admin/matriculas', { alumno_id, curso_id }),
      bajaMatricula: (id: number) => del(`/admin/matriculas/${id}`),

      deportes: () => get<T.Deporte[]>('/admin/deportes'),
      crearDeporte: (data: Body) => post<T.Deporte>('/admin/deportes', data),
      actualizarDeporte: (id: number, data: Body) => put<T.Deporte>(`/admin/deportes/${id}`, data),
      comisiones: (params: { deporte_id?: number; nivel_id?: number } = {}) => get<T.Comision[]>(`/admin/comisiones${qs(params)}`),
      crearComision: (data: Body) => post('/admin/comisiones', data),
      actualizarComision: (id: number, data: Body) => put(`/admin/comisiones/${id}`, data),
      eliminarComision: (id: number) => del(`/admin/comisiones/${id}`),

      inscripcionesDeporte: (params: { comision_id?: number; alumno_id?: number } = {}) =>
        get<T.InscripcionDeporte[]>(`/admin/inscripciones-deporte${qs(params)}`),
      detalleAlumno: (id: number) => get<T.DetalleAlumno>(`/admin/alumnos/${id}/detalle`),
      opcionesAlumno: (id: number) => get<T.OpcionesInscripcion>(`/admin/alumnos/${id}/opciones`),
      comisionesAlumno: (alumnoId: number) => get<T.ComisionDisponible[]>(`/admin/alumnos/${alumnoId}/comisiones`),
      inscribirDeporte: (alumno_id: number, comision_id: number) => post('/admin/inscripciones-deporte', { alumno_id, comision_id }),
      bajaDeporte: (id: number) => del(`/admin/inscripciones-deporte/${id}`),

      transporte: () => get<T.InscripcionTransporte[]>('/admin/transporte'),
      inscribirTransporte: (alumno_id: number, recorrido_id: number, parada: string) =>
        post('/admin/transporte', { alumno_id, recorrido_id, parada }),
      bajaTransporte: (id: number) => del(`/admin/transporte/${id}`),

      comedor: () => get<T.InscripcionComedor[]>('/admin/comedor'),
      inscribirComedor: (data: Body) => post('/admin/comedor', data),
      bajaComedor: (id: number) => del(`/admin/comedor/${id}`),

      resumen: () => get<T.Resumen>('/admin/reportes/resumen'),
      padronCurso: (curso_id?: number) => get<T.PadronCursoFila[]>(`/admin/reportes/padron-curso${qs({ curso_id })}`),
      padronTransporte: (recorrido_id?: number) =>
        get<T.PadronTransporteFila[]>(`/admin/reportes/transporte${qs({ recorrido_id })}`),
      ocupacionDeportes: () => get<T.OcupacionDeporte[]>('/admin/reportes/deportes'),
      reporteComedor: () => get<T.ReporteComedor>('/admin/reportes/comedor'),
      reporteAlumnos: () => get<T.Alumno360[]>('/admin/reportes/alumnos'),
      reporteAlumno: (id: number) => get<T.Alumno360>(`/admin/reportes/alumnos/${id}`),
      auditoria: () => get<T.Auditoria[]>('/admin/reportes/auditoria'),

      noticias: () => get<T.Noticia[]>('/admin/noticias'),
      crearNoticia: (data: Body) => post<T.Noticia>('/admin/noticias', data),
      actualizarNoticia: (id: number, data: Body) => put<T.Noticia>(`/admin/noticias/${id}`, data),
      eliminarNoticia: (id: number) => del(`/admin/noticias/${id}`),
      mensajes: () => get<T.MensajeContacto[]>('/admin/mensajes'),
      marcarLeido: (id: number) => put(`/admin/mensajes/${id}/leido`),
      solicitudes: () => get<T.Solicitud[]>('/admin/solicitudes'),
      estadoSolicitud: (id: number, estado: T.EstadoSolicitud) => put(`/admin/solicitudes/${id}/estado`, { estado }),
    },
  };
}

export type Api = ReturnType<typeof createApi>;
