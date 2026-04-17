/**
 * users.js — rutas de usuarios
 *
 * GET  /api/users      → lista usuarios (admin/superadmin)
 * PUT  /api/users      → reemplaza lista (superadmin)
 * GET  /api/users/:id  → obtiene usuario por ID
 * PUT  /api/users/:id  → crea o actualiza usuario
 */
const express = require('express');
const bcrypt  = require('bcryptjs');
const { pool } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

function mapUser(u) {
  return {
    id:                  u.id,
    username:            u.username,
    displayName:         u.display_name,
    email:               u.email,
    role:                u.role,
    mustChangePassword:  u.must_change_password,
    rangeStart:          u.range_start,
    rangeEnd:            u.range_end,
    rangeTxtStart:       u.range_txt_start,
    rangeTxtEnd:         u.range_txt_end,
    active:              u.active,
    loginAttempts:       u.login_attempts,
    lockedUntil:         u.locked_until,
    lastLoginAt:         u.last_login_at,
    createdAt:           u.created_at,
  };
}

// ── GET /api/users ──────────────────────────────────────────────────────────
router.get('/', requireRole('admin', 'superadmin'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, username, display_name, email, role, must_change_password,
              range_start, range_end, range_txt_start, range_txt_end,
              active, login_attempts, locked_until, last_login_at, created_at
       FROM users ORDER BY display_name`
    );
    res.json(result.rows.map(mapUser));
  } catch (err) {
    console.error('[users] GET /:', err);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

// ── PUT /api/users  (sincronización completa, solo superadmin) ──────────────
router.put('/', requireRole('superadmin'), async (req, res) => {
  const users = req.body;
  if (!Array.isArray(users)) return res.status(400).json({ error: 'Body debe ser array' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const u of users) {
      let hash = u.passwordHash;
      // Si viene un hash en formato SHA-256 (64 chars hex), migrar a bcrypt
      if (hash && hash.length === 64 && /^[0-9a-f]+$/i.test(hash)) {
        // No se puede migrar sin la contraseña original.
        // Dejar como está hasta que el usuario cambie la contraseña.
        // En ese momento el hash se actualizará a bcrypt.
        hash = hash;
      }
      await client.query(
        `INSERT INTO users (id, username, display_name, email, role, password_hash,
                            must_change_password, range_start, range_end,
                            range_txt_start, range_txt_end, active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         ON CONFLICT (id) DO UPDATE SET
           username             = EXCLUDED.username,
           display_name         = EXCLUDED.display_name,
           email                = EXCLUDED.email,
           role                 = EXCLUDED.role,
           password_hash        = COALESCE(EXCLUDED.password_hash, users.password_hash),
           must_change_password = EXCLUDED.must_change_password,
           range_start          = EXCLUDED.range_start,
           range_end            = EXCLUDED.range_end,
           range_txt_start      = EXCLUDED.range_txt_start,
           range_txt_end        = EXCLUDED.range_txt_end,
           active               = EXCLUDED.active`,
        [u.id, u.username, u.displayName, u.email, u.role, hash,
         !!u.mustChangePassword, u.rangeStart || null, u.rangeEnd || null,
         u.rangeTxtStart || null, u.rangeTxtEnd || null, u.active !== false]
      );
    }
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[users] PUT /:', err);
    res.status(500).json({ error: 'Error al guardar usuarios' });
  } finally {
    client.release();
  }
});

// ── GET /api/users/:id ──────────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req, res) => {
  // Solo admin/superadmin pueden ver otros usuarios; un usuario puede verse a sí mismo
  const isSelf = req.session.userId === req.params.id;
  const isAdmin = ['admin', 'superadmin'].includes(req.session.role);
  if (!isSelf && !isAdmin) return res.status(403).json({ error: 'Sin permiso' });

  try {
    const result = await pool.query(
      `SELECT id, username, display_name, email, role, must_change_password,
              range_start, range_end, range_txt_start, range_txt_end,
              active, login_attempts, locked_until, last_login_at, created_at
       FROM users WHERE id = $1`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(mapUser(result.rows[0]));
  } catch (err) {
    console.error('[users] GET /:id:', err);
    res.status(500).json({ error: 'Error al obtener usuario' });
  }
});

// ── PUT /api/users/:id  (upsert) ────────────────────────────────────────────
router.put('/:id', requireRole('admin', 'superadmin'), async (req, res) => {
  const u = req.body;
  let hash = u.passwordHash;

  // Si viene contraseña en texto plano, hashear con bcrypt
  if (u.plainPassword) {
    hash = await bcrypt.hash(u.plainPassword, 10);
  }

  try {
    await pool.query(
      `INSERT INTO users (id, username, display_name, email, role, password_hash,
                          must_change_password, range_start, range_end,
                          range_txt_start, range_txt_end, active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (id) DO UPDATE SET
         username             = EXCLUDED.username,
         display_name         = EXCLUDED.display_name,
         email                = EXCLUDED.email,
         role                 = EXCLUDED.role,
         password_hash        = COALESCE(EXCLUDED.password_hash, users.password_hash),
         must_change_password = EXCLUDED.must_change_password,
         range_start          = EXCLUDED.range_start,
         range_end            = EXCLUDED.range_end,
         range_txt_start      = EXCLUDED.range_txt_start,
         range_txt_end        = EXCLUDED.range_txt_end,
         active               = EXCLUDED.active`,
      [req.params.id, u.username, u.displayName, u.email, u.role, hash,
       !!u.mustChangePassword, u.rangeStart || null, u.rangeEnd || null,
       u.rangeTxtStart || null, u.rangeTxtEnd || null, u.active !== false]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[users] PUT /:id:', err);
    res.status(500).json({ error: 'Error al guardar usuario' });
  }
});

module.exports = router;
