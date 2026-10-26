// Legajos de alumnos, tutores (vinculo familiar) y usuarios del sistema (RF-01, RF-07, RF-08).
import { query, queryOne, transaction } from '../db.js';
import { badRequest, notFound } from '../errors.js';
import { checkDate, checkDni, checkEmail, pick, requireFields } from '../validation.js';
import { actualizarGenerico } from './academicoService.js';
import { hashPassword } from './authService.js';

// ----- Alumnos -----

const camposAlumno = ['dni', 'nombre', 'apellido', 'fecha_nacimiento', 'genero', 'direccion', 'nivel_id', 'activo'];

export function listarAlumnos({ buscar, nivel_id } = {}) {
  return query(
    `select a.*, n.nombre as nivel,
            (select c.anio || ' ' || c.division from matriculas m join cursos c on c.id = m.curso_id
              where m.alumno_id = a.id and m.estado <> 'Baja' order by m.ciclo_id desc limit 1) as curso
     from alumnos a
     left join niveles_educativos n on n.id = a.nivel_id
     where ($1::text is null or a.dni like $1 || '%' or (a.apellido || ' ' || a.nombre) ilike '%' || $1 || '%')
       and ($2::int is null or a.nivel_id = $2)
     order by a.apellido, a.nombre`,
    [buscar || null, nivel_id ?? null],
  );
}

export async function obtenerAlumno(id) {
  const alumno = await queryOne(
    'select a.*, n.nombre as nivel from alumnos a left join niveles_educativos n on n.id = a.nivel_id where a.id = $1',
    [id],
  );
  if (!alumno) throw notFound('Alumno no encontrado.');
  alumno.tutores = await query(
    `select t.*, at.parentesco, at.es_responsable, at.autorizado_retiro
     from alumnos_tutores at join tutores t on t.id = at.tutor_id
     where at.alumno_id = $1 order by at.es_responsable desc, t.apellido`,
    [id],
  );
  return alumno;
}

function validarAlumno(body) {
  checkDni(body.dni);
  checkDate(body.fecha_nacimiento, 'fecha_nacimiento');
}

export async function crearAlumno(usuarioId, body) {
  requireFields(body, ['dni', 'nombre', 'apellido', 'fecha_nacimiento', 'nivel_id']);
  validarAlumno(body);
  const data = pick(body, camposAlumno);
  const cols = Object.keys(data);
  return transaction(usuarioId, async (tx) => {
    const alumno = await tx.queryOne(
      `insert into alumnos (${cols.join(', ')}) values (${cols.map((_, i) => `$${i + 1}`).join(', ')}) returning *`,
      Object.values(data),
    );
    // Toda ficha medica nace vacia para que enfermeria la complete.
    await tx.query('insert into fichas_medicas (alumno_id) values ($1)', [alumno.id]);
    return alumno;
  });
}

export function actualizarAlumno(usuarioId, id, body) {
  validarAlumno(body);
  return actualizarGenerico(usuarioId, 'alumnos', id, pick(body, camposAlumno), 'Alumno no encontrado.');
}

export async function eliminarAlumno(usuarioId, id) {
  const row = await transaction(usuarioId, (tx) => tx.queryOne('delete from alumnos where id = $1 returning id', [id]));
  if (!row) throw notFound('Alumno no encontrado.');
}

export async function vincularTutor(usuarioId, alumnoId, body) {
  requireFields(body, ['tutor_id', 'parentesco']);
  return transaction(usuarioId, (tx) =>
    tx.queryOne(
      `insert into alumnos_tutores (alumno_id, tutor_id, parentesco, es_responsable, autorizado_retiro)
       values ($1, $2, $3, coalesce($4, false), coalesce($5, true)) returning *`,
      [alumnoId, body.tutor_id, body.parentesco, body.es_responsable ?? null, body.autorizado_retiro ?? null],
    ),
  );
}

export async function desvincularTutor(usuarioId, alumnoId, tutorId) {
  const row = await transaction(usuarioId, (tx) =>
    tx.queryOne('delete from alumnos_tutores where alumno_id = $1 and tutor_id = $2 returning alumno_id', [alumnoId, tutorId]),
  );
  if (!row) throw notFound('Vinculo no encontrado.');
}

// ----- Tutores -----

const camposTutor = ['dni', 'nombre', 'apellido', 'email', 'telefono', 'direccion', 'ocupacion'];

export function listarTutores({ buscar } = {}) {
  return query(
    `select t.*,
            (select string_agg(a.nombre || ' ' || a.apellido, ', ')
               from alumnos_tutores at join alumnos a on a.id = at.alumno_id where at.tutor_id = t.id) as hijos
     from tutores t
     where ($1::text is null or t.dni like $1 || '%' or (t.apellido || ' ' || t.nombre) ilike '%' || $1 || '%')
     order by t.apellido, t.nombre`,
    [buscar || null],
  );
}

export async function crearTutor(usuarioId, body) {
  requireFields(body, ['dni', 'nombre', 'apellido', 'telefono']);
  checkDni(body.dni);
  checkEmail(body.email);
  const data = pick(body, camposTutor);
  const cols = Object.keys(data);
  return transaction(usuarioId, (tx) =>
    tx.queryOne(
      `insert into tutores (${cols.join(', ')}) values (${cols.map((_, i) => `$${i + 1}`).join(', ')}) returning *`,
      Object.values(data),
    ),
  );
}

export function actualizarTutor(usuarioId, id, body) {
  checkDni(body.dni);
  checkEmail(body.email);
  return actualizarGenerico(usuarioId, 'tutores', id, pick(body, camposTutor), 'Tutor no encontrado.');
}

export async function eliminarTutor(id) {
  const row = await queryOne('delete from tutores where id = $1 returning id', [id]);
  if (!row) throw notFound('Tutor no encontrado.');
}

// ----- Usuarios -----

export function listarRoles() {
  return query('select id, codigo, nombre, descripcion from roles order by id');
}

export function listarUsuarios() {
  return query(
    `select u.id, u.email, u.nombre, u.apellido, u.activo, u.ultimo_acceso, u.created_at,
            r.codigo as rol, r.nombre as rol_nombre,
            coalesce(
              (select 'Alumno: ' || nombre || ' ' || apellido from alumnos where usuario_id = u.id),
              (select 'Tutor: ' || nombre || ' ' || apellido from tutores where usuario_id = u.id),
              (select 'Profesor: ' || nombre || ' ' || apellido from profesores where usuario_id = u.id)
            ) as vinculado_a
     from usuarios u join roles r on r.id = u.rol_id
     order by r.id, u.apellido`,
  );
}

const tablaPorRol = { ALUMNO: 'alumnos', TUTOR: 'tutores', DOCENTE: 'profesores' };

// Crea el usuario y, si corresponde, lo vincula al legajo (alumno, tutor o profesor).
export async function crearUsuario(usuarioId, body) {
  requireFields(body, ['email', 'password', 'nombre', 'apellido', 'rol']);
  checkEmail(body.email);
  if (String(body.password).length < 6) throw badRequest('La contrasena debe tener al menos 6 caracteres.');

  const hash = await hashPassword(body.password);
  return transaction(usuarioId, async (tx) => {
    const rol = await tx.queryOne('select id from roles where codigo = $1', [body.rol]);
    if (!rol) throw badRequest('Rol invalido.');

    const usuario = await tx.queryOne(
      `insert into usuarios (email, password_hash, nombre, apellido, rol_id)
       values (lower($1), $2, $3, $4, $5) returning id, email, nombre, apellido, activo`,
      [body.email, hash, body.nombre, body.apellido, rol.id],
    );

    const tabla = tablaPorRol[body.rol];
    if (tabla && body.vinculo_id) {
      const vinculo = await tx.queryOne(
        `update ${tabla} set usuario_id = $1 where id = $2 and usuario_id is null returning id`,
        [usuario.id, body.vinculo_id],
      );
      if (!vinculo) throw badRequest('El legajo a vincular no existe o ya tiene un usuario.');
    }
    return { ...usuario, rol: body.rol };
  });
}

export async function actualizarUsuario(usuarioId, id, body) {
  checkEmail(body.email);
  return transaction(usuarioId, async (tx) => {
    let rolId = null;
    if (body.rol) {
      const rol = await tx.queryOne('select id from roles where codigo = $1', [body.rol]);
      if (!rol) throw badRequest('Rol invalido.');
      rolId = rol.id;
    }
    const hash = body.password ? await hashPassword(body.password) : null;
    const usuario = await tx.queryOne(
      `update usuarios set
         email = coalesce(lower($2), email), nombre = coalesce($3, nombre), apellido = coalesce($4, apellido),
         activo = coalesce($5, activo), rol_id = coalesce($6, rol_id), password_hash = coalesce($7, password_hash)
       where id = $1 returning id, email, nombre, apellido, activo`,
      [id, body.email || null, body.nombre || null, body.apellido || null, body.activo ?? null, rolId, hash],
    );
    if (!usuario) throw notFound('Usuario no encontrado.');
    return usuario;
  });
}
