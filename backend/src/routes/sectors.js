/**
 * sectors.js — rutas de sectores y sedes
 *
 * GET /api/sectors        → lista todos los sectores
 * PUT /api/sectors        → reemplaza lista completa
 * GET /api/sectors/sites  → lista todas las sedes
 * PUT /api/sectors/sites  → reemplaza lista completa de sedes
 */
const express = require('express');
const { pool } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/sectors ────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, site_code AS "siteCode",
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

// ── PUT /api/sectors ─────────────────────────────────────────────────────────
router.put('/', requireRole('admin', 'superadmin'), async (req, res) => {
  const sectors = req.body;
  if (!Array.isArray(sectors)) return res.status(400).json({ error: 'Body debe ser array' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const s of sectors) {
      if (!s.id || !s.name) continue;
      await client.query(
        `INSERT INTO sectors (id, name, site_code, owner_user_id, owner_username,
                              cc, required_count, allow_no_news, active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (id) DO UPDATE SET
           name           = EXCLUDED.name,
           site_code      = EXCLUDED.site_code,
           owner_user_id  = EXCLUDED.owner_user_id,
           owner_username = EXCLUDED.owner_username,
           cc             = EXCLUDED.cc,
           required_count = EXCLUDED.required_count,
           allow_no_news  = EXCLUDED.allow_no_news,
           active         = EXCLUDED.active`,
        [s.id, s.name, s.siteCode || null,
         s.ownerUserId || null, s.ownerUsername || null,
         s.cc || null, s.requiredCount || 0, !!s.allowNoNews, s.active !== false]
      );
    }
    if (sectors.length > 0) {
      const ids = sectors.map((s) => s.id).filter(Boolean);
      await client.query(
        `DELETE FROM sectors WHERE id != ALL($1::uuid[])`,
        [ids]
      );
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

// ── GET /api/sectors/sites ───────────────────────────────────────────────────
router.get('/sites', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, code, name, active FROM sites ORDER BY name`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[sectors] GET /sites:', err);
    res.status(500).json({ error: 'Error al obtener sedes' });
  }
});

// ── PUT /api/sectors/sites ───────────────────────────────────────────────────
router.put('/sites', requireRole('admin', 'superadmin'), async (req, res) => {
  const sites = req.body;
  if (!Array.isArray(sites)) return res.status(400).json({ error: 'Body debe ser array' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const s of sites) {
      if (!s.id || !s.code || !s.name) continue;
      const code = String(s.code).toUpperCase().trim();
      await client.query(
        `INSERT INTO sites (id, code, name, active)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET
           code   = EXCLUDED.code,
           name   = EXCLUDED.name,
           active = EXCLUDED.active`,
        [s.id, code, s.name, s.active !== false]
      );
    }
    if (sites.length > 0) {
      const ids = sites.map((s) => s.id).filter(Boolean);
      await client.query(
        `DELETE FROM sites WHERE id != ALL($1::uuid[])`,
        [ids]
      );
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
