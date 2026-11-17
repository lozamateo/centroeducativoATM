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
  legajo?: string;
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
  telefono?: string | null;
  email?: string | null;
  legajo?: string;
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
  legajo: string;
  apellido: string;
  nombre: string;
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

// ----- Pagos (Parte 3). Simulación para el trabajo práctico: no hay dinero real. -----

export type EstadoFactura = 'Pagada' | 'Pago incompleto' | 'Pago incompleto (vencida)' | 'Pendiente' | 'Vencida';
export type TipoItem = 'Cuota' | 'Deporte' | 'Transporte' | 'Comedor';

export interface FacturaItem {
  id: number;
  tipo: TipoItem;
  descripcion: string;
  importe: number;
  pago_id: number | null;
}

export interface ComprobanteInfo {
  id: number;
  nombre_archivo: string;
  tipo_mime: string;
  tamano: number;
  created_at: string;
}

export interface Pago {
  id: number;
  numero: string;
  importe: number;
  metodo: 'Transferencia';
  numero_operacion: string;
  fecha_transferencia: string;
  fecha: string;
  registrado_por: string | null;
  items: string[];
  comprobantes: ComprobanteInfo[];
}

export interface Factura {
  id: number;
  numero: string;
  alumno_id: number;
  alumno: string;
  legajo: string;
  periodo: string;
  mes: string;
  fecha_emision: string;
  vence: string;
  total: number;
  pagado: number;
  saldo: number;
  estado: EstadoFactura;
  items: FacturaItem[];
  pagos?: Pago[];
  tutor?: string | null;
  tutor_dni?: string | null;
}

export interface ItemDeuda {
  id: number;
  tipo: TipoItem;
  descripcion: string;
  importe: number;
  factura_id: number;
  factura: string;
  periodo: string;
  mes: string;
  vence: string;
  vencido: boolean;
}

export interface CuentaAlumno {
  alumno_id: number;
  alumno: string;
  legajo: string;
  hijos_en_el_colegio: number;
  descuento_hermanos: boolean;
  metodo_pago: 'Transferencia';
  deuda: {
    total_adeudado: number;
    a_vencer: number;
    adeuda_desde: string | null;
    por_tipo: { tipo: TipoItem; total: number }[];
    items: ItemDeuda[];
  };
  facturas: Factura[];
}

export interface ComprobanteArchivo {
  nombre_archivo: string;
  tipo_mime: string;
  contenido: string;
}

export interface PagoRegistrado {
  id: number;
  numero: string;
  recibo: string;
  factura: string;
  importe: number;
  metodo: 'Transferencia';
  fecha: string;
}

export interface Tarifas {
  generales: { clave: string; descripcion: string; importe: number; updated_at: string }[];
  deportes: { id: number; nombre: string; precio_mensual: number; profesor_responsable: string | null }[];
  recorridos: { id: number; nombre: string; zona: string; precio_mensual: number }[];
}

export interface PanelFacturacion {
  hoy: string;
  periodo: string;
  periodos: string[];
  resumen: { facturado: number; cobrado: number; pagadas: number; incompletas: number; impagas: number; deuda_vencida: number };
  facturas: Factura[];
  deudores: { alumno_id: number; alumno: string; legajo: string; nivel: string | null; adeuda_desde: string; adeuda_desde_mes: string; total_adeudado: number; facturas: number }[];
}

export interface ReporteIngresos {
  total: number;
  por_mes: { periodo: string; mes: string; total: number }[];
  detalle: { id: number; recibo: string; fecha_transferencia: string; numero_operacion: string; importe: number; factura: string; periodo: string; alumno: string; legajo: string }[];
}

export interface ReportePagosEstado {
  cantidad: number;
  anios: {
    anio: string; total: number; pagado: number; saldo: number;
    alumnos: {
      alumno_id: number; alumno: string; legajo: string; total: number; pagado: number; saldo: number;
      facturas: { numero: string; periodo: string; mes: string; total: number; pagado: number; saldo: number; estado: EstadoFactura }[];
    }[];
  }[];
}

export interface PagoServicioFila {
  id: number;
  deporte?: string;
  comision?: string;
  nivel?: string;
  horario?: string | null;
  profesor?: string;
  recorrido_id?: number;
  recorrido?: string;
  zona?: string;
  alumno: string;
  legajo: string;
  periodo: string;
  factura: string;
  importe: number;
  pagado: boolean;
  recibo: string | null;
}

export interface Notificacion {
  id: number;
  tipo: 'Recordatorio de pago' | 'Aviso de deuda' | 'Recuperar contraseña';
  periodo: string | null;
  destinatario_nombre?: string;
  destinatario_email?: string;
  asunto: string;
  cuerpo: string;
  factura_ids: number[];
  total: number | null;
  enviado_en: string;
}

export interface ResultadoTareas {
  fecha: string;
  resultados: { tipo: string; periodo: string; enviados: number }[];
  mensaje: string | null;
}

// ----- Parte 1: opiniones y empleo -----

export interface Opinion {
  id: number;
  nombre: string;
  relacion: string;
  comentario: string;
  puntaje: number;
  visible?: boolean;
  created_at: string;
}

export interface BusquedaLaboral {
  id: number;
  puesto: string;
  area: string;
  descripcion: string;
  modalidad: string;
}

export interface Postulacion {
  id: number;
  nombre: string;
  email: string;
  telefono: string | null;
  puesto: string;
  mensaje: string | null;
  cv_url: string | null;
  estado: 'Nueva' | 'Revisada' | 'Entrevista' | 'Descartada';
  created_at: string;
}

// ----- Parte 2: reportes -----

export interface ReporteDocenteFila { profesor_id: number; legajo: string; profesor: string; nivel: string; curso: string; materia: string; horario: string | null }
export interface ReporteAlumnoMateriaFila { nivel: string; curso: string; materia: string; profesor: string; alumno: string; legajo: string }
export interface ReporteDocenteNivelFila { nivel: string; legajo: string; profesor: string; materias: string; cursos: string }
export interface ReporteAlumnoDeporteFila { deporte: string; comision: string; nivel: string; horario: string | null; profesor: string; alumno: string; legajo: string; curso: string | null }
export interface ReportePorAlumno {
  alumno_id: number; legajo: string; alumno: string; dni: string; nivel: string | null; curso: string | null;
  transporte: string | null; comedor: string | null;
  materias: { materia: string; profesor: string; horario: string | null }[];
  deportes: { deporte: string; comision: string; horario: string | null; profesor: string }[];
}
