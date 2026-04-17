// @ts-nocheck
/**
 * filesStorage.ts
 * Abstracción de persistencia para archivos del módulo Información.
 *
 * MIGRACIÓN A BACKEND:
 * Reemplazar este archivo por src/services/api/filesAPI.ts con
 * las mismas funciones pero usando fetch() contra la API real.
 * El resto del código no cambia — solo se actualiza db.ts.
 */
import { STORAGE_KEY_FILES, STORAGE_KEY_AUDIT_LOG } from '../../lib/storage';

export function getAll(): any[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_FILES) || '[]');
  } catch {
    return [];
  }
}

export function saveAll(files: any[]): void {
  try {
    // Nunca serializar blobUrl (son objetos Blob temporales en memoria)
    const minimal = files.map((f: any) => ({ ...f, blobUrl: undefined }));
    localStorage.setItem(STORAGE_KEY_FILES, JSON.stringify(minimal));
  } catch {}
}

export function getAuditLog(): any[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_AUDIT_LOG) || '[]');
  } catch {
    return [];
  }
}

export function saveAuditLog(log: any[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_AUDIT_LOG, JSON.stringify(log));
  } catch {}
}

export function appendAuditEntry(entry: any): void {
  const log = getAuditLog();
  log.unshift(entry);
  // Limitar a 500 entradas para no crecer indefinidamente
  if (log.length > 500) log.splice(500);
  saveAuditLog(log);
}
