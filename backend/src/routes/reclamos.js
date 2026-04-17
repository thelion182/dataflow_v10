/**
 * reclamos.js — rutas del módulo Reclamos
 *
 * GET    /api/reclamos                    → lista reclamos (con filtros)
 * POST   /api/reclamos                    → crea reclamo
 * GET    /api/reclamos/config             → obtiene configuración
 * PUT    /api/reclamos/config             → guarda configuración
 * GET    /api/reclamos/:id                → detalle de reclamo
 * PATCH  /api/reclamos/:id                → actualiza campos (update parcial)
 * DELETE /api/reclamos/:id                → soft delete
 * POST   /api/reclamos/:id/estado         → cambia estado
 * POST   /api/reclamos/:id/notificaciones → agrega notificación
 * POST   /api/reclamos/:id/notas          → agrega nota interna
 */
const express = require('express');
const { pool } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// ── helpers ─────────────────────────────────────────────────────────────────

async function getReclamoConRelaciones(id, client) {
  const db = client || pool;
  const [rBase, rHistorial, rNotas, rNotifs] = await Promise.all([
    db.query(`SELECT * FROM reclamos WHERE id = $1`, [id]),
    db.query(
      `SELECT id, estado, usuario_id AS "usuarioId", usuario_nombre AS "usuarioNombre",
              nota, created_at AS fecha
       FROM reclamo_historial WHERE reclamo_id = $1 ORDER BY created_at`,
      [id]
    ),
    db.query(
      `SELECT id, texto, autor_id AS "autorId", autor_nombre AS "autorNombre",
              created_at AS fecha
       FROM reclamo_notas_internas WHERE reclamo_id = $1 ORDER BY created_at`,
      [id]
    ),
    db.query(
      `SELECT id, tipo, destinatario, contenido, enviada_en AS "enviadaEn"
       FROM reclamo_notificaciones WHERE reclamo_id = $1 ORDER BY enviada_en`,
      [id]
    ),
  ]);

  const r = rBase.rows[0];
  if (!r) return null;

  return {
    id:                r.id,
    ticket:            r.ticket,
    nroFuncionario:    r.nro_funcionario,
    nombreFuncionario: r.nombre_funcionario,
    emailFuncionario:  r.email_funcionario,
    cargo:             r.cargo,
    centroCosto:       r.centro_costo,
    liquidacion:       r.liquidacion,
    paraLiquidacion:   r.para_liquidacion,
    causal:            r.causal,
    tipoReclamo:       r.tipo_reclamo,
    descripcion:       r.descripcion,
    emisorId:          r.emisor_id,
    emisorNombre:      r.emisor_nombre,
    estado:            r.estado,
    eliminado:         r.eliminado,
    createdAt:         r.created_at,
    updatedAt:         r.updated_at,
    historialEstados:  rHistorial.rows,
    notasInternas:     rNotas.rows,
    notificaciones:    rNotifs.rows,
  };
}

// ── GET /api/reclamos ───────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id FROM reclamos ORDER BY created_at DESC`
    );
    // Devolver lista completa con relaciones (igual que el localStorage)
    const reclamos = await Promise.all(
      result.rows.map((r) => getReclamoConRelaciones(r.id))
    );
    res.json(reclamos.filter(Boolean));
  } catch (err) {
    console.error('[reclamos] GET /:', err);
    res.status(500).json({ error: 'Error al obtener reclamos' });
  }
});

// ── POST /api/reclamos ──────────────────────────────────────────────────────
router.post('/', requireRole('rrhh', 'admin', 'superadmin'), async (req, res) => {
  const d = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO reclamos (id, ticket, nro_funcionario, nombre_funcionario,
                             email_funcionario, cargo, centro_costo, liquidacion,
                             para_liquidacion, causal, tipo_reclamo, descripcion,
                             emisor_id, emisor_nombre, estado)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [d.id, d.ticket, d.nroFuncionario, d.nombreFuncionario,
       d.emailFuncionario, d.cargo, d.centroCosto, d.liquidacion,
       d.paraLiquidacion, d.causal, d.tipoReclamo, d.descripcion,
       d.emisorId, d.emisorNombre, d.estado || 'Emitido']
    );

    // Historial inicial
    if (d.historialEstados?.length) {
      for (const h of d.historialEstados) {
        await client.query(
          `INSERT INTO reclamo_historial (reclamo_id, estado, usuario_id, usuario_nombre, nota, created_at)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [d.id, h.estado, h.usuarioId, h.usuarioNombre, h.nota || null, h.fecha || new Date()]
        );
      }
    }

    await client.query('COMMIT');
    const reclamo = await getReclamoConRelaciones(d.id);
    res.status(201).json(reclamo);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[reclamos] POST /:', err);
    res.status(500).json({ error: 'Error al crear reclamo' });
  } finally {
    client.release();
  }
});

// ── GET /api/reclamos/config ─────────────────────────────────────────────────
router.get('/config', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM reclamos_config WHERE id = 1`);
    const c = result.rows[0];
    if (!c) return res.json({
      cargos: [], centrosCosto: [], liquidaciones: [],
      causales: [], tiposReclamo: [],
      emailSueldos: 'reclamos@circulocatolico.com.uy',
      whatsappActivo: false,
    });
    res.json({
      cargos:         c.cargos || [],
      centrosCosto:   c.centros_costo || [],
      liquidaciones:  c.liquidaciones || [],
      causales:       c.causales || [],
      tiposReclamo:   c.tipos_reclamo || [],
      emailSueldos:   c.email_sueldos,
      whatsappActivo: c.whatsapp_activo,
    });
  } catch (err) {
    console.error('[reclamos] GET /config:', err);
    res.status(500).json({ error: 'Error al obtener configuración' });
  }
});

// ── PUT /api/reclamos/config ─────────────────────────────────────────────────
router.put('/config', requireRole('admin', 'superadmin'), async (req, res) => {
  const c = req.body;
  try {
    await pool.query(
      `INSERT INTO reclamos_config (id, cargos, centros_costo, liquidaciones,
                                    causales, tipos_reclamo, email_sueldos, whatsapp_activo)
       VALUES (1,$1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (id) DO UPDATE SET
         cargos          = EXCLUDED.cargos,
         centros_costo   = EXCLUDED.centros_costo,
         liquidaciones   = EXCLUDED.liquidaciones,
         causales        = EXCLUDED.causales,
         tipos_reclamo   = EXCLUDED.tipos_reclamo,
         email_sueldos   = EXCLUDED.email_sueldos,
         whatsapp_activo = EXCLUDED.whatsapp_activo`,
      [c.cargos, c.centrosCosto, c.liquidaciones,
       c.causales, c.tiposReclamo, c.emailSueldos, !!c.whatsappActivo]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[reclamos] PUT /config:', err);
    res.status(500).json({ error: 'Error al guardar configuración' });
  }
});

// ── GET /api/reclamos/:id ────────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const reclamo = await getReclamoConRelaciones(req.params.id);
    if (!reclamo) return res.status(404).json({ error: 'Reclamo no encontrado' });
    res.json(reclamo);
  } catch (err) {
    console.error('[reclamos] GET /:id:', err);
    res.status(500).json({ error: 'Error al obtener reclamo' });
  }
});

// ── PATCH /api/reclamos/:id ──────────────────────────────────────────────────
router.patch('/:id', requireAuth, async (req, res) => {
  const changes = req.body;
  const allowed = ['descripcion', 'causal', 'tipo_reclamo', 'cargo',
                   'centro_costo', 'liquidacion', 'para_liquidacion'];
  const sets = [];
  const vals = [];
  for (const [key, val] of Object.entries(changes)) {
    if (allowed.includes(key)) {
      sets.push(`${key} = $${sets.length + 1}`);
      vals.push(val);
    }
  }
  if (!sets.length) return res.status(400).json({ error: 'No hay campos válidos para actualizar' });
  vals.push(req.params.id);
  try {
    await pool.query(
      `UPDATE reclamos SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${vals.length}`,
      vals
    );
    const reclamo = await getReclamoConRelaciones(req.params.id);
    res.json(reclamo);
  } catch (err) {
    console.error('[reclamos] PATCH /:id:', err);
    res.status(500).json({ error: 'Error al actualizar reclamo' });
  }
});

// ── DELETE /api/reclamos/:id  (soft delete) ──────────────────────────────────
router.delete('/:id', requireRole('rrhh', 'admin', 'superadmin'), async (req, res) => {
  const { usuarioId, usuarioNombre, nota } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE reclamos SET eliminado = TRUE, estado = 'Eliminado', updated_at = NOW()
       WHERE id = $1`,
      [req.params.id]
    );
    await client.query(
      `INSERT INTO reclamo_historial (reclamo_id, estado, usuario_id, usuario_nombre, nota)
       VALUES ($1,'Eliminado',$2,$3,$4)`,
      [req.params.id, usuarioId, usuarioNombre, nota || null]
    );
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[reclamos] DELETE /:id:', err);
    res.status(500).json({ error: 'Error al eliminar reclamo' });
  } finally {
    client.release();
  }
});

// ── POST /api/reclamos/:id/estado ────────────────────────────────────────────
router.post('/:id/estado', requireAuth, async (req, res) => {
  const { estado, usuarioId, usuarioNombre, nota } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE reclamos SET estado = $1, updated_at = NOW() WHERE id = $2`,
      [estado, req.params.id]
    );
    await client.query(
      `INSERT INTO reclamo_historial (reclamo_id, estado, usuario_id, usuario_nombre, nota)
       VALUES ($1,$2,$3,$4,$5)`,
      [req.params.id, estado, usuarioId, usuarioNombre, nota || null]
    );
    await client.query('COMMIT');
    const reclamo = await getReclamoConRelaciones(req.params.id);
    res.json(reclamo);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[reclamos] POST /:id/estado:', err);
    res.status(500).json({ error: 'Error al cambiar estado' });
  } finally {
    client.release();
  }
});

// ── POST /api/reclamos/:id/notificaciones ─────────────────────────────────────
router.post('/:id/notificaciones', requireAuth, async (req, res) => {
  const n = req.body;
  try {
    await pool.query(
      `INSERT INTO reclamo_notificaciones (reclamo_id, tipo, destinatario, contenido)
       VALUES ($1,$2,$3,$4)`,
      [req.params.id, n.tipo, n.destinatario, n.contenido]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[reclamos] POST /:id/notificaciones:', err);
    res.status(500).json({ error: 'Error al guardar notificación' });
  }
});

// ── POST /api/reclamos/:id/notas ──────────────────────────────────────────────
router.post('/:id/notas', requireAuth, async (req, res) => {
  const n = req.body;
  try {
    await pool.query(
      `INSERT INTO reclamo_notas_internas (id, reclamo_id, texto, autor_id, autor_nombre, created_at)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [n.id, req.params.id, n.texto, n.autorId, n.autorNombre, n.fecha || new Date()]
    );
    const reclamo = await getReclamoConRelaciones(req.params.id);
    res.json(reclamo);
  } catch (err) {
    console.error('[reclamos] POST /:id/notas:', err);
    res.status(500).json({ error: 'Error al agregar nota interna' });
  }
});

module.exports = router;
