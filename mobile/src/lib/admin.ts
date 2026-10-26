// Campos de los formularios de administracion (los mismos que usa la web).
import type { FieldConfig } from '../components/FormSheet';
import type { Option } from '../components/ui';

export const nivelOptions: Option[] = [
  { value: 1, label: 'Inicial' },
  { value: 2, label: 'Primario' },
  { value: 3, label: 'Secundario' },
];

const lista = (valores: string[]): Option[] => valores.map((v) => ({ value: v, label: v }));

export const alumnoFields: FieldConfig[] = [
  { name: 'dni', label: 'DNI', required: true, type: 'tel', hint: 'Solo números' },
  { name: 'nivel_id', label: 'Nivel', type: 'select', options: nivelOptions, required: true },
  { name: 'nombre', label: 'Nombre', required: true },
  { name: 'apellido', label: 'Apellido', required: true },
  { name: 'fecha_nacimiento', label: 'Fecha de nacimiento', type: 'date', required: true },
  { name: 'genero', label: 'Género', type: 'select', options: lista(['Femenino', 'Masculino', 'Otro']) },
  { name: 'direccion', label: 'Dirección' },
  { name: 'activo', label: 'Alumno activo', type: 'checkbox' },
];

export const tutorFields: FieldConfig[] = [
  { name: 'dni', label: 'DNI', required: true, type: 'tel' },
  { name: 'telefono', label: 'Teléfono', type: 'tel', required: true },
  { name: 'nombre', label: 'Nombre', required: true },
  { name: 'apellido', label: 'Apellido', required: true },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'ocupacion', label: 'Ocupación' },
  { name: 'direccion', label: 'Dirección' },
];

export const profesorFields: FieldConfig[] = [
  { name: 'dni', label: 'DNI', required: true, type: 'tel' },
  { name: 'especialidad', label: 'Especialidad' },
  { name: 'nombre', label: 'Nombre', required: true },
  { name: 'apellido', label: 'Apellido', required: true },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'telefono', label: 'Teléfono', type: 'tel' },
  { name: 'fecha_ingreso', label: 'Fecha de ingreso', type: 'date' },
  { name: 'activo', label: 'Docente activo', type: 'checkbox' },
];

export const cursoFields: FieldConfig[] = [
  { name: 'nivel_id', label: 'Nivel', type: 'select', options: nivelOptions, required: true },
  { name: 'anio', label: 'Sala / grado / año', required: true, placeholder: 'Ej: 1.º grado' },
  { name: 'division', label: 'División', required: true, placeholder: 'A' },
  { name: 'turno', label: 'Turno', type: 'select', options: lista(['Jornada extendida', 'Mañana', 'Tarde']) },
  { name: 'cupo', label: 'Cupo', type: 'number', required: true },
];

export const materiaFields: FieldConfig[] = [
  { name: 'nombre', label: 'Nombre', required: true },
  { name: 'nivel_id', label: 'Nivel', type: 'select', options: nivelOptions, required: true },
  { name: 'carga_horaria_semanal', label: 'Horas semanales', type: 'number' },
  { name: 'es_idioma', label: 'Es un idioma extranjero', type: 'checkbox' },
];

export const noticiaFields: FieldConfig[] = [
  { name: 'titulo', label: 'Título', required: true },
  { name: 'categoria', label: 'Categoría', type: 'select', options: lista(['Institucional', 'Inscripciones', 'Deportes', 'Eventos']) },
  { name: 'imagen_url', label: 'URL de imagen', type: 'url' },
  { name: 'resumen', label: 'Resumen', type: 'textarea', required: true },
  { name: 'contenido', label: 'Contenido', type: 'textarea' },
  { name: 'publicada', label: 'Publicada en el sitio', type: 'checkbox' },
];

export const parentescos = lista(['Madre', 'Padre', 'Abuela', 'Abuelo', 'Tía', 'Tío', 'Tutor legal']);
