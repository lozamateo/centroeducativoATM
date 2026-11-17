// Formatos y etiquetas compartidas por la web y la app movil.
import type { EstadoApto, Horario, Rol } from './types';

export const DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'] as const;
export const DIAS_CORTOS = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'] as const;

export const ROLES: Record<Rol, string> = {
  ADMIN: 'Administrador',
  DOCENTE: 'Docente',
  TUTOR: 'Familia',
  ALUMNO: 'Alumno',
  ENFERMERIA: 'Enfermería',
};

export const MODALIDADES_COMEDOR = ['Almuerzo', 'Almuerzo y merienda', 'Vianda propia'] as const;

export const hora = (value: string | null | undefined) => (value ? value.slice(0, 5) : '');

export function fecha(value: string | null | undefined) {
  if (!value) return '-';
  const [y, m, d] = value.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

export function fechaHora(value: string | null | undefined) {
  if (!value) return '-';
  const date = new Date(value);
  return `${fecha(value)} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function horarios(lista: Horario[]) {
  return lista.map((h) => `${DIAS_CORTOS[h.dia_semana]} ${hora(h.hora_inicio)}-${hora(h.hora_fin)}`).join(' · ');
}

export function dias(lista: number[]) {
  return lista.map((d) => DIAS_CORTOS[d]).join(', ');
}

export function edad(fechaNacimiento: string) {
  const nac = new Date(fechaNacimiento);
  const hoy = new Date();
  let anios = hoy.getFullYear() - nac.getFullYear();
  if (hoy < new Date(hoy.getFullYear(), nac.getMonth(), nac.getDate())) anios--;
  return anios;
}

export const tonoApto: Record<EstadoApto, 'success' | 'danger' | 'warning'> = {
  Vigente: 'success',
  Vencido: 'danger',
  'Sin apto': 'warning',
};

// URL que codifica el QR de la credencial deportiva.
export const urlCredencial = (siteUrl: string, token: string) => `${siteUrl.replace(/\/$/, '')}/credencial/${token}`;

// Importes en pesos argentinos, por ejemplo $ 40.000.
export const pesos = (valor: number) => `$ ${valor.toLocaleString('es-AR')}`;

export const mesCorto = (periodo: string) => {
  const nombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const [anio, mes] = periodo.split('-');
  return `${nombres[Number(mes) - 1]} ${anio.slice(2)}`;
};

export const tonoCuota = { Pagada: 'success', 'En término': 'info', Vencida: 'danger', 'Próxima': 'neutral' } as const;

// Datos bancarios de ejemplo: el pago es una simulación para el trabajo práctico.
export const DATOS_TRANSFERENCIA = { alias: 'EDUCAR.TRANSFORMAR.CUOTAS', cbu: '0000003100099999999999', titular: 'Centro Educativo Educar para Transformar (ficticio)' };
