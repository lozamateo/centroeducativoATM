// API RESTful stateless del Sistema de Gestion Integral.
// Capas: rutas (routes/) -> seguridad (middleware/) -> servicios (services/) -> persistencia (db.js).
import cors from 'cors';
import express from 'express';
import { toHttpError } from './errors.js';
import adminRoutes from './routes/admin.js';
import portalRoutes from './routes/portal.js';
import publicoRoutes from './routes/publico.js';
import saludRoutes from './routes/salud.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use('/api', publicoRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/salud', saludRoutes);
app.use('/api/portal', portalRoutes);

app.use('/api', (_req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }));

app.use((error, _req, res, _next) => {
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El cuerpo de la solicitud no es JSON valido.' });
  }
  const httpError = toHttpError(error);
  res.status(httpError.status).json({ error: httpError.message });
});

export default app;
