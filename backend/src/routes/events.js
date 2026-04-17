/**
 * events.js — Server-Sent Events (SSE)
 *
 * GET /api/events → cliente se suscribe y recibe eventos en tiempo real.
 *
 * Eventos emitidos:
 *   file:uploaded    → RRHH subió un archivo nuevo
 *   file:status      → estado de un archivo cambió
 *   reclamo:created  → se creó un reclamo nuevo
 *   reclamo:estado   → estado de un reclamo cambió
 *   reclamo:nota     → se agregó una nota interna
 *
 * broadcast(event, data) — exportada e importada en files.js y reclamos.js
 */
const express = require('express');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Set de clientes conectados (una Response por cada tab/dispositivo)
const clients = new Set();

// ── GET /api/events ─────────────────────────────────────────────────────────
router.get('/', requireAuth, (req, res) => {
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // desactiva buffer de nginx
  res.flushHeaders();

  // Ping inicial para confirmar conexión
  res.write('event: ping\ndata: {"status":"connected"}\n\n');

  clients.add(res);
  console.log(`[SSE] cliente conectado — total: ${clients.size}`);

  // Ping cada 25 segundos para mantener la conexión viva
  const keepAlive = setInterval(() => {
    res.write('event: ping\ndata: {}\n\n');
  }, 25000);

  // Limpiar al desconectar
  req.on('close', () => {
    clients.delete(res);
    clearInterval(keepAlive);
    console.log(`[SSE] cliente desconectado — total: ${clients.size}`);
  });
});

/**
 * broadcast(event, data)
 * Envía un evento a todos los clientes conectados.
 *
 * @param {string} event  - nombre del evento (ej: 'file:uploaded')
 * @param {object} data   - payload JSON
 */
function broadcast(event, data) {
  if (clients.size === 0) return;
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  clients.forEach((client) => {
    try { client.write(msg); } catch (_) {}
  });
  console.log(`[SSE] broadcast "${event}" → ${clients.size} cliente(s)`);
}

module.exports = { router, broadcast };
