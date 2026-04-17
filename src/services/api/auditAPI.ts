// @ts-nocheck
/**
 * auditAPI.ts — skeleton API para el log de auditoría.
 *
 * Endpoints esperados en el backend:
 *   GET    /api/audit   → devuelve AuditEntry[] (con filtros opcionales por query params)
 *   POST   /api/audit   → registra una entrada (body: AuditEntry)
 *   DELETE /api/audit   → limpia el log (solo superadmin)
 */
import { apiDelete, apiGet, apiPost } from './client';
import type { AuditEntry } from '../../lib/audit';

export async function getAll(): Promise<AuditEntry[]> {
  try {
    return await apiGet('/audit');
  } catch (err) {
    console.error('[auditAPI] getAll:', err);
    return [];
  }
}

export async function append(entry: AuditEntry): Promise<void> {
  try {
    await apiPost('/audit', entry);
  } catch (err) {
    // fire-and-forget: nunca lanza
    console.warn('[auditAPI] append (ignorado):', err);
  }
}

export async function clear(): Promise<void> {
  try {
    await apiDelete('/audit');
  } catch (err) {
    console.error('[auditAPI] clear:', err);
  }
}
