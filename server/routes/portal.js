// Portales de autogestion: familias (TUTOR), docentes (DOCENTE) y alumnos (ALUMNO).
import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import * as facturacion from '../services/facturacionService.js';
import * as inscripciones from '../services/inscripcionService.js';
import * as notificaciones from '../services/notificacionesService.js';
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

// Pagos (simulados): estado de cuenta, facturas, pago por transferencia con comprobante y correos recibidos.
const filtrosPeriodo = (req) => ({ desde: req.query.desde || undefined, hasta: req.query.hasta || undefined });

familia.get('/hijos/:alumnoId/cuenta', async (req, res) => res.json(await facturacion.cuentaAlumno(req.alumnoId, filtrosPeriodo(req))));
familia.post('/hijos/:alumnoId/facturas/:facturaId/pagos', async (req, res) =>
  res.status(201).json(await facturacion.pagar(req.usuario.id, req.alumnoId, toId(req.params.facturaId, 'facturaId'), req.body ?? {})),
);
familia.get('/hijos/:alumnoId/comprobantes/:id', async (req, res) =>
  res.json(await facturacion.comprobante(toId(req.params.id), [req.alumnoId])),
);
familia.get('/facturas/:id', async (req, res) => {
  const factura = await facturacion.factura(toId(req.params.id));
  await portal.verificarHijo(req.usuario.id, factura.alumno_id);
  res.json(factura);
});
familia.get('/correos', async (req, res) => res.json(await notificaciones.deUsuario(req.usuario.id)));

router.use('/familia', familia);

// ----- Docentes -----
router.get('/docente', requireRole('DOCENTE'), async (req, res) => res.json(await portal.docente(req.usuario.id)));

// ----- Alumnos -----
router.get('/alumno', requireRole('ALUMNO'), async (req, res) => res.json(await portal.alumnoPropio(req.usuario.id)));
router.get('/alumno/cuenta', requireRole('ALUMNO'), async (req, res) =>
  res.json(await facturacion.cuentaAlumno((await portal.alumnoPropio(req.usuario.id)).alumno_id, filtrosPeriodo(req))),
);

export default router;
