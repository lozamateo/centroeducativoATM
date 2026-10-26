import bcrypt from 'bcryptjs';
import { query, queryOne } from '../db.js';
import { HttpError } from '../errors.js';
import { signToken } from '../middleware/auth.js';

const perfilSql = `
  select u.id, u.email, u.nombre, u.apellido, u.activo, u.password_hash, r.codigo as rol, r.nombre as rol_nombre,
         (select id from alumnos where usuario_id = u.id)    as alumno_id,
         (select id from tutores where usuario_id = u.id)    as tutor_id,
         (select id from profesores where usuario_id = u.id) as profesor_id
  from usuarios u
  join roles r on r.id = u.rol_id
`;

function sinHash({ password_hash: _hash, ...usuario }) {
  return usuario;
}

export async function login(email, password) {
  const usuario = await queryOne(`${perfilSql} where lower(u.email) = lower($1)`, [email]);
  const valido = usuario && usuario.activo && (await bcrypt.compare(password, usuario.password_hash));

  if (!valido) throw new HttpError(401, 'Email o contraseña incorrectos.');

  await query('update usuarios set ultimo_acceso = now() where id = $1', [usuario.id]);
  const permisos = await permisosDeRol(usuario.rol);
  return { token: signToken(usuario), usuario: { ...sinHash(usuario), permisos } };
}

export async function perfil(usuarioId) {
  const usuario = await queryOne(`${perfilSql} where u.id = $1 and u.activo`, [usuarioId]);
  if (!usuario) throw new HttpError(401, 'El usuario no existe o esta inactivo.');
  return { ...sinHash(usuario), permisos: await permisosDeRol(usuario.rol) };
}

async function permisosDeRol(rol) {
  const rows = await query(
    `select p.codigo from roles_permisos rp
     join roles r on r.id = rp.rol_id
     join permisos p on p.id = rp.permiso_id
     where r.codigo = $1 order by p.codigo`,
    [rol],
  );
  return rows.map((row) => row.codigo);
}

export function hashPassword(password) {
  return bcrypt.hash(password, 10);
}
