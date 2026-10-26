// Rutas de enfermeria: ficha medica y apto fisico (RF-22).
import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import * as salud from '../services/saludService.js';
import { clean, toId } from '../validation.js';

const router = Router();
router.use(authenticate);

router.get('/fichas', requireRole('ENFERMERIA', 'ADMIN'), async (req, res) =>
  res.json(await salud.listarFichas({ buscar: req.query.buscar, estado: req.query.estado })),
);

router.get('/fichas/:alumnoId', requireRole('ENFERMERIA'), async (req, res) =>
  res.json(await salud.obtenerFicha(toId(req.params.alumnoId, 'alumnoId'))),
);

router.put('/fichas/:alumnoId', requireRole('ENFERMERIA'), async (req, res) =>
  res.json(await salud.guardarFicha(req.usuario.id, toId(req.params.alumnoId, 'alumnoId'), clean(req.body))),
);

export default router;
