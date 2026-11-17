// Rutas publicas: sitio institucional, login y verificacion de credencial QR.
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as academico from '../services/academicoService.js';
import * as auth from '../services/authService.js';
import * as contenido from '../services/contenidoService.js';
import * as deportes from '../services/deportesService.js';
import * as inscripciones from '../services/inscripcionService.js';
import * as notificaciones from '../services/notificacionesService.js';
import * as salud from '../services/saludService.js';
import { clean, requireFields } from '../validation.js';

const router = Router();

router.get('/health', (_req, res) => res.json({ ok: true, servicio: 'Educar para Transformar API' }));

router.post('/auth/login', async (req, res) => {
  const body = clean(req.body);
  requireFields(body, ['email', 'password']);
  res.json(await auth.login(body.email, body.password));
});

router.get('/auth/me', authenticate, async (req, res) => res.json(await auth.perfil(req.usuario.id)));

// Recuperar contraseña (el código llega a la bandeja de correos simulada) y cambiarla con sesión iniciada.
router.post('/auth/recuperar', async (req, res) => {
  const body = clean(req.body);
  requireFields(body, ['email']);
  res.json(await auth.solicitarRecuperacion(body.email));
});
router.post('/auth/restablecer', async (req, res) => {
  const body = clean(req.body);
  requireFields(body, ['email', 'codigo', 'password']);
  res.json(await auth.restablecer(body.email, body.codigo, body.password));
});
router.post('/auth/cambiar-password', authenticate, async (req, res) => {
  requireFields(req.body ?? {}, ['actual', 'nueva']);
  res.json(await auth.cambiarPassword(req.usuario.id, req.body.actual, req.body.nueva));
});

router.get('/niveles', async (_req, res) => res.json(await academico.listarNiveles()));
router.get('/noticias', async (_req, res) => res.json(await contenido.listarNoticias()));
router.get('/deportes', async (_req, res) => res.json(await deportes.listarComisiones()));
router.get('/recorridos', async (_req, res) => res.json(await inscripciones.listarRecorridos()));

router.post('/contacto', async (req, res) => res.status(201).json(await contenido.enviarContacto(clean(req.body))));
router.post('/solicitudes', async (req, res) => res.status(201).json(await contenido.enviarSolicitud(clean(req.body))));

router.get('/opiniones', async (_req, res) => res.json(await contenido.listarOpiniones()));
router.post('/opiniones', async (req, res) => res.status(201).json(await contenido.crearOpinion(clean(req.body))));
router.get('/empleos', async (_req, res) => res.json(await contenido.listarBusquedas()));
router.post('/postulaciones', async (req, res) => res.status(201).json(await contenido.postular(clean(req.body))));

// Tarea diaria (Vercel Cron): el último día hábil envía el recordatorio y el día 20 el aviso de deuda.
// Vercel manda "Authorization: Bearer <CRON_SECRET>"; sin esa variable configurada la ruta no hace nada.
router.get('/cron/diario', async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) return res.status(503).json({ error: 'Falta configurar CRON_SECRET.' });
  if (req.headers.authorization !== `Bearer ${secret}`) return res.status(401).json({ error: 'No autorizado.' });
  res.json(await notificaciones.ejecutarTareasDiarias());
});

router.get('/credencial/:token', async (req, res) => res.json(await salud.verificarCredencial(req.params.token)));

export default router;
