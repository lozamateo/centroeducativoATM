import { describe, expect, it } from 'vitest';
import { HttpError, toHttpError } from '../../server/errors.js';
import { checkDate, checkDni, checkEmail, clean, requireFields, toId } from '../../server/validation.js';

describe('validaciones de la API', () => {
  it('clean recorta espacios de los textos', () => {
    expect(clean({ nombre: '  Tomás ', edad: 10 })).toEqual({ nombre: 'Tomás', edad: 10 });
  });

  it('requireFields informa los campos faltantes', () => {
    expect(() => requireFields({ nombre: 'Ana', dni: '' }, ['nombre', 'dni', 'email'])).toThrow('Faltan campos obligatorios: dni, email.');
  });

  it('checkEmail rechaza emails inválidos', () => {
    expect(() => checkEmail('tutor@educar.com')).not.toThrow();
    expect(() => checkEmail('tutor@educar')).toThrow(HttpError);
  });

  it('checkDni acepta 7 a 9 dígitos', () => {
    expect(() => checkDni('45123456')).not.toThrow();
    expect(() => checkDni('123')).toThrow('El DNI debe tener entre 7 y 9 números.');
  });

  it('checkDate exige formato AAAA-MM-DD', () => {
    expect(() => checkDate('2027-03-01', 'fecha')).not.toThrow();
    expect(() => checkDate('01/03/2027', 'fecha')).toThrow('El campo fecha debe tener formato AAAA-MM-DD.');
  });

  it('toId solo acepta enteros positivos', () => {
    expect(toId('7')).toBe(7);
    expect(() => toId('abc')).toThrow(HttpError);
    expect(() => toId(-1)).toThrow(HttpError);
  });
});

describe('toHttpError', () => {
  it('traduce las reglas de negocio de los triggers (P0001) a 400', () => {
    const error = toHttpError({ code: 'P0001', message: 'El alumno no tiene apto físico vigente.' });
    expect(error.status).toBe(400);
    expect(error.message).toBe('El alumno no tiene apto físico vigente.');
  });

  it('traduce restricciones únicas conocidas a 409 con mensaje claro', () => {
    const error = toHttpError({ code: '23505', constraint: 'matriculas_una_por_ciclo' });
    expect(error.status).toBe(409);
    expect(error.message).toBe('El alumno ya tiene una matrícula en este ciclo lectivo.');
  });
});
