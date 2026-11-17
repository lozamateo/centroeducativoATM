import { describe, expect, it } from 'vitest';
import {
  CUOTA_GENERAL, CUOTA_HERMANOS, estadoCuota, esPeriodoValido, hoyArgentina, importeMensual, nombrePeriodo,
  periodos, resumenDeuda, sePuedePagar,
} from '../../server/rules/cuotas.js';

describe('importeMensual', () => {
  it('cobra $40.000 a un alumno sin hermanos en el colegio', () => {
    expect(importeMensual(1)).toBe(CUOTA_GENERAL);
  });

  it('cobra $30.000 por hijo cuando el grupo familiar tiene 2 o más', () => {
    expect(importeMensual(2)).toBe(CUOTA_HERMANOS);
    expect(importeMensual(3)).toBe(CUOTA_HERMANOS);
  });
});

describe('estadoCuota (se paga del 1 al 15)', () => {
  it('una cuota pagada siempre figura como pagada', () => {
    expect(estadoCuota('2026-09', '2026-11-20', true)).toBe('Pagada');
  });

  it('del 1 al 15 del mes en curso está en término', () => {
    expect(estadoCuota('2026-11', '2026-11-01', false)).toBe('En término');
    expect(estadoCuota('2026-11', '2026-11-15', false)).toBe('En término');
  });

  it('después del 15 sin pagar queda vencida', () => {
    expect(estadoCuota('2026-11', '2026-11-16', false)).toBe('Vencida');
    expect(estadoCuota('2026-08', '2026-11-10', false)).toBe('Vencida');
  });

  it('un mes futuro todavía no se puede pagar', () => {
    expect(estadoCuota('2026-12', '2026-11-20', false)).toBe('Próxima');
    expect(sePuedePagar('Próxima')).toBe(false);
    expect(sePuedePagar('Vencida')).toBe(true);
  });
});

describe('períodos', () => {
  it('van de agosto 2026 a diciembre 2027', () => {
    const lista = periodos();
    expect(lista[0]).toBe('2026-08');
    expect(lista.at(-1)).toBe('2027-12');
    expect(lista).toHaveLength(17);
  });

  it('rechaza períodos fuera de rango o mal escritos', () => {
    expect(esPeriodoValido('2026-07')).toBe(false);
    expect(esPeriodoValido('2026-8')).toBe(false);
    expect(esPeriodoValido('2027-03')).toBe(true);
  });

  it('muestra el nombre del mes', () => {
    expect(nombrePeriodo('2026-09')).toBe('Septiembre 2026');
  });

  it('calcula la fecha de hoy en Argentina', () => {
    expect(hoyArgentina(new Date('2026-11-17T02:00:00Z'))).toBe('2026-11-16');
  });
});

describe('resumenDeuda', () => {
  it('informa desde qué mes adeuda y el total', () => {
    const cuotas = [
      { periodo: '2026-08', estado: 'Pagada', importe: 40000 },
      { periodo: '2026-09', estado: 'Vencida', importe: 40000 },
      { periodo: '2026-10', estado: 'Vencida', importe: 40000 },
      { periodo: '2026-11', estado: 'En término', importe: 40000 },
    ];
    expect(resumenDeuda(cuotas)).toEqual({ adeuda_desde: '2026-09', cuotas_vencidas: 2, total_adeudado: 80000 });
  });

  it('sin cuotas vencidas no adeuda', () => {
    expect(resumenDeuda([{ periodo: '2026-08', estado: 'Pagada', importe: 30000 }]).adeuda_desde).toBeNull();
  });
});
