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

function getFileType(name, mimeType) {
  const ext = (name || '').split('.').pop()?.toLowerCase() || '';
  const extMap = {
    pdf: 'PDF', txt: 'TXT', csv: 'CSV',
    xls: 'XLS', xlsx: 'XLSX', doc: 'DOC', docx: 'DOCX',
    jpg: 'JPG', jpeg: 'JPG', png: 'PNG', gif: 'GIF',
    zip: 'ZIP', rar: 'RAR', '7z': '7Z',
    xml: 'XML', json: 'JSON',
  };
  return extMap[ext] || ext.toUpperCase() || 'FILE';
}

function mapFile(f) {
  return {
    id:             f.id,
    periodId:       f.period_id,
    name:           f.name,
    size:           parseInt(f.size) || 0,
    mimeType:       f.mime_type,
    fileType:       getFileType(f.name, f.mime_type),
    status:         f.status,
    statusOverride: f.status_override,
    sector:         f.sector,
    sectorName:     f.sector,
    siteCode:       f.site_code,
    combinationId:  f.combination_id || null,
    subcategory:    f.subcategory    || null,
    noNews:         !!f.no_news,
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
    observations:   f.observations  || [],
    history:        f.history        || [],
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

    // Obtener IDs, versiones y observaciones existentes
    const existingResult = await client.query('SELECT id, version, observations FROM files');
    const existingMap = new Map(existingResult.rows.map(r => [r.id, r]));

    for (const f of files) {
      const existing = existingMap.get(f.id);
      const isNew = !existing;
      const isVersionBump = !isNew && (f.version || 1) > (existing.version || 1);

      // Detectar cambios en observaciones (normalizar JSONB a array)
      const oldObs = Array.isArray(existing?.observations) ? existing.observations
                   : (typeof existing?.observations === 'string' ? JSON.parse(existing.observations || '[]') : []);
      const newObs = Array.isArray(f.observations) ? f.observations : [];
      const oldObsCount = oldObs.length;
      const newObsCount = newObs.length;
      const hasNewThread = !isNew && newObsCount > oldObsCount;

      // Detectar si alguna fila de observación fue respondida (solo si no hay hilo nuevo)
      let hasNewAnswer = false;
      let answerTipo = 'duda';
      if (!isNew && !hasNewThread) {
        const oldAnswered = oldObs.reduce((n, t) => n + (t.rows || []).filter(r => r.answered).length, 0);
        const newAnswered = newObs.reduce((n, t) => n + (t.rows || []).filter(r => r.answered).length, 0);
        hasNewAnswer = newAnswered > oldAnswered;
        if (hasNewAnswer) {
          // Detectar el tipo del hilo que fue respondido
          for (const newThread of newObs) {
            const oldThread = oldObs.find(t => t.id === newThread.id);
            const oldCount = (oldThread?.rows || []).filter(r => r.answered).length;
            const newCount = (newThread.rows || []).filter(r => r.answered).length;
            if (newCount > oldCount) { answerTipo = newThread.tipo || 'duda'; break; }
          }
        }
      }
      await client.query(
        `INSERT INTO files (id, period_id, name, size, mime_type, status, status_override,
                            sector, site_code, combination_id, subcategory, no_news,
                            uploader_id, uploader_name, version,
                            parent_id, storage_path, eliminated, eliminated_by, eliminated_at,
                            observations, history)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
         ON CONFLICT (id) DO UPDATE SET
           name           = EXCLUDED.name,
           version        = EXCLUDED.version,
           size           = EXCLUDED.size,
           status         = EXCLUDED.status,
           status_override= EXCLUDED.status_override,
           combination_id = EXCLUDED.combination_id,
           subcategory    = EXCLUDED.subcategory,
           no_news        = EXCLUDED.no_news,
           eliminated     = EXCLUDED.eliminated,
           eliminated_by  = EXCLUDED.eliminated_by,
           eliminated_at  = EXCLUDED.eliminated_at,
           observations   = EXCLUDED.observations,
           history        = EXCLUDED.history,
           updated_at     = NOW()`,
        [f.id, f.periodId, f.name, f.size, f.mimeType, f.status, f.statusOverride,
         f.sector || f.sectorName || null, f.siteCode || null,
         f.combinationId || null, f.subcategory || null, !!f.noNews,
         f.uploaderId || req.session.userId,
         f.uploaderName || req.session.displayName || req.session.userId,
         f.version || 1, f.parentId || null, f.storagePath || null,
         !!f.eliminated, f.eliminatedBy || null, f.eliminatedAt || null,
         JSON.stringify(f.observations || []), JSON.stringify(f.history || [])]
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
      } else if (hasNewThread) {
        broadcast('file:observation', {
          fileId:   f.id,
          fileName: f.name,
          type:     'nueva_duda',
          byUser:   req.session.displayName || req.session.userId,
        });
      } else if (hasNewAnswer) {
        broadcast('file:observation', {
          fileId:   f.id,
          fileName: f.name,
          type:     'respuesta',
          tipo:     answerTipo,
          byUser:   req.session.displayName || req.session.userId,
        });
      } else {
        // Detectar si alguna fila fue marcada como procesada
        if (!isNew && Array.isArray(newObs) && Array.isArray(oldObs)) {
          const oldProcessed = oldObs.reduce((n, t) => n + (t.rows || []).filter(r => r.processed).length, 0);
          const newProcessed = newObs.reduce((n, t) => n + (t.rows || []).filter(r => r.processed).length, 0);
          if (newProcessed > oldProcessed) {
            broadcast('file:observation', {
              fileId:   f.id,
              fileName: f.name,
              type:     'procesada',
              byUser:   req.session.displayName || req.session.userId,
            });
          }
        }
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

  const { periodId, sector, siteCode, fileId, combinationId, subcategory, noNews } = req.body;
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
                          sector, site_code, combination_id, subcategory, no_news,
                          uploader_id, uploader_name, version, storage_path)
       VALUES ($1,$2,$3,$4,$5,'cargado',$6,$7,$8,$9,$10,$11,$12,$13,$14)
       ON CONFLICT (id) DO UPDATE SET
         name           = EXCLUDED.name,
         size           = EXCLUDED.size,
         mime_type      = EXCLUDED.mime_type,
         status         = 'actualizado',
         combination_id = EXCLUDED.combination_id,
         subcategory    = EXCLUDED.subcategory,
         no_news        = EXCLUDED.no_news,
         version        = EXCLUDED.version,
         storage_path   = EXCLUDED.storage_path,
         updated_at     = NOW()`,
      [id, periodId, Buffer.from(req.file.originalname, 'latin1').toString('utf8'), req.file.size, req.file.mimetype,
       sector || null, siteCode || null,
       combinationId || null, subcategory || null, noNews === 'true' || noNews === true,
       req.session.userId, req.session.displayName || req.session.userId,
       newVersion, relativePath]
    );

    // Registrar en audit log
    const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
    const action = isVersionBump ? `Nueva versión v${newVersion}: ${originalName}` : `Archivo subido: ${originalName}`;
    await pool.query(
      `INSERT INTO file_history (file_id, action, by_user_id, by_username, details)
       VALUES ($1, 'subida', $2, $3, $4)`,
      [id, req.session.userId, req.session.displayName, action]
    );

    const result = await pool.query('SELECT * FROM files WHERE id = $1', [id]);
    const uploaded = mapFile(result.rows[0]);

    // Registrar en audit_log
    await pool.query(
      `INSERT INTO audit_log (timestamp, usuario_id, usuario_nombre, usuario_rol, modulo, accion, entidad_id, entidad_ref, detalles, resultado)
       VALUES (NOW(), $1, $2, $3, 'archivos', $4, $5, $6, $7, 'ok')`,
      [req.session.userId, req.session.displayName, req.session.role,
       isVersionBump ? 'nueva_version' : 'subida',
       uploaded.id, uploaded.name,
       isVersionBump ? `Nueva versión v${newVersion}: ${uploaded.name}` : `Subió: ${uploaded.name}`]
    );

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

    // Registrar en download_logs
    await pool.query(
      `INSERT INTO download_logs (user_id, file_id, file_name, downloaded_at)
       VALUES ($1, $2, $3, NOW())`,
      [req.session.userId, file.id, file.name]
    );

    // Registrar en audit_log
    await pool.query(
      `INSERT INTO audit_log (timestamp, usuario_id, usuario_nombre, usuario_rol, modulo, accion, entidad_id, entidad_ref, detalles, resultado)
       VALUES (NOW(), $1, $2, $3, 'archivos', 'descarga', $4, $5, $6, 'ok')`,
      [req.session.userId, req.session.displayName, req.session.role,
       file.id, file.name, `Descargó: ${file.name}`]
    );

    // Marcar archivo como descargado para este usuario
    await pool.query(
      `INSERT INTO downloaded_files (user_id, file_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [req.session.userId, file.id]
    );

    // Actualizar status del archivo a "descargado" en la DB
    await pool.query(
      `UPDATE files SET status = 'descargado', updated_at = NOW() WHERE id = $1`,
      [file.id]
    );

    // Notificar via SSE a todos los usuarios
    broadcast('file:downloaded', {
      fileId:       file.id,
      fileName:     file.name,
      downloadedBy: req.session.displayName || req.session.userId,
      downloadedAt: new Date().toISOString(),
    });

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

// ── DELETE /api/files/period/:periodId  (reset liquidación, solo superadmin) ─
router.delete('/period/:periodId', requireRole('superadmin'), async (req, res) => {
  const { periodId } = req.params;
  const client = await pool.connect();
  try {
    // Obtener paths físicos para borrar del disco
    const result = await client.query(
      'SELECT id, storage_path FROM files WHERE period_id = $1',
      [periodId]
    );
    await client.query('BEGIN');
    // Borrar observaciones y trazabilidad asociadas
    const fileIds = result.rows.map(r => r.id);
    if (fileIds.length > 0) {
      await client.query(`DELETE FROM observation_threads WHERE file_id = ANY($1::uuid[])`, [fileIds]);
      await client.query(`DELETE FROM file_history WHERE file_id = ANY($1::uuid[])`, [fileIds]);
      await client.query(`DELETE FROM downloaded_files WHERE file_id = ANY($1::uuid[])`, [fileIds]);
      await client.query(`DELETE FROM download_logs WHERE file_id = ANY($1::uuid[])`, [fileIds]);
    }
    await client.query('DELETE FROM files WHERE period_id = $1', [periodId]);
    await client.query('COMMIT');
    // Borrar archivos físicos del disco
    for (const row of result.rows) {
      if (row.storage_path) {
        fs.unlink(path.join(UPLOAD_DIR, row.storage_path), () => {});
      }
    }
    // Registrar en audit
    await pool.query(
      `INSERT INTO audit_log (timestamp, usuario_id, usuario_nombre, usuario_rol, modulo, accion, entidad_id, detalles, resultado)
       VALUES (NOW(), $1, $2, $3, 'archivos', 'period_reset', $4, $5, 'ok')`,
      [req.session.userId, req.session.displayName, req.session.role, periodId,
       `Reset de liquidación: ${result.rows.length} archivos eliminados`]
    );
    broadcast('period:reset', { periodId, deletedCount: result.rows.length });
    res.json({ ok: true, deleted: result.rows.length });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[files] DELETE /period/:periodId:', err);
    res.status(500).json({ error: 'Error al resetear liquidación' });
  } finally {
    client.release();
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
