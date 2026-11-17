// Reglas de facturación y pagos sin acceso a la base, para poder probarlas con pruebas unitarias.
// Los pagos son una simulación para el trabajo práctico: no se procesa dinero real.

export const METODO_PAGO = 'Transferencia'; // No se realizan pagos en efectivo.
export const DIA_VENCIMIENTO = 15;
export const DIA_AVISO_DEUDA = 20;
export const TAMANO_MAXIMO_COMPROBANTE = 2 * 1024 * 1024; // 2 MB
export const TIPOS_COMPROBANTE = ['application/pdf', 'image/png', 'image/jpeg'];

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const PERIODO = /^\d{4}-(0[1-9]|1[0-2])$/;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

// Fecha de hoy (AAAA-MM-DD) en Argentina.
export function hoyArgentina(fecha = new Date()) {
  return fecha.toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });
}

export const esPeriodo = (valor) => typeof valor === 'string' && PERIODO.test(valor);
export const esFecha = (valor) => typeof valor === 'string' && FECHA.test(valor) && !Number.isNaN(Date.parse(valor));

export function nombrePeriodo(periodo) {
  const [anio, mes] = periodo.split('-').map(Number);
  return `${MESES[mes - 1][0].toUpperCase()}${MESES[mes - 1].slice(1)} ${anio}`;
}

export function periodoSiguiente(periodo) {
  const [anio, mes] = periodo.split('-').map(Number);
  return mes === 12 ? `${anio + 1}-01` : `${anio}-${String(mes + 1).padStart(2, '0')}`;
}

// Último día hábil (lunes a viernes) del mes. No contempla feriados.
export function ultimoDiaHabil(periodo) {
  const [anio, mes] = periodo.split('-').map(Number);
  const dia = new Date(Date.UTC(anio, mes, 0)); // último día del mes
  while ([0, 6].includes(dia.getUTCDay())) dia.setUTCDate(dia.getUTCDate() - 1);
  return dia.toISOString().slice(0, 10);
}

// Qué correos corresponden a una fecha:
// - el último día hábil se envía el recordatorio del mes siguiente (con su factura);
// - el día 20 se avisa la deuda a quien no completó el pago.
export function tareasDelDia(fecha) {
  const periodo = fecha.slice(0, 7);
  return {
    recordatorio: fecha === ultimoDiaHabil(periodo) ? periodoSiguiente(periodo) : null,
    avisoDeuda: Number(fecha.slice(8, 10)) === DIA_AVISO_DEUDA ? periodo : null,
  };
}

// Estado de una factura según lo pagado y el vencimiento.
export function estadoFactura({ total, pagado, vence }, hoy) {
  if (pagado >= total) return 'Pagada';
  if (pagado > 0) return hoy > vence ? 'Pago incompleto (vencida)' : 'Pago incompleto';
  return hoy > vence ? 'Vencida' : 'Pendiente';
}

export const tieneDeuda = (estado) => estado !== 'Pagada';

// Valida el pago que elige la familia: ítems de la factura sin pagar, datos de la transferencia y comprobante.
export function validarPago({ itemIds, itemsFactura, numeroOperacion, fechaTransferencia, comprobante, hoy }) {
  if (!Array.isArray(itemIds) || !itemIds.length) return 'Seleccioná al menos un ítem para pagar.';
  const porId = new Map(itemsFactura.map((i) => [i.id, i]));
  if (new Set(itemIds).size !== itemIds.length) return 'Hay ítems repetidos.';
  for (const id of itemIds) {
    const item = porId.get(id);
    if (!item) return 'Algún ítem no pertenece a la factura.';
    if (item.pago_id) return `El ítem "${item.descripcion}" ya está pagado.`;
  }
  if (!numeroOperacion || !/^[A-Za-z0-9-]{4,30}$/.test(numeroOperacion)) return 'Ingresá el número de operación de la transferencia (4 a 30 letras o números).';
  if (!esFecha(fechaTransferencia)) return 'La fecha de la transferencia no es válida.';
  if (fechaTransferencia > hoy) return 'La fecha de la transferencia no puede ser futura.';
  return validarComprobante(comprobante);
}

// El comprobante de la transferencia es obligatorio: PDF o imagen de hasta 2 MB.
export function validarComprobante(comprobante) {
  if (!comprobante?.contenido || !comprobante?.nombre) return 'Adjuntá el comprobante de la transferencia.';
  if (!TIPOS_COMPROBANTE.includes(comprobante.tipo)) return 'El comprobante debe ser PDF, PNG o JPG.';
  if (!/^[A-Za-z0-9+/]+=*$/.test(comprobante.contenido)) return 'El archivo del comprobante no es válido.';
  const bytes = Math.floor((comprobante.contenido.length * 3) / 4);
  if (bytes > TAMANO_MAXIMO_COMPROBANTE) return 'El comprobante no puede superar los 2 MB.';
  return null;
}

// Suma la deuda por tipo de ítem (cuota, deporte, transporte, comedor).
export function deudaPorTipo(items) {
  const totales = {};
  for (const item of items) totales[item.tipo] = (totales[item.tipo] ?? 0) + item.importe;
  return Object.entries(totales).map(([tipo, total]) => ({ tipo, total }));
}
