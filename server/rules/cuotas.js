// Reglas de las cuotas mensuales sin acceso a la base, para poder probarlas con pruebas unitarias.
// El pago es simulado (trabajo académico): no se procesa dinero real.

export const CUOTA_GENERAL = 40000;
export const CUOTA_HERMANOS = 30000;
export const DIA_VENCIMIENTO = 15;
export const METODOS_PAGO = ['Efectivo', 'Transferencia'];

// Período de cuotas: desde agosto 2026 (pre-inicio) hasta diciembre 2027 (fin del ciclo lectivo).
export const PRIMER_PERIODO = '2026-08';
export const ULTIMO_PERIODO = '2027-12';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// Fecha de hoy (AAAA-MM-DD) en Argentina.
export function hoyArgentina(fecha = new Date()) {
  return fecha.toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });
}

// Lista de períodos "AAAA-MM" entre dos períodos, inclusive.
export function periodos(desde = PRIMER_PERIODO, hasta = ULTIMO_PERIODO) {
  const lista = [];
  let [anio, mes] = desde.split('-').map(Number);
  const [anioFin, mesFin] = hasta.split('-').map(Number);
  while (anio < anioFin || (anio === anioFin && mes <= mesFin)) {
    lista.push(`${anio}-${String(mes).padStart(2, '0')}`);
    mes += 1;
    if (mes > 12) { mes = 1; anio += 1; }
  }
  return lista;
}

export const esPeriodoValido = (periodo) => /^\d{4}-\d{2}$/.test(periodo) && periodos().includes(periodo);

export function nombrePeriodo(periodo) {
  const [anio, mes] = periodo.split('-').map(Number);
  return `${MESES[mes - 1][0].toUpperCase()}${MESES[mes - 1].slice(1)} ${anio}`;
}

export const vencimiento = (periodo) => `${periodo}-${String(DIA_VENCIMIENTO).padStart(2, '0')}`;

// Grupo familiar: con 2 o más hijos en el colegio, cada cuota pasa a $30.000.
export const importeMensual = (cantidadHijos) => (cantidadHijos >= 2 ? CUOTA_HERMANOS : CUOTA_GENERAL);

// Estado de una cuota según la fecha de hoy. Se paga del 1 al 15 de cada mes.
//  Pagada · En término (mes en curso, hasta el 15) · Vencida (pasó el 15 sin pago) · Próxima (mes futuro)
export function estadoCuota(periodo, hoy, pagada) {
  if (pagada) return 'Pagada';
  const mesActual = hoy.slice(0, 7);
  if (periodo > mesActual) return 'Próxima';
  if (periodo === mesActual && hoy <= vencimiento(periodo)) return 'En término';
  return 'Vencida';
}

// Una cuota se puede pagar si no está pagada y su mes ya empezó (no se adelantan cuotas futuras).
export const sePuedePagar = (estado) => estado === 'En término' || estado === 'Vencida';

// Resumen de la deuda: desde qué mes adeuda y cuánto.
export function resumenDeuda(cuotas) {
  const vencidas = cuotas.filter((c) => c.estado === 'Vencida');
  return {
    adeuda_desde: vencidas[0]?.periodo ?? null,
    cuotas_vencidas: vencidas.length,
    total_adeudado: vencidas.reduce((total, c) => total + c.importe, 0),
  };
}
