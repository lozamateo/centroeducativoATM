import { describe, expect, it } from 'vitest';
import {
  deudaPorTipo, estadoFactura, hoyArgentina, nombrePeriodo, periodoSiguiente, tareasDelDia, ultimoDiaHabil,
  validarComprobante, validarPago,
} from '../../server/rules/facturacion.js';

const pdf = { nombre: 'transferencia.pdf', tipo: 'application/pdf', contenido: 'JVBERi0xLjQK' };

describe('fechas de facturación', () => {
  it('calcula el último día hábil del mes', () => {
    expect(ultimoDiaHabil('2026-10')).toBe('2026-10-30'); // el 31 es sábado
    expect(ultimoDiaHabil('2026-11')).toBe('2026-11-30');
    expect(ultimoDiaHabil('2027-01')).toBe('2027-01-29'); // el 31 es domingo
  });

  it('el último día hábil envía el recordatorio del mes siguiente', () => {
    expect(tareasDelDia('2026-10-30')).toEqual({ recordatorio: '2026-11', avisoDeuda: null });
    expect(tareasDelDia('2026-12-31')).toEqual({ recordatorio: '2027-01', avisoDeuda: null });
  });

  it('el día 20 envía el aviso de deuda del mes', () => {
    expect(tareasDelDia('2026-11-20')).toEqual({ recordatorio: null, avisoDeuda: '2026-11' });
    expect(tareasDelDia('2026-11-17')).toEqual({ recordatorio: null, avisoDeuda: null });
  });

  it('pasa de diciembre a enero y nombra los meses', () => {
    expect(periodoSiguiente('2026-12')).toBe('2027-01');
    expect(nombrePeriodo('2026-09')).toBe('Septiembre 2026');
  });

  it('usa la fecha de Argentina', () => {
    expect(hoyArgentina(new Date('2026-11-17T02:00:00Z'))).toBe('2026-11-16');
  });
});

describe('estadoFactura', () => {
  const f = { total: 100, vence: '2026-11-15' };
  it('pagada, incompleta, pendiente o vencida', () => {
    expect(estadoFactura({ ...f, pagado: 100 }, '2026-12-01')).toBe('Pagada');
    expect(estadoFactura({ ...f, pagado: 40 }, '2026-11-10')).toBe('Pago incompleto');
    expect(estadoFactura({ ...f, pagado: 40 }, '2026-11-16')).toBe('Pago incompleto (vencida)');
    expect(estadoFactura({ ...f, pagado: 0 }, '2026-11-15')).toBe('Pendiente');
    expect(estadoFactura({ ...f, pagado: 0 }, '2026-11-16')).toBe('Vencida');
  });
});

describe('validarPago (solo transferencia, con comprobante)', () => {
  const itemsFactura = [
    { id: 1, descripcion: 'Cuota mensual', pago_id: null },
    { id: 2, descripcion: 'Fútbol', pago_id: 9 },
  ];
  const base = { itemIds: [1], itemsFactura, numeroOperacion: 'OP12345', fechaTransferencia: '2026-11-10', comprobante: pdf, hoy: '2026-11-17' };

  it('acepta un pago válido', () => expect(validarPago(base)).toBeNull());
  it('exige elegir ítems', () => expect(validarPago({ ...base, itemIds: [] })).toMatch(/al menos un ítem/));
  it('no permite pagar dos veces un ítem', () => expect(validarPago({ ...base, itemIds: [2] })).toMatch(/ya está pagado/));
  it('no acepta ítems de otra factura', () => expect(validarPago({ ...base, itemIds: [7] })).toMatch(/no pertenece/));
  it('exige el número de operación', () => expect(validarPago({ ...base, numeroOperacion: '' })).toMatch(/número de operación/));
  it('no acepta transferencias con fecha futura', () => expect(validarPago({ ...base, fechaTransferencia: '2026-12-01' })).toMatch(/futura/));
  it('exige el comprobante', () => expect(validarPago({ ...base, comprobante: null })).toMatch(/Adjuntá/));
});

describe('validarComprobante', () => {
  it('acepta PDF e imágenes', () => {
    expect(validarComprobante(pdf)).toBeNull();
    expect(validarComprobante({ ...pdf, tipo: 'image/jpeg' })).toBeNull();
  });
  it('rechaza otros tipos y archivos grandes', () => {
    expect(validarComprobante({ ...pdf, tipo: 'application/zip' })).toMatch(/PDF, PNG o JPG/);
    expect(validarComprobante({ ...pdf, contenido: 'A'.repeat(3_000_000) })).toMatch(/2 MB/);
  });
});

describe('deudaPorTipo', () => {
  it('agrupa la deuda por ítem de pago', () => {
    expect(deudaPorTipo([
      { tipo: 'Cuota', importe: 30000 }, { tipo: 'Deporte', importe: 12000 }, { tipo: 'Cuota', importe: 30000 },
    ])).toEqual([{ tipo: 'Cuota', total: 60000 }, { tipo: 'Deporte', total: 12000 }]);
  });
});
