// @ts-check
const express = require('express');
const router  = express.Router();
const { pool } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

function mapCombination(r) {
  return {
    id:            r.id,
    siteCode:      r.site_code,
    sectorName:    r.sector_name,
    subcategory:   r.subcategory || null,
    ownerUserId:   r.owner_user_id,
    ownerUsername: r.owner_username,
    allowNoNews:   r.allow_no_news,
    active:        r.active,
    createdAt:     r.created_at,
  };
}

// ── GET /api/combinations ────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM combinations ORDER BY site_code, sector_name, subcategory NULLS FIRST`
    );
    res.json(result.rows.map(mapCombination));
  } catch (err) {
    console.error('[combinations] GET /:', err);
    res.status(500).json({ error: 'Error al obtener combinaciones' });
  }
});

// ── PUT /api/combinations  (sync completo desde frontend) ────────────────────
router.put('/', requireRole('admin', 'superadmin'), async (req, res) => {
  const items = req.body;
  if (!Array.isArray(items)) return res.status(400).json({ error: 'Body debe ser array' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const c of items) {
      if (!c.id || !c.siteCode || !c.sectorName) continue;
      await client.query(
        `INSERT INTO combinations (id, site_code, sector_name, subcategory,
                                   owner_user_id, owner_username, allow_no_news, active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           site_code      = EXCLUDED.site_code,
           sector_name    = EXCLUDED.sector_name,
           subcategory    = EXCLUDED.subcategory,
           owner_user_id  = EXCLUDED.owner_user_id,
           owner_username = EXCLUDED.owner_username,
           allow_no_news  = EXCLUDED.allow_no_news,
           active         = EXCLUDED.active`,
        [c.id, c.siteCode, c.sectorName, c.subcategory || null,
         c.ownerUserId || null, c.ownerUsername || null,
         c.allowNoNews !== false, c.active !== false]
      );
    }
    // Eliminar los que ya no están en la lista
    if (items.length > 0) {
      const ids = items.map(c => c.id).filter(Boolean);
      await client.query(
        `DELETE FROM combinations WHERE id != ALL($1::uuid[])`,
        [ids]
      );
    }
    await client.query('COMMIT');
    const result = await client.query(
      `SELECT * FROM combinations ORDER BY site_code, sector_name, subcategory NULLS FIRST`
    );
    res.json(result.rows.map(mapCombination));
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[combinations] PUT /:', err);
    res.status(500).json({ error: 'Error al guardar combinaciones' });
  } finally {
    client.release();
  }
});

// ── POST /api/combinations  (crear una) ─────────────────────────────────────
router.post('/', requireRole('admin', 'superadmin'), async (req, res) => {
  const { id, siteCode, sectorName, subcategory, ownerUserId, ownerUsername, allowNoNews, active } = req.body;
  if (!siteCode || !sectorName) return res.status(400).json({ error: 'siteCode y sectorName son obligatorios' });
  const { v4: uuidv4 } = require('uuid');
  const newId = id || uuidv4();
  try {
    await pool.query(
      `INSERT INTO combinations (id, site_code, sector_name, subcategory,
                                 owner_user_id, owner_username, allow_no_news, active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (site_code, sector_name, subcategory) DO UPDATE SET
         owner_user_id  = EXCLUDED.owner_user_id,
         owner_username = EXCLUDED.owner_username,
         allow_no_news  = EXCLUDED.allow_no_news,
         active         = EXCLUDED.active`,
      [newId, siteCode, sectorName, subcategory || null,
       ownerUserId || null, ownerUsername || null,
       allowNoNews !== false, active !== false]
    );
    const result = await pool.query('SELECT * FROM combinations WHERE id = $1', [newId]);
    res.status(201).json(mapCombination(result.rows[0]));
  } catch (err) {
    console.error('[combinations] POST /:', err);
    if (err.code === '23505') return res.status(409).json({ error: 'Ya existe esa combinación' });
    res.status(500).json({ error: 'Error al crear combinación' });
  }
});

// ── DELETE /api/combinations/:id ────────────────────────────────────────────
router.delete('/:id', requireRole('admin', 'superadmin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM combinations WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('[combinations] DELETE /:id:', err);
    res.status(500).json({ error: 'Error al eliminar combinación' });
  }
});

module.exports = router;
