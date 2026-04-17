/**
 * index.js — punto de entrada del servidor Express
 *
 * Para levantar en desarrollo:
 *   cd backend
 *   cp .env.example .env
 *   npm install
 *   node src/index.js
 *
 * O con Docker:
 *   docker compose up -d   (desde la raíz del proyecto)
 */
require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const session  = require('express-session');
const path     = require('path');
const fs       = require('fs');

const app = express();

// ── Directorio de uploads ────────────────────────────────────────────────────
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ── CORS ─────────────────────────────────────────────────────────────────────
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,           // necesario para cookies de sesión
}));

// ── Body parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Sesión ───────────────────────────────────────────────────────────────────
// En producción usar connect-pg-simple para persistir sesiones en PostgreSQL.
// npm install connect-pg-simple
// const pgSession = require('connect-pg-simple')(session);
// const { pool } = require('./db');
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-cambiar-en-produccion',
  resave: false,
  saveUninitialized: false,
  // store: new pgSession({ pool }),  // descomentar en producción
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 8 * 60 * 60 * 1000,   // 8 horas
  },
}));

// ── Rutas ─────────────────────────────────────────────────────────────────────
const authRouter      = require('./routes/auth');
const usersRouter     = require('./routes/users');
const periodsRouter   = require('./routes/periods');
const sectorsRouter   = require('./routes/sectors');
const filesRouter     = require('./routes/files');
const { router: downloadsRouter } = require('./routes/downloads');
const reclamosRouter  = require('./routes/reclamos');
const { router: eventsRouter } = require('./routes/events');

app.use('/api/auth',      authRouter);
app.use('/api/users',     usersRouter);
app.use('/api/periods',   periodsRouter);
app.use('/api/sectors',   sectorsRouter);
app.use('/api/sites',     sectorsRouter);      // sectorsRouter maneja /sites también
app.use('/api/files',     filesRouter);
app.use('/api/downloads', downloadsRouter);
app.use('/api/reclamos',  reclamosRouter);
app.use('/api/events',    eventsRouter);       // SSE — notificaciones en tiempo real

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0', env: process.env.NODE_ENV || 'development' });
});

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.path}` });
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[server] Error no manejado:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// ── Arrancar ──────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[server] Dataflow backend corriendo en http://localhost:${PORT}`);
  console.log(`[server] Frontend esperado en: ${FRONTEND_URL}`);
  console.log(`[server] Health check: http://localhost:${PORT}/api/health`);
});
