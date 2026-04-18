/**
 * audit.js — log de auditoría
 *
 * GET    /api/audit   → lista entradas (superadmin)
 * POST   /api/audit   → registra entrada (autenticado)
 * DELETE /api/audit   → limpia log (superadmin)
 */
const express = require('express');
const { pool } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/audit ──────────────────────────────────────────────────────────
router.get('/', requireRole('superadmin'), async (req, res) => {
  try {
    const { modulo, accion, resultado, usuarioId, desde, hasta } = req.query;
    const params = [];
    const conds = [];

    if (modulo)    { params.push(modulo);    conds.push(`modulo = $${params.length}`); }
    if (accion)    { params.push(accion);    conds.push(`accion = $${params.length}`); }
    if (resultado) { params.push(resultado); conds.push(`resultado = $${params.length}`); }
    if (usuarioId) { params.push(usuarioId); conds.push(`usuario_id = $${params.length}`); }
    if (desde)     { params.push(desde);     conds.push(`timestamp >= $${params.length}`); }
    if (hasta)     { params.push(hasta);     conds.push(`timestamp <= $${params.length}`); }

    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const result = await pool.query(
      `SELECT id, timestamp, usuario_id AS "usuarioId", usuario_nombre AS "usuarioNombre",
              usuario_rol AS "usuarioRol", modulo, accion, entidad_id AS "entidadId",
              entidad_ref AS "entidadRef", detalles, ip, ambiente, resultado
       FROM audit_log ${where} ORDER BY timestamp DESC LIMIT 1000`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[audit] GET /:', err);
    res.status(500).json({ error: 'Error al obtener audit log' });
  }
});

// ── POST /api/audit ─────────────────────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  const d = req.body;
  try {
    await pool.query(
      `INSERT INTO audit_log (id, timestamp, usuario_id, usuario_nombre, usuario_rol,
                              modulo, accion, entidad_id, entidad_ref, detalles, ip, ambiente, resultado)
       VALUES (COALESCE($1, gen_random_uuid()), COALESCE($2, NOW()), $3, $4, $5,
               $6, $7, $8, $9, $10, COALESCE($11, $12), $13, COALESCE($14, 'ok'))`,
      [d.id || null, d.timestamp || null,
       d.usuarioId || req.session.userId || null,
       d.usuarioNombre || req.session.displayName || null,
       d.usuarioRol || req.session.role || null,
       d.modulo || 'sistema', d.accion || 'accion',
       d.entidadId || null, d.entidadRef || null, d.detalles || null,
       req.ip || req.headers['x-forwarded-for'] || null, d.ip || null,
       d.ambiente || null, d.resultado || null]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[audit] POST /:', err);
    res.status(500).json({ error: 'Error al guardar audit entry' });
  }
});

// ── DELETE /api/audit ───────────────────────────────────────────────────────
router.delete('/', requireRole('superadmin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM audit_log');
    res.json({ ok: true });
  } catch (err) {
    console.error('[audit] DELETE /:', err);
    res.status(500).json({ error: 'Error al limpiar audit log' });
  }
});

module.exports = router;
