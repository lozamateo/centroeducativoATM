import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'node:url';
import { databaseMode, db, initializeDatabase } from './database.js';

const app = express();
const PORT = process.env.PORT ?? 3001;
let databaseInitializationError;
const databaseReady = initializeDatabase().catch((error) => {
  databaseInitializationError = error;
});

app.use(cors());
app.use(express.json());

app.use(async (_req, res, next) => {
  try {
    await databaseReady;
    if (databaseInitializationError) throw databaseInitializationError;
    next();
  } catch (error) {
    sendDbError(res, error);
  }
});

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneCharactersRegex = /^[0-9+()\s-]+$/;
const enrollmentLevels = new Set(['Nivel Inicial', 'Nivel Primario', 'Nivel Secundario']);
const employmentPositions = new Set([
  'Docente de Nivel Inicial',
  'Docente de Nivel Primario',
  'Profesores de Nivel Secundario',
  'Personal Administrativo',
]);

function today() {
  return new Date().toISOString().slice(0, 10);
}

function sendDbError(res, error) {
  res.status(500).json({ error: 'Error de base de datos.', detalle: error.message });
}

function requireFields(body, fields) {
  return fields.filter((field) => {
    const value = body[field];
    return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
  });
}

function normalizeBody(body) {
  return Object.fromEntries(
    Object.entries(body).map(([field, value]) => [field, typeof value === 'string' ? value.trim() : value]),
  );
}

function isValidPhone(value) {
  const digitCount = value.replace(/\D/g, '').length;
  return phoneCharactersRegex.test(value) && digitCount >= 7 && digitCount <= 15;
}

function isValidHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function selectFields(body, allowedFields) {
  return allowedFields.reduce((data, field) => {
    if (body[field] !== undefined) data[field] = body[field];
    return data;
  }, {});
}

async function insertRecord(table, data) {
  if (table === 'cursos' && (await db.hasColumn(table, 'nombre')) && !data.nombre) {
    data.nombre = [data.anio, data.division].filter(Boolean).join(' ') || data.nivel;
  }
  if (table === 'servicios' && (await db.hasColumn(table, 'icono')) && !data.icono) {
    data.icono = 'school';
  }
  if (table === 'instalaciones' && (await db.hasColumn(table, 'imagen_url')) && !data.imagen_url) {
    data.imagen_url = 'https://images.unsplash.com/photo-1586144131462-fa2a2b6d070c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=900';
  }

  return db.insert(table, data);
}

async function updateRecord(table, id, data) {
  if (table === 'cursos' && (await db.hasColumn(table, 'nombre')) && (data.anio || data.division)) {
    const current = (await getById(table, id)) ?? {};
    data.nombre = [data.anio ?? current.anio, data.division ?? current.division].filter(Boolean).join(' ') || (data.nivel ?? current.nivel);
  }

  const result = await db.update(table, id, data);
  return result.changes;
}

async function getById(table, id) {
  return db.get(`SELECT * FROM ${table} WHERE id = ?`, [id]);
}

function crudRoutes({ basePath, table, allowedFields, requiredFields, orderBy = 'id DESC', softDeleteField }) {
  app.get(basePath, async (_req, res) => {
    try {
      res.json(await db.all(`SELECT * FROM ${table} ORDER BY ${orderBy}`));
    } catch (error) {
      sendDbError(res, error);
    }
  });

  app.get(`${basePath}/:id`, async (req, res) => {
    try {
      const record = await getById(table, req.params.id);
      if (!record) return res.status(404).json({ error: 'Registro no encontrado.' });
      res.json(record);
    } catch (error) {
      sendDbError(res, error);
    }
  });

  app.post(basePath, async (req, res) => {
    const missing = requireFields(req.body, requiredFields);
    if (missing.length > 0) {
      return res.status(400).json({ error: `Faltan campos obligatorios: ${missing.join(', ')}.` });
    }

    try {
      const data = selectFields(req.body, allowedFields);
      const id = await insertRecord(table, data);
      res.status(201).json(await getById(table, id));
    } catch (error) {
      sendDbError(res, error);
    }
  });

  app.put(`${basePath}/:id`, async (req, res) => {
    try {
      const data = selectFields(req.body, allowedFields);
      const changes = await updateRecord(table, req.params.id, data);
      if (!changes) return res.status(404).json({ error: 'Registro no encontrado o sin cambios.' });
      res.json(await getById(table, req.params.id));
    } catch (error) {
      sendDbError(res, error);
    }
  });

  app.delete(`${basePath}/:id`, async (req, res) => {
    try {
      const result = softDeleteField
        ? await db.run(`UPDATE ${table} SET ${softDeleteField} = ? WHERE id = ?`, ['inactivo', req.params.id])
        : await db.run(`DELETE FROM ${table} WHERE id = ?`, [req.params.id]);

      if (!result.changes) return res.status(404).json({ error: 'Registro no encontrado.' });
      res.json({ ok: true });
    } catch (error) {
      sendDbError(res, error);
    }
  });
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', proyecto: 'Educar para Transformar', database: databaseMode });
});

app.get('/api/niveles', async (_req, res) => {
  try {
    res.json(await db.all('SELECT * FROM niveles_educativos ORDER BY id'));
  } catch (error) {
    sendDbError(res, error);
  }
});

crudRoutes({
  basePath: '/api/alumnos',
  table: 'alumnos',
  allowedFields: ['nombre', 'apellido', 'dni', 'fecha_nacimiento', 'nivel', 'curso', 'division', 'tutor_nombre', 'tutor_email', 'tutor_telefono', 'estado'],
  requiredFields: ['nombre', 'apellido', 'nivel'],
  orderBy: 'created_at DESC, id DESC',
  softDeleteField: 'estado',
});

crudRoutes({
  basePath: '/api/docentes',
  table: 'docentes',
  allowedFields: ['nombre', 'apellido', 'dni', 'email', 'telefono', 'especialidad', 'estado'],
  requiredFields: ['nombre', 'apellido', 'email', 'especialidad'],
  orderBy: 'created_at DESC, id DESC',
  softDeleteField: 'estado',
});

crudRoutes({
  basePath: '/api/cursos',
  table: 'cursos',
  allowedFields: ['nivel', 'anio', 'division', 'turno', 'descripcion'],
  requiredFields: ['nivel', 'anio', 'turno'],
  orderBy: 'nivel, anio, division',
});

crudRoutes({
  basePath: '/api/asignaciones-docentes',
  table: 'asignaciones_docentes',
  allowedFields: ['docente_id', 'curso_id', 'materia', 'dia', 'horario'],
  requiredFields: ['docente_id', 'curso_id', 'materia'],
  orderBy: 'id DESC',
});

crudRoutes({
  basePath: '/api/servicios',
  table: 'servicios',
  allowedFields: ['nombre', 'descripcion', 'tipo', 'disponible', 'icono'],
  requiredFields: ['nombre', 'descripcion'],
  orderBy: 'id',
});

crudRoutes({
  basePath: '/api/instalaciones',
  table: 'instalaciones',
  allowedFields: ['nombre', 'descripcion', 'tipo', 'disponible', 'imagen_url'],
  requiredFields: ['nombre', 'descripcion'],
  orderBy: 'id',
});

app.get('/api/noticias', async (req, res) => {
  try {
    const where = req.query.all === '1' ? '' : 'WHERE visible = 1';
    res.json(await db.all(`SELECT * FROM noticias ${where} ORDER BY fecha_publicacion DESC, id DESC`));
  } catch (error) {
    sendDbError(res, error);
  }
});

app.get('/api/noticias/:id', async (req, res) => {
  try {
    const noticia = await getById('noticias', req.params.id);
    if (!noticia) return res.status(404).json({ error: 'Noticia no encontrada.' });
    res.json(noticia);
  } catch (error) {
    sendDbError(res, error);
  }
});

app.post('/api/noticias', async (req, res) => {
  const missing = requireFields(req.body, ['titulo', 'descripcion', 'tipo']);
  if (missing.length > 0) return res.status(400).json({ error: `Faltan campos obligatorios: ${missing.join(', ')}.` });

  try {
    const id = await insertRecord('noticias', {
      titulo: req.body.titulo,
      descripcion: req.body.descripcion,
      contenido: req.body.contenido ?? req.body.descripcion,
      fecha_publicacion: req.body.fecha_publicacion ?? today(),
      tipo: req.body.tipo,
      visible: req.body.visible ?? 1,
      imagen_url: req.body.imagen_url ?? '',
    });
    res.status(201).json(await getById('noticias', id));
  } catch (error) {
    sendDbError(res, error);
  }
});

app.put('/api/noticias/:id', async (req, res) => {
  try {
    const data = selectFields(req.body, ['titulo', 'descripcion', 'contenido', 'fecha_publicacion', 'tipo', 'visible', 'imagen_url']);
    const changes = await updateRecord('noticias', req.params.id, data);
    if (!changes) return res.status(404).json({ error: 'Noticia no encontrada o sin cambios.' });
    res.json(await getById('noticias', req.params.id));
  } catch (error) {
    sendDbError(res, error);
  }
});

app.delete('/api/noticias/:id', async (req, res) => {
  try {
    const result = await db.run('UPDATE noticias SET visible = 0 WHERE id = ?', [req.params.id]);
    if (!result.changes) return res.status(404).json({ error: 'Noticia no encontrada.' });
    res.json({ ok: true });
  } catch (error) {
    sendDbError(res, error);
  }
});

app.get('/api/opiniones', async (req, res) => {
  try {
    const where = req.query.all === '1' ? '' : "WHERE estado_moderacion = 'visible' AND visible = 1";
    res.json(await db.all(`SELECT * FROM opiniones_web ${where} ORDER BY fecha_publicacion DESC, id DESC`));
  } catch (error) {
    sendDbError(res, error);
  }
});

app.post('/api/opiniones', async (req, res) => {
  const { autor_anonimo, comentario } = normalizeBody(req.body);
  if (!autor_anonimo || !comentario) {
    return res.status(400).json({ error: 'Autor y comentario son obligatorios.' });
  }

  try {
    const id = await insertRecord('opiniones_web', {
      autor_anonimo,
      comentario,
      estado_moderacion: 'pendiente',
      visible: 0,
    });
    res.status(201).json(await getById('opiniones_web', id));
  } catch (error) {
    sendDbError(res, error);
  }
});

app.put('/api/opiniones/:id/moderar', async (req, res) => {
  try {
    const estado = req.body.estado_moderacion ?? req.body.estado ?? 'visible';
    const visible = estado === 'visible' ? 1 : 0;
    const result = await db.run(
      'UPDATE opiniones_web SET estado_moderacion = ?, visible = ? WHERE id = ?',
      [estado, visible, req.params.id],
    );
    if (!result.changes) return res.status(404).json({ error: 'Opinion no encontrada.' });
    res.json(await getById('opiniones_web', req.params.id));
  } catch (error) {
    sendDbError(res, error);
  }
});

app.get('/api/solicitudes-inscripcion', async (_req, res) => {
  try {
    res.json(await db.all('SELECT * FROM solicitudes_inscripcion ORDER BY fecha_solicitud DESC, id DESC'));
  } catch (error) {
    sendDbError(res, error);
  }
});

app.post('/api/solicitudes-inscripcion', async (req, res) => {
  const data = normalizeBody(req.body);
  const missing = requireFields(data, ['nombre_tutor', 'nombre_aspirante', 'nivel_solicitado', 'email_contacto', 'telefono', 'mensaje']);
  if (missing.length > 0) return res.status(400).json({ error: `Faltan campos obligatorios: ${missing.join(', ')}.` });
  if (!emailRegex.test(data.email_contacto)) return res.status(400).json({ error: 'El email de contacto no tiene un formato valido.' });
  if (!isValidPhone(data.telefono)) return res.status(400).json({ error: 'El telefono debe tener entre 7 y 15 digitos y solo puede incluir +, espacios, guiones o parentesis.' });
  if (!enrollmentLevels.has(data.nivel_solicitado)) return res.status(400).json({ error: 'El nivel solicitado no es valido.' });
  if (data.mensaje.length < 10) return res.status(400).json({ error: 'El mensaje debe tener al menos 10 caracteres.' });

  try {
    const id = await insertRecord('solicitudes_inscripcion', {
      nombre_tutor: data.nombre_tutor,
      nombre_aspirante: data.nombre_aspirante,
      nivel_solicitado: data.nivel_solicitado,
      email_contacto: data.email_contacto,
      telefono: data.telefono,
      mensaje: data.mensaje,
    });
    res.status(201).json(await getById('solicitudes_inscripcion', id));
  } catch (error) {
    sendDbError(res, error);
  }
});

app.put('/api/solicitudes-inscripcion/:id/estado', async (req, res) => {
  try {
    const estado = req.body.estado_tramite ?? req.body.estado ?? 'en revision';
    const result = await db.run('UPDATE solicitudes_inscripcion SET estado_tramite = ? WHERE id = ?', [estado, req.params.id]);
    if (!result.changes) return res.status(404).json({ error: 'Solicitud no encontrada.' });
    res.json(await getById('solicitudes_inscripcion', req.params.id));
  } catch (error) {
    sendDbError(res, error);
  }
});

async function getPostulaciones(_req, res) {
  try {
    res.json(await db.all('SELECT * FROM postulaciones_empleo ORDER BY fecha_recepcion DESC, id DESC'));
  } catch (error) {
    sendDbError(res, error);
  }
}

async function createPostulacion(req, res) {
  const data = normalizeBody(req.body);
  const missing = requireFields(data, ['nombre_candidato', 'email', 'telefono', 'puesto_interes', 'enlace_cv', 'mensaje']);
  if (missing.length > 0) return res.status(400).json({ error: `Faltan campos obligatorios: ${missing.join(', ')}.` });
  if (!emailRegex.test(data.email)) return res.status(400).json({ error: 'El email no tiene un formato valido.' });
  if (!isValidPhone(data.telefono)) return res.status(400).json({ error: 'El telefono debe tener entre 7 y 15 digitos y solo puede incluir +, espacios, guiones o parentesis.' });
  if (!employmentPositions.has(data.puesto_interes)) return res.status(400).json({ error: 'El puesto de interes no es valido.' });
  if (!isValidHttpUrl(data.enlace_cv)) return res.status(400).json({ error: 'El enlace al CV debe comenzar con http:// o https://.' });
  if (data.mensaje.length < 20) return res.status(400).json({ error: 'El mensaje de presentacion debe tener al menos 20 caracteres.' });

  try {
    const id = await insertRecord('postulaciones_empleo', {
      nombre_candidato: data.nombre_candidato,
      email: data.email,
      telefono: data.telefono,
      puesto_interes: data.puesto_interes,
      enlace_cv: data.enlace_cv,
      mensaje: data.mensaje,
      estado: 'recibida',
    });
    res.status(201).json(await getById('postulaciones_empleo', id));
  } catch (error) {
    sendDbError(res, error);
  }
}

app.get('/api/postulaciones', getPostulaciones);
app.get('/api/postulaciones-empleo', getPostulaciones);
app.post('/api/postulaciones', createPostulacion);
app.post('/api/postulaciones-empleo', createPostulacion);

app.put('/api/postulaciones/:id/estado', async (req, res) => {
  try {
    const estado = req.body.estado ?? 'en revision';
    const result = await db.run('UPDATE postulaciones_empleo SET estado = ? WHERE id = ?', [estado, req.params.id]);
    if (!result.changes) return res.status(404).json({ error: 'Postulacion no encontrada.' });
    res.json(await getById('postulaciones_empleo', req.params.id));
  } catch (error) {
    sendDbError(res, error);
  }
});

async function getUsuarios(_req, res) {
  try {
    res.json(await db.all('SELECT id, nombre, nombre_usuario, email, rol, estado, created_at FROM usuarios_acceso ORDER BY rol, id'));
  } catch (error) {
    sendDbError(res, error);
  }
}

app.get('/api/usuarios', getUsuarios);
app.get('/api/usuarios-acceso', getUsuarios);

app.post('/api/usuarios', async (req, res) => {
  const missing = requireFields(req.body, ['nombre', 'email', 'password_demo', 'rol']);
  if (missing.length > 0) return res.status(400).json({ error: `Faltan campos obligatorios: ${missing.join(', ')}.` });
  if (!emailRegex.test(req.body.email)) return res.status(400).json({ error: 'Email invalido.' });

  try {
    const id = await insertRecord('usuarios_acceso', {
      nombre: req.body.nombre,
      nombre_usuario: req.body.nombre_usuario ?? req.body.email.split('@')[0],
      email: req.body.email,
      password_demo: req.body.password_demo,
      rol: req.body.rol,
      estado: req.body.estado ?? 'activo',
      referencia_id: req.body.referencia_id ?? null,
    });
    const { password_demo, ...usuario } = await getById('usuarios_acceso', id);
    res.status(201).json(usuario);
  } catch (error) {
    sendDbError(res, error);
  }
});

app.put('/api/usuarios/:id', async (req, res) => {
  try {
    const data = selectFields(req.body, ['nombre', 'nombre_usuario', 'email', 'password_demo', 'rol', 'estado', 'referencia_id']);
    const changes = await updateRecord('usuarios_acceso', req.params.id, data);
    if (!changes) return res.status(404).json({ error: 'Usuario no encontrado o sin cambios.' });
    const { password_demo, ...usuario } = await getById('usuarios_acceso', req.params.id);
    res.json(usuario);
  } catch (error) {
    sendDbError(res, error);
  }
});

app.post('/api/login-demo', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email y password son obligatorios.' });

  try {
    const user = await db.get(
      "SELECT * FROM usuarios_acceso WHERE email = ? AND password_demo = ? AND estado = 'activo'",
      [email, password],
    );

    if (!user) return res.status(401).json({ error: 'Credenciales demo invalidas.' });
    const { password_demo, ...safeUser } = user;
    res.json({ usuario: safeUser });
  } catch (error) {
    sendDbError(res, error);
  }
});

crudRoutes({
  basePath: '/api/actividades',
  table: 'actividades_escolares',
  allowedFields: ['titulo', 'descripcion', 'nivel', 'fecha', 'visible'],
  requiredFields: ['titulo', 'descripcion', 'nivel', 'fecha'],
  orderBy: 'fecha ASC, id DESC',
});

crudRoutes({
  basePath: '/api/galeria',
  table: 'galeria_imagenes',
  allowedFields: ['titulo', 'descripcion', 'url_imagen', 'categoria', 'visible'],
  requiredFields: ['titulo', 'url_imagen'],
  orderBy: 'id DESC',
});

app.post('/api/contacto', async (req, res) => {
  const missing = requireFields(req.body, ['nombre', 'email', 'mensaje']);
  if (missing.length > 0) return res.status(400).json({ error: `Faltan campos obligatorios: ${missing.join(', ')}.` });
  if (!emailRegex.test(req.body.email)) return res.status(400).json({ error: 'Email invalido.' });

  try {
    const id = await insertRecord('contacto_mensajes', {
      nombre: req.body.nombre,
      email: req.body.email,
      asunto: req.body.asunto ?? 'Consulta web',
      mensaje: req.body.mensaje,
    });
    res.status(201).json(await getById('contacto_mensajes', id));
  } catch (error) {
    sendDbError(res, error);
  }
});

app.get('/api/contacto', async (_req, res) => {
  try {
    res.json(await db.all('SELECT * FROM contacto_mensajes ORDER BY fecha_recepcion DESC, id DESC'));
  } catch (error) {
    sendDbError(res, error);
  }
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada.' });
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  app.listen(PORT, () => {
    console.log(`API Educar para Transformar disponible en http://localhost:${PORT}`);
  });
}

export default app;
