/**
 * auth.js — rutas de autenticación
 *
 * POST /api/auth/login    → valida usuario/contraseña, crea sesión
 * POST /api/auth/logout   → destruye sesión
 * GET  /api/auth/me       → devuelve usuario autenticado
 * GET  /api/auth/session  → devuelve { userId } (usado por usersAPI.getSession)
 * PUT  /api/auth/session  → guarda/limpia sesión (usado por usersAPI.saveSession)
 *
 * Para conectar LDAP/AD: reemplazar la sección "Validar contraseña"
 * con ldapjs o passport-ldapauth. Ver BACKEND_GUIDE.md sección 6.
 */
const express = require('express');
const bcrypt  = require('bcryptjs');
const { pool } = require('../db');

const router = express.Router();

// ── POST /api/auth/login ────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
  }

  try {
    const result = await pool.query(
      `SELECT id, username, display_name, email, role, password_hash,
              must_change_password, active, login_attempts, locked_until
       FROM users WHERE LOWER(username) = LOWER($1)`,
      [username]
    );
    const user = result.rows[0];

    if (!user || !user.active) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    // Verificar bloqueo por intentos fallidos
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const mins = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
      return res.status(401).json({ error: `Cuenta bloqueada. Reintentá en ${mins} minuto(s).` });
    }

    // Validar contraseña (bcrypt)
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      const attempts = (user.login_attempts || 0) + 1;
      const lockUpdate = attempts >= 5
        ? ', locked_until = NOW() + INTERVAL \'5 minutes\''
        : '';
      await pool.query(
        `UPDATE users SET login_attempts = $1 ${lockUpdate} WHERE id = $2`,
        [attempts, user.id]
      );
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    // Login exitoso
    await pool.query(
      `UPDATE users SET login_attempts = 0, locked_until = NULL, last_login_at = NOW()
       WHERE id = $1`,
      [user.id]
    );

    req.session.userId = user.id;
    req.session.role   = user.role;

    res.json({
      id:                user.id,
      username:          user.username,
      displayName:       user.display_name,
      email:             user.email,
      role:              user.role,
      mustChangePassword: user.must_change_password,
    });
  } catch (err) {
    console.error('[auth] login:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── POST /api/auth/logout ───────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// ── GET /api/auth/me ────────────────────────────────────────────────────────
router.get('/me', async (req, res) => {
  if (!req.session?.userId) return res.status(401).json({ error: 'No autenticado' });
  try {
    const result = await pool.query(
      `SELECT id, username, display_name, email, role, must_change_password,
              range_start, range_end, range_txt_start, range_txt_end
       FROM users WHERE id = $1`,
      [req.session.userId]
    );
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Sesión inválida' });
    res.json({
      id:                user.id,
      username:          user.username,
      displayName:       user.display_name,
      email:             user.email,
      role:              user.role,
      mustChangePassword: user.must_change_password,
      rangeStart:        user.range_start,
      rangeEnd:          user.range_end,
      rangeTxtStart:     user.range_txt_start,
      rangeTxtEnd:       user.range_txt_end,
    });
  } catch (err) {
    console.error('[auth] me:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ── GET /api/auth/session  (usado por usersAPI.getSession) ──────────────────
router.get('/session', (req, res) => {
  if (!req.session?.userId) return res.status(401).json(null);
  res.json({ userId: req.session.userId });
});

// ── PUT /api/auth/session  (usado por usersAPI.saveSession) ─────────────────
router.put('/session', (req, res) => {
  if (req.body === null || !req.body?.userId) {
    req.session.destroy(() => res.json({ ok: true }));
  } else {
    req.session.userId = req.body.userId;
    res.json({ ok: true });
  }
});

module.exports = router;
