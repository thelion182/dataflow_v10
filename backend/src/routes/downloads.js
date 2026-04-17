/**
 * downloads.js — rutas de contadores de numeración y logs de descarga
 *
 * GET /api/downloads/counters    → contadores del usuario actual
 * PUT /api/downloads/counters    → guarda contadores
 * GET /api/downloads/downloaded  → archivos descargados por el usuario
 * PUT /api/downloads/downloaded  → actualiza descargados
 * GET /api/downloads/logs        → historial de descargas (admin)
 * PUT /api/downloads/logs        → sincroniza logs (admin)
 *
 * IMPORTANTE — atomicidad:
 * Los contadores de numeración DEBEN ser atómicos.
 * Ver la función incrementCounter() abajo — usa SELECT...FOR UPDATE.
 */
const express = require('express');
const { pool } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/downloads/counters ─────────────────────────────────────────────
// Devuelve { "periodId": number } — mapa de contadores del usuario actual
router.get('/counters', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT period_id, current FROM download_counters WHERE user_id = $1`,
      [req.session.userId]
    );
    const counters = {};
    result.rows.forEach((r) => { counters[r.period_id] = r.current; });
    res.json(counters);
  } catch (err) {
    console.error('[downloads] GET /counters:', err);
    res.status(500).json({ error: 'Error al obtener contadores' });
  }
});

// ── PUT /api/downloads/counters ─────────────────────────────────────────────
router.put('/counters', requireAuth, async (req, res) => {
  const counters = req.body; // { periodId: number }
  if (typeof counters !== 'object') return res.status(400).json({ error: 'Body inválido' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const [periodId, current] of Object.entries(counters)) {
      await client.query(
        `INSERT INTO download_counters (user_id, period_id, current)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, period_id) DO UPDATE SET current = EXCLUDED.current`,
        [req.session.userId, periodId, current]
      );
    }
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[downloads] PUT /counters:', err);
    res.status(500).json({ error: 'Error al guardar contadores' });
  } finally {
    client.release();
  }
});

/**
 * incrementCounter(userId, periodId) → número siguiente (atómico)
 * Usar este método desde files.js al registrar una descarga con numeración.
 *
 * @param {object} client - cliente pg de una transacción en curso
 */
async function incrementCounter(client, userId, periodId) {
  // SELECT FOR UPDATE garantiza que dos descargas simultáneas no obtengan el mismo número
  await client.query(
    `INSERT INTO download_counters (user_id, period_id, current)
     VALUES ($1, $2, 1)
     ON CONFLICT (user_id, period_id) DO UPDATE
     SET current = download_counters.current + 1`,
    [userId, periodId]
  );
  const result = await client.query(
    `SELECT current FROM download_counters
     WHERE user_id = $1 AND period_id = $2
     FOR UPDATE`,
    [userId, periodId]
  );
  return result.rows[0]?.current || 1;
}

// ── GET /api/downloads/downloaded ───────────────────────────────────────────
router.get('/downloaded', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT file_id FROM downloaded_files WHERE user_id = $1`,
      [req.session.userId]
    );
    const map = {};
    result.rows.forEach((r) => { map[r.file_id] = true; });
    res.json(map);
  } catch (err) {
    console.error('[downloads] GET /downloaded:', err);
    res.status(500).json({ error: 'Error al obtener archivos descargados' });
  }
});

// ── PUT /api/downloads/downloaded ───────────────────────────────────────────
router.put('/downloaded', requireAuth, async (req, res) => {
  const files = req.body; // { fileId: boolean }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const [fileId, downloaded] of Object.entries(files)) {
      if (downloaded) {
        await client.query(
          `INSERT INTO downloaded_files (user_id, file_id)
           VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [req.session.userId, fileId]
        );
      } else {
        await client.query(
          `DELETE FROM downloaded_files WHERE user_id = $1 AND file_id = $2`,
          [req.session.userId, fileId]
        );
      }
    }
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[downloads] PUT /downloaded:', err);
    res.status(500).json({ error: 'Error al guardar descargados' });
  } finally {
    client.release();
  }
});

// ── GET /api/downloads/logs ─────────────────────────────────────────────────
router.get('/logs', requireRole('admin', 'superadmin'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, user_id AS "userId", file_id AS "fileId",
              file_name AS "fileName", numero, downloaded_at AS "downloadedAt"
       FROM download_logs ORDER BY downloaded_at DESC LIMIT 1000`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[downloads] GET /logs:', err);
    res.status(500).json({ error: 'Error al obtener logs' });
  }
});

// ── PUT /api/downloads/logs  (sincronización — no-op en backend real) ────────
router.put('/logs', requireRole('admin', 'superadmin'), async (req, res) => {
  // El backend escribe los logs automáticamente en cada descarga.
  res.json({ ok: true });
});

module.exports = { router, incrementCounter };
