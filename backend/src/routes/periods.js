/**
 * periods.js — rutas de liquidaciones (períodos)
 *
 * GET  /api/periods          → lista todos los períodos
 * PUT  /api/periods          → reemplaza lista completa (sincronización con frontend)
 * GET  /api/periods/selected → período seleccionado del usuario actual
 * PUT  /api/periods/selected → guarda período seleccionado
 */
const express = require('express');
const { pool } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/periods ────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, year, month, upload_from AS "uploadFrom",
              upload_to AS "uploadTo", locked, created_at AS "createdAt"
       FROM periods
       ORDER BY year DESC, month DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[periods] GET /:', err);
    res.status(500).json({ error: 'Error al obtener períodos' });
  }
});

// ── PUT /api/periods  (sincronización completa desde frontend) ──────────────
// Solo admin y superadmin pueden modificar períodos.
// El campo locked solo puede cambiarse por admin o superadmin.
router.put('/', requireRole('admin', 'superadmin'), async (req, res) => {
  const periods = req.body;
  if (!Array.isArray(periods)) return res.status(400).json({ error: 'Body debe ser un array' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const p of periods) {
      await client.query(
        `INSERT INTO periods (id, name, year, month, upload_from, upload_to, locked)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET
           name        = EXCLUDED.name,
           upload_from = EXCLUDED.upload_from,
           upload_to   = EXCLUDED.upload_to,
           locked      = EXCLUDED.locked`,
        [p.id, p.name, p.year, p.month, p.uploadFrom || null, p.uploadTo || null, !!p.locked]
      );
    }

    // Eliminar los que ya no están en la lista (solo si no tienen archivos)
    const ids = periods.map((p) => p.id);
    if (ids.length > 0) {
      await client.query(
        `DELETE FROM periods
         WHERE id NOT IN (SELECT unnest($1::uuid[]))
           AND id NOT IN (SELECT DISTINCT period_id FROM files WHERE period_id IS NOT NULL)`,
        [ids]
      );
    }

    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[periods] PUT /:', err);
    res.status(500).json({ error: 'Error al guardar períodos' });
  } finally {
    client.release();
  }
});

// ── GET /api/periods/selected ───────────────────────────────────────────────
router.get('/selected', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT period_id AS id FROM user_selected_period WHERE user_id = $1`,
      [req.session.userId]
    );
    res.json({ id: result.rows[0]?.id || null });
  } catch (err) {
    console.error('[periods] GET /selected:', err);
    res.status(500).json({ error: 'Error al obtener período seleccionado' });
  }
});

// ── PUT /api/periods/selected ───────────────────────────────────────────────
router.put('/selected', requireAuth, async (req, res) => {
  const { id } = req.body;
  try {
    await pool.query(
      `INSERT INTO user_selected_period (user_id, period_id) VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET period_id = EXCLUDED.period_id`,
      [req.session.userId, id || null]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[periods] PUT /selected:', err);
    res.status(500).json({ error: 'Error al guardar período seleccionado' });
  }
});

module.exports = router;
