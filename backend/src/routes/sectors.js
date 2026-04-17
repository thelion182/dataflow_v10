/**
 * sectors.js — rutas de sectores y sedes
 *
 * GET /api/sectors   → lista todos los sectores
 * PUT /api/sectors   → reemplaza lista completa
 * GET /api/sites     → lista todas las sedes
 * PUT /api/sites     → reemplaza lista completa
 */
const express = require('express');
const { pool } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/sectors ────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, patterns, site_code AS "siteCode",
              owner_user_id AS "ownerUserId", owner_username AS "ownerUsername",
              cc, required_count AS "requiredCount", allow_no_news AS "allowNoNews", active
       FROM sectors ORDER BY name`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[sectors] GET /:', err);
    res.status(500).json({ error: 'Error al obtener sectores' });
  }
});

// ── PUT /api/sectors ────────────────────────────────────────────────────────
router.put('/', requireRole('admin', 'superadmin'), async (req, res) => {
  const sectors = req.body;
  if (!Array.isArray(sectors)) return res.status(400).json({ error: 'Body debe ser array' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const s of sectors) {
      await client.query(
        `INSERT INTO sectors (id, name, patterns, site_code, owner_user_id,
                              owner_username, cc, required_count, allow_no_news, active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (id) DO UPDATE SET
           name          = EXCLUDED.name,
           patterns      = EXCLUDED.patterns,
           site_code     = EXCLUDED.site_code,
           owner_user_id = EXCLUDED.owner_user_id,
           owner_username= EXCLUDED.owner_username,
           cc            = EXCLUDED.cc,
           required_count= EXCLUDED.required_count,
           allow_no_news = EXCLUDED.allow_no_news,
           active        = EXCLUDED.active`,
        [s.id, s.name, s.patterns || [], s.siteCode || null,
         s.ownerUserId || null, s.ownerUsername || null,
         s.cc || null, s.requiredCount || 0, !!s.allowNoNews, s.active !== false]
      );
    }
    const ids = sectors.map((s) => s.id);
    if (ids.length > 0) {
      await client.query(
        `DELETE FROM sectors WHERE id NOT IN (SELECT unnest($1::uuid[]))`,
        [ids]
      );
    } else {
      await client.query('DELETE FROM sectors');
    }
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[sectors] PUT /:', err);
    res.status(500).json({ error: 'Error al guardar sectores' });
  } finally {
    client.release();
  }
});

// ── GET /api/sites ──────────────────────────────────────────────────────────
router.get('/sites', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, code, name, patterns, active FROM sites ORDER BY name`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[sectors] GET /sites:', err);
    res.status(500).json({ error: 'Error al obtener sedes' });
  }
});

// ── PUT /api/sites ──────────────────────────────────────────────────────────
router.put('/sites', requireRole('admin', 'superadmin'), async (req, res) => {
  const sites = req.body;
  if (!Array.isArray(sites)) return res.status(400).json({ error: 'Body debe ser array' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const s of sites) {
      await client.query(
        `INSERT INTO sites (id, code, name, patterns, active)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET
           code     = EXCLUDED.code,
           name     = EXCLUDED.name,
           patterns = EXCLUDED.patterns,
           active   = EXCLUDED.active`,
        [s.id, s.code, s.name, s.patterns || [], s.active !== false]
      );
    }
    const ids = sites.map((s) => s.id);
    if (ids.length > 0) {
      await client.query(
        `DELETE FROM sites WHERE id NOT IN (SELECT unnest($1::uuid[]))`,
        [ids]
      );
    } else {
      await client.query('DELETE FROM sites');
    }
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[sectors] PUT /sites:', err);
    res.status(500).json({ error: 'Error al guardar sedes' });
  } finally {
    client.release();
  }
});

module.exports = router;
