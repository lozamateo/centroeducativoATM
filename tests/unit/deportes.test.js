import { describe, expect, it } from 'vitest';
import { aptoVigente, motivoNoDisponible, seSuperponen } from '../../server/rules/deportes.js';

const futbol = {
  id: 10,
  deporte_id: 1,
  cupo: 20,
  inscriptos: 5,
  horarios: [{ dia_semana: 2, hora_inicio: '14:00', hora_fin: '15:30' }],
};

// Fila inscripción × horario de un deporte en el que el alumno ya está inscripto.
const inscripto = (id, comision_id, deporte_id, dia_semana, hora_inicio, hora_fin) => ({
  id,
  comision_id,
  deporte_id,
  dia_semana,
  hora_inicio,
  hora_fin,
});

const habilitado = { apto: true, cantidadActual: 0 };

describe('seSuperponen', () => {
  it('detecta franjas que se pisan el mismo día', () => {
    expect(seSuperponen({ dia_semana: 2, hora_inicio: '14:00', hora_fin: '15:30' }, { dia_semana: 2, hora_inicio: '15:00', hora_fin: '16:00' })).toBe(true);
  });

  it('acepta franjas consecutivas (una termina cuando empieza la otra)', () => {
    expect(seSuperponen({ dia_semana: 2, hora_inicio: '14:00', hora_fin: '15:30' }, { dia_semana: 2, hora_inicio: '15:30', hora_fin: '17:00' })).toBe(false);
  });

  it('acepta el mismo horario en distinto día', () => {
    expect(seSuperponen({ dia_semana: 2, hora_inicio: '14:00', hora_fin: '15:30' }, { dia_semana: 4, hora_inicio: '14:00', hora_fin: '15:30' })).toBe(false);
  });
});

describe('aptoVigente', () => {
  it('es vigente si vence hoy o después', () => {
    expect(aptoVigente('2026-10-27', '2026-10-27')).toBe(true);
    expect(aptoVigente('2027-03-01', '2026-10-27')).toBe(true);
  });

  it('no es vigente si venció o no existe', () => {
    expect(aptoVigente('2026-10-26', '2026-10-27')).toBe(false);
    expect(aptoVigente(null, '2026-10-27')).toBe(false);
  });
});

describe('motivoNoDisponible (RF-11 / RF-22)', () => {
  it('permite inscribir a un alumno con apto y sin deportes', () => {
    expect(motivoNoDisponible(futbol, [], habilitado)).toBeNull();
  });

  it('bloquea si el apto físico está vencido', () => {
    expect(motivoNoDisponible(futbol, [], { apto: false, cantidadActual: 0 })).toBe('Apto físico vencido o ausente');
  });

  it('bloquea si ya está inscripto en la comisión', () => {
    const actuales = [inscripto(1, 10, 1, 2, '14:00', '15:30')];
    expect(motivoNoDisponible(futbol, actuales, { apto: true, cantidadActual: 1 })).toBe('Ya inscripto');
  });

  it('bloquea otra comisión del mismo deporte', () => {
    const actuales = [inscripto(1, 11, 1, 5, '09:00', '10:00')];
    expect(motivoNoDisponible(futbol, actuales, { apto: true, cantidadActual: 1 })).toBe('Ya inscripto en este deporte');
  });

  it('bloquea un tercer deporte', () => {
    const actuales = [inscripto(1, 20, 2, 1, '09:00', '10:00'), inscripto(2, 30, 3, 3, '09:00', '10:00')];
    expect(motivoNoDisponible(futbol, actuales, { apto: true, cantidadActual: 2 })).toBe('Máximo de 2 deportes alcanzado');
  });

  it('bloquea si la comisión no tiene cupo', () => {
    expect(motivoNoDisponible({ ...futbol, inscriptos: 20 }, [], habilitado)).toBe('Sin cupo');
  });

  it('bloquea si se superpone con otro deporte', () => {
    const actuales = [inscripto(1, 20, 2, 2, '15:00', '16:00')];
    expect(motivoNoDisponible(futbol, actuales, { apto: true, cantidadActual: 1 })).toBe('Se superpone con otro deporte');
  });

  // Prueba de regresión: un deporte con dos horarios cuenta como UNA inscripción.
  // Si se contaran filas (inscripción × horario) en lugar de inscripciones, el alumno
  // con un solo deporte de dos días quedaría bloqueado por "máximo de 2".
  it('regresión: un deporte con dos horarios cuenta como un solo deporte', () => {
    const actuales = [inscripto(1, 20, 2, 1, '09:00', '10:00'), inscripto(1, 20, 2, 3, '09:00', '10:00')];
    const cantidadActual = new Set(actuales.map((row) => row.id)).size;
    expect(cantidadActual).toBe(1);
    expect(motivoNoDisponible(futbol, actuales, { apto: true, cantidadActual })).toBeNull();
  });
});
