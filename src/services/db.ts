// @ts-nocheck
/**
 * db.ts — capa de abstracción de persistencia. PUNTO ÚNICO DE MIGRACIÓN AL BACKEND.
 *
 * ─── Cómo conectar el backend (Cómputos) ──────────────────────────────────────
 *
 *   1. Copiar .env.example → .env.local
 *   2. Editar .env.local:
 *        VITE_USE_API=true
 *        VITE_API_URL=http://tu-servidor/api
 *   3. Implementar los endpoints REST (ver BACKEND_GUIDE.md)
 *   4. Levantar el backend y hacer npm run dev
 *      → el switch es automático, sin tocar ningún otro archivo
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

const USE_API = import.meta.env.VITE_USE_API === 'true';

// ─── localStorage (modo actual — sin backend) ──────────────────────────────
import * as filesLocal          from './localStorage/filesStorage';
import * as sectorsLocal        from './localStorage/sectorsStorage';
import * as downloadsLocal      from './localStorage/downloadsStorage';
import * as periodsLocal        from './localStorage/periodsStorage';
import * as usersLocal          from './localStorage/usersStorage';
import * as reclamosLocal       from './localStorage/reclamosStorage';
import * as reclamosConfigLocal from './localStorage/reclamosConfigStorage';
import * as auditLocal          from './localStorage/auditStorage';

// ─── API REST (modo backend — activar con VITE_USE_API=true) ──────────────
import * as filesAPI          from './api/filesAPI';
import * as sectorsAPI        from './api/sectorsAPI';
import * as downloadsAPI      from './api/downloadsAPI';
import * as periodsAPI        from './api/periodsAPI';
import * as usersAPI          from './api/usersAPI';
import * as reclamosAPI       from './api/reclamosAPI';
import * as reclamosConfigAPI from './api/reclamosConfigAPI';
import * as auditAPI          from './api/auditAPI';

// ─── Selección automática ─────────────────────────────────────────────────
const files          = USE_API ? filesAPI          : filesLocal;
const sectors        = USE_API ? sectorsAPI        : sectorsLocal;
const downloads      = USE_API ? downloadsAPI      : downloadsLocal;
const periods        = USE_API ? periodsAPI        : periodsLocal;
const users          = USE_API ? usersAPI          : usersLocal;
const reclamos       = USE_API ? reclamosAPI       : reclamosLocal;
const reclamosConfig = USE_API ? reclamosConfigAPI : reclamosConfigLocal;
const audit          = USE_API ? auditAPI          : auditLocal;

export const db = {

  // ── Archivos (módulo Información) ─────────────────────────────────────────
  // API: GET/PUT /api/files  ·  GET/PUT/POST /api/files/audit
  files: {
    getAll:        files.getAll,
    saveAll:       files.saveAll,
    getAuditLog:   files.getAuditLog,
    saveAuditLog:  files.saveAuditLog,
    appendAudit:   files.appendAuditEntry,
  },

  // ── Sectores y Sedes ───────────────────────────────────────────────────────
  // API: GET/PUT /api/sectors  ·  GET/PUT /api/sites
  sectors: {
    getAllSectors: sectors.getAllSectors,
    saveSectors:  sectors.saveSectors,
    getAllSites:   sectors.getAllSites,
    saveSites:    sectors.saveSites,
  },

  // ── Descargas y contadores de numeración ───────────────────────────────────
  // API: GET/PUT /api/downloads/counters|downloaded|logs
  // ATENCIÓN: los counters deben ser atómicos en el backend (ver BACKEND_GUIDE.md)
  downloads: {
    getCounters:         downloads.getCounters,
    saveCounters:        downloads.saveCounters,
    getDownloadedFiles:  downloads.getDownloadedFiles,
    saveDownloadedFiles: downloads.saveDownloadedFiles,
    getLogs:             downloads.getLogs,
    saveLogs:            downloads.saveLogs,
  },

  // ── Liquidaciones (períodos) ───────────────────────────────────────────────
  // API: GET/PUT /api/periods  ·  GET/PUT /api/periods/selected
  periods: {
    getAll:      periods.getAll,
    saveAll:     periods.saveAll,
    getSelected: periods.getSelected,
    saveSelected:periods.saveSelected,
  },

  // ── Usuarios y sesión ──────────────────────────────────────────────────────
  // API: GET/PUT /api/users  ·  GET/PUT /api/users/:id  ·  GET/PUT /api/auth/session
  // NOTA: el login/LDAP se migra en lib/auth.ts → attemptLogin()
  users: {
    getAll:      users.getAll,
    saveAll:     users.saveAll,
    getById:     users.getById,
    upsert:      users.upsert,
    getSession:  users.getSession,
    saveSession: users.saveSession,
  },

  // ── Reclamos ───────────────────────────────────────────────────────────────
  // API: GET/POST /api/reclamos  ·  GET/PATCH/DELETE /api/reclamos/:id
  //      POST /api/reclamos/:id/estado|notificaciones|notas
  reclamos: {
    getAll:          reclamos.getAll,
    getById:         reclamos.getById,
    create:          reclamos.create,
    update:          reclamos.update,
    softDelete:      reclamos.softDelete,
    updateEstado:    reclamos.updateEstado,
    addNotificacion: reclamos.addNotificacion,
    addNotaInterna:  reclamos.addNotaInterna,
  },

  // ── Configuración de Reclamos ──────────────────────────────────────────────
  // API: GET/PUT /api/reclamos/config
  reclamosConfig: {
    get:  reclamosConfig.getConfig,
    save: reclamosConfig.saveConfig,
  },

  // ── Auditoría ─────────────────────────────────────────────────────────────
  // API: GET /api/audit  ·  POST /api/audit  ·  DELETE /api/audit
  audit: {
    getAll: audit.getAll,
    append: audit.append,
    clear:  audit.clear,
  },
};
