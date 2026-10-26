// Portales de autogestion: familias (TUTOR), docentes (DOCENTE) y alumnos (ALUMNO).
import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import * as inscripciones from '../services/inscripcionService.js';
import * as portal from '../services/portalService.js';
import { clean, toId } from '../validation.js';

const router = Router();
router.use(authenticate);

// ----- Familias -----
const familia = Router();
familia.use(requireRole('TUTOR'));

// Todas las rutas /hijos/:alumnoId verifican el vinculo familiar.
familia.param('alumnoId', async (req, _res, next, value) => {
  try {
    req.alumnoId = toId(value, 'alumnoId');
    await portal.verificarHijo(req.usuario.id, req.alumnoId);
    next();
  } catch (error) {
    next(error);
  }
});

familia.get('/hijos', async (req, res) => res.json(await portal.hijos(req.usuario.id)));
familia.get('/hijos/:alumnoId', async (req, res) => res.json(await portal.detalleAlumno(req.alumnoId)));
familia.get('/hijos/:alumnoId/opciones', async (req, res) => res.json(await portal.opcionesInscripcion(req.alumnoId)));

familia.post('/hijos/:alumnoId/matricula', async (req, res) =>
  res.status(201).json(await inscripciones.matricular(req.usuario.id, req.alumnoId, req.body.curso_id)),
);
familia.post('/hijos/:alumnoId/deportes', async (req, res) =>
  res.status(201).json(await inscripciones.inscribirDeporte(req.usuario.id, req.alumnoId, req.body.comision_id)),
);
familia.delete('/hijos/:alumnoId/deportes/:id', async (req, res) =>
  res.json(await inscripciones.bajaDeporte(req.usuario.id, toId(req.params.id), req.alumnoId)),
);
familia.post('/hijos/:alumnoId/transporte', async (req, res) =>
  res.status(201).json(await inscripciones.inscribirTransporte(req.usuario.id, req.alumnoId, clean(req.body))),
);
familia.delete('/hijos/:alumnoId/transporte/:id', async (req, res) =>
  res.json(await inscripciones.bajaTransporte(req.usuario.id, toId(req.params.id), req.alumnoId)),
);
familia.post('/hijos/:alumnoId/comedor', async (req, res) =>
  res.status(201).json(await inscripciones.inscribirComedor(req.usuario.id, req.alumnoId, clean(req.body))),
);
familia.delete('/hijos/:alumnoId/comedor/:id', async (req, res) =>
  res.json(await inscripciones.bajaComedor(req.usuario.id, toId(req.params.id), req.alumnoId)),
);

router.use('/familia', familia);

// ----- Docentes -----
router.get('/docente', requireRole('DOCENTE'), async (req, res) => res.json(await portal.docente(req.usuario.id)));

// ----- Alumnos -----
router.get('/alumno', requireRole('ALUMNO'), async (req, res) => res.json(await portal.alumnoPropio(req.usuario.id)));

export default router;
