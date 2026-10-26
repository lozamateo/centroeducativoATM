// Rutas de gestion institucional: solo rol ADMIN.
import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import * as academico from '../services/academicoService.js';
import * as contenido from '../services/contenidoService.js';
import * as deportes from '../services/deportesService.js';
import * as inscripciones from '../services/inscripcionService.js';
import * as personas from '../services/personasService.js';
import * as portal from '../services/portalService.js';
import * as reportes from '../services/reporteEngineService.js';
import { clean, toId } from '../validation.js';

const router = Router();
router.use(authenticate, requireRole('ADMIN'));

const id = (req, param = 'id') => toId(req.params[param], param);
const optionalId = (value) => (value ? toId(value) : undefined);
const body = (req) => clean(req.body);
const uid = (req) => req.usuario.id;

// ----- Estructura academica -----
router.get('/ciclos', async (_req, res) => res.json(await academico.listarCiclos()));
router.get('/cursos', async (req, res) =>
  res.json(await academico.listarCursos({ nivel_id: optionalId(req.query.nivel_id), ciclo_id: optionalId(req.query.ciclo_id) })),
);
router.post('/cursos', async (req, res) => res.status(201).json(await academico.crearCurso(uid(req), body(req))));
router.put('/cursos/:id', async (req, res) => res.json(await academico.actualizarCurso(id(req), body(req))));
router.delete('/cursos/:id', async (req, res) => {
  await academico.eliminarCurso(id(req));
  res.status(204).end();
});
router.get('/cursos/:id/materias', async (req, res) => res.json(await academico.materiasDeCurso(id(req))));
router.put('/cursos-materias/:id', async (req, res) =>
  res.json(await academico.asignarProfesor(id(req), optionalId(req.body.profesor_id))),
);

router.get('/materias', async (_req, res) => res.json(await academico.listarMaterias()));
router.post('/materias', async (req, res) => res.status(201).json(await academico.crearMateria(body(req))));
router.delete('/materias/:id', async (req, res) => {
  await academico.eliminarMateria(id(req));
  res.status(204).end();
});

router.get('/profesores', async (_req, res) => res.json(await academico.listarProfesores()));
router.post('/profesores', async (req, res) => res.status(201).json(await academico.crearProfesor(uid(req), body(req))));
router.put('/profesores/:id', async (req, res) => res.json(await academico.actualizarProfesor(uid(req), id(req), body(req))));
router.delete('/profesores/:id', async (req, res) => {
  await academico.eliminarProfesor(id(req));
  res.status(204).end();
});

// ----- Alumnos y tutores -----
router.get('/alumnos', async (req, res) =>
  res.json(await personas.listarAlumnos({ buscar: req.query.buscar, nivel_id: optionalId(req.query.nivel_id) })),
);
router.get('/alumnos/:id', async (req, res) => res.json(await personas.obtenerAlumno(id(req))));
router.post('/alumnos', async (req, res) => res.status(201).json(await personas.crearAlumno(uid(req), body(req))));
router.put('/alumnos/:id', async (req, res) => res.json(await personas.actualizarAlumno(uid(req), id(req), body(req))));
router.delete('/alumnos/:id', async (req, res) => {
  await personas.eliminarAlumno(uid(req), id(req));
  res.status(204).end();
});
router.post('/alumnos/:id/tutores', async (req, res) =>
  res.status(201).json(await personas.vincularTutor(uid(req), id(req), body(req))),
);
router.delete('/alumnos/:id/tutores/:tutorId', async (req, res) => {
  await personas.desvincularTutor(uid(req), id(req), id(req, 'tutorId'));
  res.status(204).end();
});

router.get('/tutores', async (req, res) => res.json(await personas.listarTutores({ buscar: req.query.buscar })));
router.post('/tutores', async (req, res) => res.status(201).json(await personas.crearTutor(uid(req), body(req))));
router.put('/tutores/:id', async (req, res) => res.json(await personas.actualizarTutor(uid(req), id(req), body(req))));
router.delete('/tutores/:id', async (req, res) => {
  await personas.eliminarTutor(id(req));
  res.status(204).end();
});

// ----- Usuarios y roles -----
router.get('/roles', async (_req, res) => res.json(await personas.listarRoles()));
router.get('/usuarios', async (_req, res) => res.json(await personas.listarUsuarios()));
router.post('/usuarios', async (req, res) => res.status(201).json(await personas.crearUsuario(uid(req), body(req))));
router.put('/usuarios/:id', async (req, res) => res.json(await personas.actualizarUsuario(uid(req), id(req), body(req))));

// ----- Inscripciones -----
router.get('/matriculas', async (req, res) =>
  res.json(await inscripciones.listarMatriculas({ curso_id: optionalId(req.query.curso_id), ciclo_id: optionalId(req.query.ciclo_id) })),
);
router.post('/matriculas', async (req, res) =>
  res.status(201).json(await inscripciones.matricular(uid(req), toId(req.body.alumno_id, 'alumno_id'), req.body.curso_id)),
);
router.delete('/matriculas/:id', async (req, res) => res.json(await inscripciones.bajaMatricula(uid(req), id(req))));

router.get('/deportes', async (_req, res) => res.json(await deportes.listarDeportes()));
router.post('/deportes', async (req, res) => res.status(201).json(await deportes.crearDeporte(body(req))));
router.put('/deportes/:id', async (req, res) => res.json(await deportes.actualizarDeporte(id(req), body(req))));
router.get('/comisiones', async (req, res) =>
  res.json(await deportes.listarComisiones({ deporte_id: optionalId(req.query.deporte_id), nivel_id: optionalId(req.query.nivel_id) })),
);
router.post('/comisiones', async (req, res) => res.status(201).json(await deportes.crearComision(uid(req), req.body)));
router.put('/comisiones/:id', async (req, res) => res.json(await deportes.actualizarComision(uid(req), id(req), req.body)));
router.delete('/comisiones/:id', async (req, res) => {
  await deportes.eliminarComision(id(req));
  res.status(204).end();
});

router.get('/inscripciones-deporte', async (req, res) =>
  res.json(
    await inscripciones.listarInscripcionesDeporte({
      comision_id: optionalId(req.query.comision_id),
      alumno_id: optionalId(req.query.alumno_id),
    }),
  ),
);
router.get('/alumnos/:id/detalle', async (req, res) => res.json(await portal.detalleAlumno(id(req))));
router.get('/alumnos/:id/opciones', async (req, res) => res.json(await portal.opcionesInscripcion(id(req))));
router.get('/alumnos/:id/comisiones', async (req, res) => res.json(await inscripciones.comisionesDisponibles(id(req))));
router.post('/inscripciones-deporte', async (req, res) =>
  res.status(201).json(await inscripciones.inscribirDeporte(uid(req), toId(req.body.alumno_id, 'alumno_id'), req.body.comision_id)),
);
router.delete('/inscripciones-deporte/:id', async (req, res) => res.json(await inscripciones.bajaDeporte(uid(req), id(req))));

router.get('/transporte', async (_req, res) => res.json(await inscripciones.listarTransporte()));
router.post('/transporte', async (req, res) =>
  res.status(201).json(await inscripciones.inscribirTransporte(uid(req), toId(req.body.alumno_id, 'alumno_id'), body(req))),
);
router.delete('/transporte/:id', async (req, res) => res.json(await inscripciones.bajaTransporte(uid(req), id(req))));

router.get('/comedor', async (_req, res) => res.json(await inscripciones.listarComedor()));
router.post('/comedor', async (req, res) =>
  res.status(201).json(await inscripciones.inscribirComedor(uid(req), toId(req.body.alumno_id, 'alumno_id'), body(req))),
);
router.delete('/comedor/:id', async (req, res) => res.json(await inscripciones.bajaComedor(uid(req), id(req))));

// ----- Reportes MIS -----
router.get('/reportes/resumen', async (_req, res) => res.json(await reportes.resumen()));
router.get('/reportes/padron-curso', async (req, res) => res.json(await reportes.padronCurso(optionalId(req.query.curso_id))));
router.get('/reportes/transporte', async (req, res) =>
  res.json(await reportes.padronTransporte(optionalId(req.query.recorrido_id))),
);
router.get('/reportes/deportes', async (_req, res) => res.json(await reportes.ocupacionDeportes()));
router.get('/reportes/comedor', async (_req, res) => res.json(await reportes.comedor()));
router.get('/reportes/alumnos', async (_req, res) => res.json(await reportes.listado360()));
router.get('/reportes/alumnos/:id', async (req, res) => res.json(await reportes.alumno360(id(req))));
router.get('/reportes/auditoria', async (req, res) => res.json(await reportes.auditoria(req.query.limite)));

// ----- Contenido del sitio -----
router.get('/noticias', async (_req, res) => res.json(await contenido.listarNoticias({ todas: true })));
router.post('/noticias', async (req, res) => res.status(201).json(await contenido.crearNoticia(uid(req), body(req))));
router.put('/noticias/:id', async (req, res) => res.json(await contenido.actualizarNoticia(id(req), body(req))));
router.delete('/noticias/:id', async (req, res) => {
  await contenido.eliminarNoticia(id(req));
  res.status(204).end();
});
router.get('/mensajes', async (_req, res) => res.json(await contenido.listarMensajes()));
router.put('/mensajes/:id/leido', async (req, res) => res.json(await contenido.marcarMensajeLeido(id(req))));
router.get('/solicitudes', async (_req, res) => res.json(await contenido.listarSolicitudes()));
router.put('/solicitudes/:id/estado', async (req, res) =>
  res.json(await contenido.cambiarEstadoSolicitud(id(req), req.body.estado)),
);

export default router;
