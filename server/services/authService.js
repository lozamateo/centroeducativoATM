import bcrypt from 'bcryptjs';
import { randomInt } from 'node:crypto';
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

// ----- Recuperar y cambiar contraseña -----
// El código se "envía" a la bandeja de correos simulada del sistema (trabajo práctico, sin mails reales).
// El código se lee en "Correos enviados" del administrador. Solo en desarrollo local, con
// MOSTRAR_CODIGO_RECUPERACION=true, la respuesta lo incluye (nunca activarlo en el sitio publicado).

const MINUTOS_CODIGO = 30;

function validarNueva(password) {
  if (typeof password !== 'string' || password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw new HttpError(400, 'La contraseña nueva debe tener al menos 8 caracteres, con letras y números.');
  }
}

export async function solicitarRecuperacion(email) {
  const mensaje = 'Si el email está registrado, te enviamos un código para restablecer la contraseña.';
  const usuario = await queryOne('select id, nombre, apellido, email from usuarios where lower(email) = lower($1) and activo', [email]);
  if (!usuario) return { mensaje };

  const codigo = String(randomInt(0, 1_000_000)).padStart(6, '0');
  await query('update recuperaciones_password set usado = true where usuario_id = $1 and not usado', [usuario.id]);
  await query(
    `insert into recuperaciones_password (usuario_id, codigo_hash, expira) values ($1, $2, now() + make_interval(mins => $3))`,
    [usuario.id, await bcrypt.hash(codigo, 10), MINUTOS_CODIGO],
  );
  await query(
    `insert into notificaciones (tipo, usuario_id, destinatario_nombre, destinatario_email, asunto, cuerpo)
     values ('Recuperar contraseña', $1, $2, $3, 'Código para restablecer tu contraseña', $4)`,
    [usuario.id, `${usuario.nombre} ${usuario.apellido}`, usuario.email,
      `Hola ${usuario.nombre}:\n\nTu código para restablecer la contraseña es ${codigo}. Vence en ${MINUTOS_CODIGO} minutos.\n\n` +
      'Si no lo pediste, ignorá este mensaje.\n\nEducar para Transformar'],
  );
  return process.env.MOSTRAR_CODIGO_RECUPERACION === 'true' ? { mensaje, codigo_demo: codigo } : { mensaje };
}

export async function restablecer(email, codigo, nueva) {
  validarNueva(nueva);
  const pedido = await queryOne(
    `select r.id, r.codigo_hash, u.id as usuario_id
     from recuperaciones_password r join usuarios u on u.id = r.usuario_id
     where lower(u.email) = lower($1) and not r.usado and r.expira > now()
     order by r.id desc limit 1`,
    [email],
  );
  const invalido = new HttpError(400, 'El código es incorrecto o venció. Pedí uno nuevo.');
  if (!pedido) throw invalido;
  if (!(await bcrypt.compare(String(codigo ?? ''), pedido.codigo_hash))) {
    // Después de 5 intentos fallidos el código deja de servir (evita probar todos los códigos).
    await query('update recuperaciones_password set intentos = intentos + 1, usado = (intentos + 1 >= 5) where id = $1', [pedido.id]);
    throw invalido;
  }
  await query('update recuperaciones_password set usado = true where id = $1', [pedido.id]);
  await query('update usuarios set password_hash = $2, updated_at = now() where id = $1', [pedido.usuario_id, await hashPassword(nueva)]);
  return { mensaje: 'La contraseña se cambió. Ya podés iniciar sesión.' };
}

export async function cambiarPassword(usuarioId, actual, nueva) {
  validarNueva(nueva);
  const usuario = await queryOne('select password_hash from usuarios where id = $1 and activo', [usuarioId]);
  if (!usuario || !(await bcrypt.compare(String(actual ?? ''), usuario.password_hash))) {
    throw new HttpError(400, 'La contraseña actual no es correcta.');
  }
  await query('update usuarios set password_hash = $2, updated_at = now() where id = $1', [usuarioId, await hashPassword(nueva)]);
  return { mensaje: 'Contraseña actualizada.' };
}
