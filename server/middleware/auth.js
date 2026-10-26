// Capa de seguridad: autenticacion JWT y control de acceso por roles (RBAC).
import jwt from 'jsonwebtoken';
import { HttpError, forbidden } from '../errors.js';

const DEV_SECRET = 'solo-para-desarrollo-local';

export function jwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET es obligatoria en produccion.');
  }
  return secret ?? DEV_SECRET;
}

export function signToken(usuario) {
  return jwt.sign(
    { sub: usuario.id, rol: usuario.rol, nombre: `${usuario.nombre} ${usuario.apellido}` },
    jwtSecret(),
    { expiresIn: '8h' },
  );
}

export function authenticate(req, _res, next) {
  const header = req.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new HttpError(401, 'Debe iniciar sesión.'));
  }

  try {
    const payload = jwt.verify(token, jwtSecret());
    req.usuario = { id: Number(payload.sub), rol: payload.rol, nombre: payload.nombre };
    next();
  } catch {
    next(new HttpError(401, 'La sesión expiró o no es válida. Inicie sesión nuevamente.'));
  }
}

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.usuario || !roles.includes(req.usuario.rol)) return next(forbidden());
    next();
  };
}
