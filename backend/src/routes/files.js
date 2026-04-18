/**
 * files.js — rutas del módulo Información (archivos)
 *
 * GET  /api/files                   → lista archivos (filtrar por ?periodId=)
 * PUT  /api/files                   → sincronización completa desde frontend
 * GET  /api/files/audit             → historial de auditoría
 * PUT  /api/files/audit             → reemplaza audit log
 * POST /api/files/audit             → agrega una entrada al audit log
 * GET  /api/files/:id/download      → descarga archivo binario
 * PUT  /api/files/:id/status        → cambia estado
 * DELETE /api/files/:id             → eliminación lógica (admin) o física (superadmin)
 */
const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { pool } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { broadcast } = require('./events');

const router = express.Router();

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

// Configuración de multer — guarda en disco con nombre seguro
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(UPLOAD_DIR, req.body.periodId || 'sin-periodo');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const { v4: uuidv4 } = require('uuid');
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});
const upload = multer({ storage });

function mapFile(f) {
  return {
    id:             f.id,
    periodId:       f.period_id,
    name:           f.name,
    size:           parseInt(f.size),
    mimeType:       f.mime_type,
    status:         f.status,
    statusOverride: f.status_override,
    sector:         f.sector,
    siteCode:       f.site_code,
    uploaderId:     f.uploader_id,
    uploaderName:   f.uploader_name,
    version:        f.version,
    parentId:       f.parent_id,
    storagePath:    f.storage_path,
    eliminated:     f.eliminated,
    eliminatedBy:   f.eliminated_by,
    eliminatedAt:   f.eliminated_at,
    createdAt:      f.created_at,
    updatedAt:      f.updated_at,
  };
}

// ── GET /api/files ──────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const { periodId } = req.query;
    const params = [];
    let where = 'WHERE f.eliminated = FALSE';
    if (periodId) {
      params.push(periodId);
      where += ` AND f.period_id = $${params.length}`;
    }
    const result = await pool.query(
      `SELECT f.* FROM files f ${where} ORDER BY f.created_at DESC`,
      params
    );
    res.json(result.rows.map(mapFile));
  } catch (err) {
    console.error('[files] GET /:', err);
    res.status(500).json({ error: 'Error al obtener archivos' });
  }
});

// ── PUT /api/files  (sincronización completa desde frontend) ────────────────
// Upsert de todos los registros. Los binarios no se tocan — solo metadatos.
// Emite SSE file:uploaded para cada archivo nuevo detectado.
router.put('/', requireAuth, async (req, res) => {
  const files = req.body;
  if (!Array.isArray(files)) return res.status(400).json({ error: 'Body debe ser array' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Obtener IDs y versiones existentes para detectar nuevos y bumps de versión
    const existingResult = await client.query('SELECT id, version FROM files');
    const existingMap = new Map(existingResult.rows.map(r => [r.id, r]));

    for (const f of files) {
      const existing = existingMap.get(f.id);
      const isNew = !existing;
      const isVersionBump = !isNew && (f.version || 1) > (existing.version || 1);
      await client.query(
        `INSERT INTO files (id, period_id, name, size, mime_type, status, status_override,
                            sector, site_code, uploader_id, uploader_name, version,
                            parent_id, storage_path, eliminated, eliminated_by, eliminated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
         ON CONFLICT (id) DO UPDATE SET
           name           = EXCLUDED.name,
           version        = EXCLUDED.version,
           size           = EXCLUDED.size,
           status         = EXCLUDED.status,
           status_override= EXCLUDED.status_override,
           eliminated     = EXCLUDED.eliminated,
           eliminated_by  = EXCLUDED.eliminated_by,
           eliminated_at  = EXCLUDED.eliminated_at,
           updated_at     = NOW()`,
        [f.id, f.periodId, f.name, f.size, f.mimeType, f.status, f.statusOverride,
         f.sector, f.siteCode, f.uploaderId || req.session.userId,
         f.uploaderName || req.session.displayName || req.session.userId,
         f.version || 1, f.parentId || null, f.storagePath || null,
         !!f.eliminated, f.eliminatedBy || null, f.eliminatedAt || null]
      );
      if (isNew) {
        broadcast('file:uploaded', {
          fileName:     f.name,
          uploaderName: f.uploaderName || req.session.displayName || req.session.userId,
          periodId:     f.periodId,
        });
      } else if (isVersionBump) {
        broadcast('file:status', {
          fileId:   f.id,
          fileName: f.name,
          status:   `v${f.version}`,
        });
      }
    }
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[files] PUT /:', err);
    res.status(500).json({ error: 'Error al guardar archivos' });
  } finally {
    client.release();
  }
});

// ── POST /api/files/upload  (subida de archivo binario) ─────────────────────
router.post('/upload', requireRole('rrhh', 'admin', 'superadmin'),
  upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió archivo' });

  const { periodId, sector, siteCode, fileId } = req.body;
  const { v4: uuidv4 } = require('uuid');
  const id = fileId || uuidv4();
  const relativePath = path.relative(UPLOAD_DIR, req.file.path).replace(/\\/g, '/');

  try {
    // Detectar si es archivo nuevo o reemplazo de versión
    const existing = await pool.query('SELECT id, version FROM files WHERE id = $1', [id]);
    const isVersionBump = existing.rows.length > 0;
    const newVersion = isVersionBump ? (existing.rows[0].version || 1) + 1 : 1;

    await pool.query(
      `INSERT INTO files (id, period_id, name, size, mime_type, status,
                          sector, site_code, uploader_id, uploader_name,
                          version, storage_path)
       VALUES ($1,$2,$3,$4,$5,'cargado',$6,$7,$8,$9,$10,$11)
       ON CONFLICT (id) DO UPDATE SET
         name         = EXCLUDED.name,
         size         = EXCLUDED.size,
         mime_type    = EXCLUDED.mime_type,
         status       = 'actualizado',
         version      = EXCLUDED.version,
         storage_path = EXCLUDED.storage_path,
         updated_at   = NOW()`,
      [id, periodId, req.file.originalname, req.file.size, req.file.mimetype,
       sector || null, siteCode || null,
       req.session.userId, req.session.displayName || req.session.userId,
       newVersion, relativePath]
    );

    // Registrar en audit log
    const action = isVersionBump ? `Nueva versión v${newVersion}: ${req.file.originalname}` : `Archivo subido: ${req.file.originalname}`;
    await pool.query(
      `INSERT INTO file_history (file_id, action, by_user_id, by_username, details)
       VALUES ($1, 'subida', $2, $3, $4)`,
      [id, req.session.userId, req.session.displayName, action]
    );

    const result = await pool.query('SELECT * FROM files WHERE id = $1', [id]);
    const uploaded = mapFile(result.rows[0]);

    // Notificar via SSE
    if (isVersionBump) {
      broadcast('file:status', {
        fileId:   uploaded.id,
        fileName: uploaded.name,
        status:   `v${newVersion}`,
      });
    } else {
      broadcast('file:uploaded', {
        fileName:     uploaded.name,
        uploaderName: req.session.displayName || req.session.userId,
        periodId:     uploaded.periodId,
      });
    }

    res.status(201).json(uploaded);
  } catch (err) {
    // Limpiar archivo si falla el INSERT
    fs.unlink(req.file.path, () => {});
    console.error('[files] POST /upload:', err);
    res.status(500).json({ error: 'Error al guardar el archivo' });
  }
});

// ── GET /api/files/:id/download ─────────────────────────────────────────────
router.get('/:id/download', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM files WHERE id = $1 AND eliminated = FALSE`,
      [req.params.id]
    );
    const file = result.rows[0];
    if (!file) return res.status(404).json({ error: 'Archivo no encontrado' });

    const filePath = path.join(UPLOAD_DIR, file.storage_path);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Archivo físico no encontrado en el servidor' });
    }

    // Registrar descarga en audit log
    await pool.query(
      `INSERT INTO file_history (file_id, action, by_user_id, by_username, details)
       VALUES ($1, 'descarga', $2, $3, $4)`,
      [file.id, req.session.userId, req.session.displayName, `Descargado por usuario`]
    );

    // nginx X-Accel-Redirect (producción) — ver BACKEND_GUIDE.md sección 7
    // res.setHeader('X-Accel-Redirect', `/files-privados/${file.storage_path}`);
    // res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
    // return res.send();

    // Express directo (desarrollo)
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);
    res.sendFile(path.resolve(filePath));
  } catch (err) {
    console.error('[files] GET /:id/download:', err);
    res.status(500).json({ error: 'Error al descargar archivo' });
  }
});

// ── PUT /api/files/:id/status ───────────────────────────────────────────────
router.put('/:id/status', requireRole('sueldos', 'admin', 'superadmin'), async (req, res) => {
  const { status, statusOverride } = req.body;
  try {
    await pool.query(
      `UPDATE files SET status = COALESCE($1, status),
                        status_override = $2,
                        updated_at = NOW()
       WHERE id = $3`,
      [status || null, statusOverride || null, req.params.id]
    );

    // Notificar via SSE
    const fileResult = await pool.query('SELECT name FROM files WHERE id = $1', [req.params.id]);
    broadcast('file:status', {
      fileId:   req.params.id,
      fileName: fileResult.rows[0]?.name || req.params.id,
      status:   statusOverride || status,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('[files] PUT /:id/status:', err);
    res.status(500).json({ error: 'Error al cambiar estado' });
  }
});

// ── DELETE /api/files/:id ───────────────────────────────────────────────────
router.delete('/:id', requireRole('admin', 'superadmin'), async (req, res) => {
  const isSuperAdmin = req.session.role === 'superadmin';
  try {
    if (isSuperAdmin && req.query.hard === 'true') {
      // Hard delete: eliminar fila y archivo físico
      const result = await pool.query('SELECT storage_path FROM files WHERE id = $1', [req.params.id]);
      const file = result.rows[0];
      if (file?.storage_path) {
        fs.unlink(path.join(UPLOAD_DIR, file.storage_path), () => {});
      }
      await pool.query('DELETE FROM files WHERE id = $1', [req.params.id]);
    } else {
      // Soft delete
      await pool.query(
        `UPDATE files SET eliminated = TRUE, eliminated_by = $1, eliminated_at = NOW(),
                          updated_at = NOW()
         WHERE id = $2`,
        [req.session.userId, req.params.id]
      );
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('[files] DELETE /:id:', err);
    res.status(500).json({ error: 'Error al eliminar archivo' });
  }
});

// ── GET /api/files/audit ────────────────────────────────────────────────────
router.get('/audit', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT fh.id, fh.file_id AS "fileId", fh.action, fh.by_user_id AS "byUserId",
              fh.by_username AS "byUsername", fh.details, fh.created_at AS "createdAt",
              f.name AS "fileName"
       FROM file_history fh
       LEFT JOIN files f ON f.id = fh.file_id
       ORDER BY fh.created_at DESC
       LIMIT 500`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[files] GET /audit:', err);
    res.status(500).json({ error: 'Error al obtener audit log' });
  }
});

// ── PUT /api/files/audit  (reemplaza audit log — migración desde localStorage) ──
router.put('/audit', requireRole('superadmin'), async (req, res) => {
  const log = req.body;
  if (!Array.isArray(log)) return res.status(400).json({ error: 'Body debe ser array' });
  // No-op intencional: el audit log en backend se escribe desde el servidor.
  // Este endpoint existe para que el frontend no rompa al llamar saveAuditLog().
  res.json({ ok: true });
});

// ── POST /api/files/audit  (agrega entrada) ─────────────────────────────────
router.post('/audit', requireAuth, async (req, res) => {
  // No-op: el audit log lo escribe el servidor en cada operación.
  // El frontend llama appendAuditEntry() pero en modo API el backend lo maneja.
  res.json({ ok: true });
});

module.exports = router;
