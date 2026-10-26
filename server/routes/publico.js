// Rutas publicas: sitio institucional, login y verificacion de credencial QR.
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as academico from '../services/academicoService.js';
import * as auth from '../services/authService.js';
import * as contenido from '../services/contenidoService.js';
import * as deportes from '../services/deportesService.js';
import * as inscripciones from '../services/inscripcionService.js';
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

router.get('/niveles', async (_req, res) => res.json(await academico.listarNiveles()));
router.get('/noticias', async (_req, res) => res.json(await contenido.listarNoticias()));
router.get('/deportes', async (_req, res) => res.json(await deportes.listarComisiones()));
router.get('/recorridos', async (_req, res) => res.json(await inscripciones.listarRecorridos()));

router.post('/contacto', async (req, res) => res.status(201).json(await contenido.enviarContacto(clean(req.body))));
router.post('/solicitudes', async (req, res) => res.status(201).json(await contenido.enviarSolicitud(clean(req.body))));

router.get('/credencial/:token', async (req, res) => res.json(await salud.verificarCredencial(req.params.token)));

export default router;
