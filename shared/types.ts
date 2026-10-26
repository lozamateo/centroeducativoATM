// Tipos de las respuestas de la API, compartidos por la web y la app movil.

export type Rol = 'ADMIN' | 'DOCENTE' | 'TUTOR' | 'ALUMNO' | 'ENFERMERIA';

export interface Usuario {
  id: number;
  email: string;
  nombre: string;
  apellido: string;
  rol: Rol;
  rol_nombre: string;
  alumno_id: number | null;
  tutor_id: number | null;
  profesor_id: number | null;
  permisos: string[];
}

export interface LoginResponse {
  token: string;
  usuario: Usuario;
}

export interface Nivel {
  id: number;
  nombre: 'Inicial' | 'Primario' | 'Secundario';
  descripcion: string | null;
  edad_desde: number | null;
  edad_hasta: number | null;
}

export interface Ciclo {
  id: number;
  anio: number;
  fecha_inicio: string;
  fecha_fin: string;
  activo: boolean;
}

export interface Curso {
  id: number;
  nivel_id: number;
  ciclo_id: number;
  nivel: string;
  ciclo: number;
  anio: string;
  division: string;
  turno: string;
  cupo: number;
  inscriptos: number;
}

export interface Materia {
  id: number;
  nombre: string;
  nivel_id: number;
  nivel: string;
  es_idioma: boolean;
  carga_horaria_semanal: number | null;
}

export interface CursoMateria {
  id: number;
  materia_id: number;
  nombre: string;
  es_idioma: boolean;
  carga_horaria_semanal: number | null;
  profesor_id: number | null;
  profesor: string | null;
}

export interface Profesor {
  id: number;
  usuario_id: number | null;
  dni: string;
  nombre: string;
  apellido: string;
  email: string | null;
  telefono: string | null;
  especialidad: string | null;
  fecha_ingreso: string | null;
  activo: boolean;
  materias_asignadas?: number;
  comisiones_a_cargo?: number;
}

export interface Tutor {
  id: number;
  usuario_id: number | null;
  dni: string;
  nombre: string;
  apellido: string;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  ocupacion: string | null;
  hijos?: string | null;
  parentesco?: string;
  es_responsable?: boolean;
  autorizado_retiro?: boolean;
}

export interface Alumno {
  id: number;
  usuario_id: number | null;
  dni: string;
  nombre: string;
  apellido: string;
  fecha_nacimiento: string;
  genero: string | null;
  direccion: string | null;
  nivel_id: number | null;
  nivel: string | null;
  curso?: string | null;
  activo: boolean;
  tutores?: Tutor[];
}

export interface Horario {
  id?: number;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
}

export interface Deporte {
  id: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  comisiones?: number;
}

export interface Comision {
  id: number;
  deporte_id: number;
  nivel_id: number;
  ciclo_id: number;
  nombre: string;
  deporte: string;
  nivel: string;
  profesor_id: number | null;
  profesor: string | null;
  cupo: number;
  inscriptos: number;
  horarios: Horario[];
}

export interface ComisionDisponible {
  id: number;
  nombre: string;
  deporte_id: number;
  deporte: string;
  profesor: string | null;
  cupo: number;
  inscriptos: number;
  horarios: Horario[];
  disponible: boolean;
  motivo: string | null;
}

export interface Recorrido {
  id: number;
  nombre: string;
  zona: string;
  paradas: string | null;
  horario_ida: string;
  horario_vuelta: string;
  capacidad: number;
  inscriptos: number;
}

export interface Matricula {
  id: number;
  alumno_id: number;
  curso_id: number;
  ciclo_id: number;
  estado: 'Pendiente' | 'Activa' | 'Baja';
  comprobante: string;
  alumno: string;
  dni: string;
  curso: string;
  created_at: string;
}

export interface InscripcionDeporte {
  id: number;
  alumno_id: number;
  comision_id: number;
  alumno: string;
  dni: string;
  deporte: string;
  comision: string;
  created_at: string;
}

export interface InscripcionTransporte {
  id: number;
  alumno_id: number;
  recorrido_id: number;
  alumno: string;
  dni: string;
  recorrido: string;
  parada: string | null;
  comprobante: string;
}

export type ModalidadComedor = 'Almuerzo' | 'Almuerzo y merienda' | 'Vianda propia';

export interface InscripcionComedor {
  id: number;
  alumno_id: number;
  alumno: string;
  dni: string;
  modalidad: ModalidadComedor;
  dias: number[];
  dieta_especial: string | null;
}

export type EstadoApto = 'Vigente' | 'Vencido' | 'Sin apto';

export interface FichaResumen {
  alumno_id: number;
  dni: string;
  alumno: string;
  nivel: string | null;
  grupo_sanguineo: string | null;
  alergias: string | null;
  apto_fisico_vence: string | null;
  estado_apto: EstadoApto;
}

export interface FichaMedica {
  alumno_id: number;
  dni: string;
  nombre: string;
  apellido: string;
  fecha_nacimiento: string;
  nivel: string | null;
  grupo_sanguineo: string | null;
  alergias: string | null;
  enfermedades_cronicas: string | null;
  medicacion: string | null;
  obra_social: string | null;
  nro_afiliado: string | null;
  contacto_emergencia: string | null;
  telefono_emergencia: string | null;
  apto_fisico_emision: string | null;
  apto_fisico_vence: string | null;
  apto_fisico_archivo: string | null;
  observaciones: string | null;
  qr_token: string | null;
  estado_apto: EstadoApto;
}

export interface Credencial {
  alumno: string;
  nivel: string | null;
  apto_fisico_vence: string | null;
  estado_apto: EstadoApto;
  deportes: string;
  habilitado: boolean;
}

export interface Alumno360 {
  alumno_id: number;
  alumno: string;
  dni: string;
  fecha_nacimiento: string;
  nivel: string | null;
  curso: string | null;
  tutores: string | null;
  deportes: string | null;
  transporte: string | null;
  comedor: string | null;
  grupo_sanguineo: string | null;
  alergias: string | null;
  apto_fisico_vence: string | null;
  estado_apto: EstadoApto;
  parentesco?: string;
}

export interface DetalleAlumno extends Omit<Alumno360, 'deportes' | 'comedor' | 'transporte'> {
  matricula: { id: number; estado: string; comprobante: string; created_at: string; curso_id: number; curso: string; turno: string } | null;
  materias: { nombre: string; es_idioma: boolean; profesor: string | null }[];
  deportes: { id: number; deporte: string; comision: string; horarios: Horario[] }[];
  transporte: {
    id: number;
    parada: string | null;
    comprobante: string;
    recorrido_id: number;
    recorrido: string;
    horario_ida: string;
    horario_vuelta: string;
  } | null;
  comedor: { id: number; modalidad: ModalidadComedor; dias: number[]; dieta_especial: string | null } | null;
  ficha: {
    grupo_sanguineo: string | null;
    alergias: string | null;
    medicacion: string | null;
    obra_social: string | null;
    contacto_emergencia: string | null;
    telefono_emergencia: string | null;
    apto_fisico_vence: string | null;
    qr_token: string;
  } | null;
}

export interface OpcionesInscripcion {
  cursos: Curso[];
  comisiones: ComisionDisponible[];
  recorridos: Recorrido[];
}

export interface PortalDocente {
  profesor: Profesor;
  materias: { id: number; materia: string; curso: string; curso_id: number; alumnos: { alumno: string; dni: string }[] }[];
  comisiones: {
    id: number;
    deporte: string;
    comision: string;
    cupo: number;
    horarios: Horario[];
    alumnos: { alumno: string; dni: string; apto: string; alergias: string | null }[];
  }[];
}

export interface Resumen {
  alumnos: number;
  profesores: number;
  tutores: number;
  matriculados: number;
  inscripciones_deporte: number;
  usuarios_transporte: number;
  usuarios_comedor: number;
  aptos_vencidos: number;
  solicitudes_pendientes: number;
  mensajes_sin_leer: number;
  por_nivel: { nivel: string; matriculados: number; cupo: number }[];
}

export interface PadronCursoFila {
  curso_id: number;
  nivel: string;
  curso: string;
  ciclo: number;
  alumno_id: number;
  alumno: string;
  dni: string;
  estado: string;
  comprobante: string;
}

export interface PadronTransporteFila {
  recorrido_id: number;
  recorrido: string;
  zona: string;
  parada: string | null;
  alumno_id: number;
  alumno: string;
  dni: string;
  curso: string;
  contacto: string | null;
}

export interface OcupacionDeporte {
  deporte: string;
  comision: string;
  nivel: string;
  cupo: number;
  inscriptos: number;
  ocupacion: number;
}

export interface ReporteComedor {
  por_dia: { dia: number; raciones: number }[];
  detalle: { alumno: string; dni: string; modalidad: string; dias: number[]; dieta_especial: string | null; alergias: string | null }[];
}

export interface Auditoria {
  id: number;
  tabla: string;
  operacion: 'INSERT' | 'UPDATE' | 'DELETE';
  registro_id: number | null;
  fecha: string;
  usuario: string;
}

export interface UsuarioListado {
  id: number;
  email: string;
  nombre: string;
  apellido: string;
  activo: boolean;
  ultimo_acceso: string | null;
  rol: Rol;
  rol_nombre: string;
  vinculado_a: string | null;
}

export interface RolInfo {
  id: number;
  codigo: Rol;
  nombre: string;
  descripcion: string | null;
}

export interface Noticia {
  id: number;
  titulo: string;
  resumen: string;
  contenido: string | null;
  imagen_url: string | null;
  categoria: string;
  publicada: boolean;
  autor: string | null;
  fecha: string;
}

export interface MensajeContacto {
  id: number;
  nombre: string;
  email: string;
  telefono: string | null;
  asunto: string;
  mensaje: string;
  leido: boolean;
  created_at: string;
}

export type EstadoSolicitud = 'Pendiente' | 'Contactada' | 'Aceptada' | 'Rechazada';

export interface Solicitud {
  id: number;
  tutor_nombre: string;
  tutor_email: string;
  tutor_telefono: string;
  alumno_nombre: string;
  alumno_fecha_nac: string | null;
  nivel_id: number | null;
  nivel: string | null;
  anio_solicitado: string | null;
  servicios: string[];
  comentarios: string | null;
  estado: EstadoSolicitud;
  created_at: string;
}

export interface MensajeOk {
  mensaje: string;
}
