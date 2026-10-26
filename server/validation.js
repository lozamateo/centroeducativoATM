import { badRequest } from './errors.js';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export function clean(body = {}) {
  return Object.fromEntries(
    Object.entries(body).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value]),
  );
}

export function requireFields(body, fields) {
  const missing = fields.filter((field) => body[field] === undefined || body[field] === null || body[field] === '');
  if (missing.length) throw badRequest(`Faltan campos obligatorios: ${missing.join(', ')}.`);
}

export function pick(body, fields) {
  return Object.fromEntries(fields.filter((field) => body[field] !== undefined).map((field) => [field, body[field] === '' ? null : body[field]]));
}

export function checkEmail(value, field = 'email') {
  if (value && !emailRegex.test(value)) throw badRequest(`El campo ${field} no es un email valido.`);
}

export function checkDate(value, field) {
  if (value && !dateRegex.test(value)) throw badRequest(`El campo ${field} debe tener formato AAAA-MM-DD.`);
}

export function checkDni(value) {
  if (value && !/^\d{7,9}$/.test(String(value))) throw badRequest('El DNI debe tener entre 7 y 9 numeros.');
}

export function toId(value, field = 'id') {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw badRequest(`El campo ${field} es invalido.`);
  return id;
}
