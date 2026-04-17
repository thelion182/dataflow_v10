// @ts-nocheck
/**
 * audit.ts — registro de acciones de auditoría.
 * Fire-and-forget: nunca lanza, nunca rompe el flujo principal.
 *
 * Captura: usuario, rol, acción, módulo, entidad, resultado, timestamp, ambiente (OS/browser).
 * La IP no está disponible en el browser; queda como "N/D" hasta que se conecte el backend.
 */
import { db } from '../services/db';
import { getSession, loadUsers } from './auth';
import { uuid } from './ids';

export type AuditModulo =
  | 'auth'
  | 'reclamos'
  | 'archivos'
  | 'usuarios'
  | 'liquidaciones'
  | 'sectores'
  | 'config';

export type AuditResultado = 'ok' | 'error' | 'bloqueado';

export interface AuditEntry {
  id: string;
  timestamp: string;
  usuarioId: string;
  usuarioNombre: string;
  usuarioRol: string;
  modulo: AuditModulo;
  accion: string;       // e.g. "login", "crear_reclamo", "cambiar_estado"
  entidadId?: string;   // id del reclamo, archivo, etc.
  entidadRef?: string;  // ticket, nombre de archivo, etc.
  detalles?: string;    // texto libre con contexto adicional
  ip: string;           // "N/D" en frontend — real cuando haya backend
  ambiente: string;     // "Windows 10/11 · Chrome 120"
  resultado: AuditResultado;
}

// ─── userAgent parser ─────────────────────────────────────────────────────────

export function parseAmbiente(): string {
  try {
    const ua = navigator.userAgent;

    let os = 'Desconocido';
    if (/Windows NT 10/.test(ua))     os = 'Windows 10/11';
    else if (/Windows NT 6\.3/.test(ua)) os = 'Windows 8.1';
    else if (/Windows NT 6\.1/.test(ua)) os = 'Windows 7';
    else if (/Mac OS X/.test(ua))     os = 'macOS';
    else if (/Android/.test(ua))      os = 'Android';
    else if (/iPhone|iPad/.test(ua))  os = 'iOS';
    else if (/Linux/.test(ua))        os = 'Linux';

    let browser = 'Desconocido';
    if (/Edg\//.test(ua)) {
      const m = ua.match(/Edg\/([\d]+)/);
      browser = `Edge ${m ? m[1] : ''}`.trim();
    } else if (/OPR\//.test(ua)) {
      const m = ua.match(/OPR\/([\d]+)/);
      browser = `Opera ${m ? m[1] : ''}`.trim();
    } else if (/Chrome\/([\d]+)/.test(ua)) {
      const m = ua.match(/Chrome\/([\d]+)/);
      browser = `Chrome ${m ? m[1] : ''}`.trim();
    } else if (/Firefox\/([\d]+)/.test(ua)) {
      const m = ua.match(/Firefox\/([\d]+)/);
      browser = `Firefox ${m ? m[1] : ''}`.trim();
    } else if (/Safari\//.test(ua)) {
      browser = 'Safari';
    }

    return `${os} · ${browser}`;
  } catch {
    return 'N/D';
  }
}

// ─── logAudit: fire-and-forget ────────────────────────────────────────────────

interface LogAuditParams {
  modulo: AuditModulo;
  accion: string;
  resultado?: AuditResultado;
  entidadId?: string;
  entidadRef?: string;
  detalles?: string;
  // Override de usuario (útil en login, donde la sesión aún no está guardada)
  usuarioId?: string;
  usuarioNombre?: string;
  usuarioRol?: string;
}

export function logAudit(params: LogAuditParams): void {
  try {
    const session = getSession();
    let usuarioId    = params.usuarioId    || '';
    let usuarioNombre = params.usuarioNombre || '';
    let usuarioRol   = params.usuarioRol   || '';

    if (session?.userId && !usuarioId) {
      try {
        const users = loadUsers();
        const u = users.find(x => x.id === session.userId);
        if (u) {
          usuarioId    = u.id;
          usuarioNombre = u.displayName || u.username;
          usuarioRol   = u.role;
        }
      } catch { /* ignore */ }
    }

    const entry: AuditEntry = {
      id:           uuid(),
      timestamp:    new Date().toISOString(),
      usuarioId,
      usuarioNombre,
      usuarioRol,
      modulo:       params.modulo,
      accion:       params.accion,
      entidadId:    params.entidadId,
      entidadRef:   params.entidadRef,
      detalles:     params.detalles,
      ip:           'N/D',
      ambiente:     parseAmbiente(),
      resultado:    params.resultado ?? 'ok',
    };

    // Fire-and-forget: la Promise se ignora intencionalmente
    Promise.resolve().then(() => {
      try { db.audit.append(entry); } catch { /* nunca lanza */ }
    });
  } catch { /* nunca lanza */ }
}
