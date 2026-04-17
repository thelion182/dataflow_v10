// @ts-nocheck
/**
 * filesAPI.ts — implementación API para archivos del módulo Información.
 * Expone las mismas funciones que localStorage/filesStorage.ts pero usando fetch().
 *
 * Endpoints esperados en el backend:
 *   GET    /api/files              → devuelve FileRecord[]
 *   PUT    /api/files              → reemplaza lista completa (body: FileRecord[])
 *   GET    /api/files/audit        → devuelve AuditEntry[]
 *   PUT    /api/files/audit        → reemplaza audit log (body: AuditEntry[])
 *   POST   /api/files/audit        → agrega una entrada al audit log (body: AuditEntry)
 *
 * NOTA sobre archivos binarios:
 *   El campo blobUrl es un objeto Blob en memoria y nunca se serializa.
 *   La subida del binario real se maneja por separado con multipart/form-data
 *   en el hook useFiles → ver BACKEND_GUIDE.md sección "Almacenamiento de archivos".
 */
import { apiGet, apiPost, apiPut } from './client';

export async function getAll(): Promise<any[]> {
  try {
    return await apiGet('/files');
  } catch (err) {
    console.error('[filesAPI] getAll:', err);
    return [];
  }
}

export async function saveAll(files: any[]): Promise<void> {
  try {
    const minimal = files.map((f: any) => ({ ...f, blobUrl: undefined }));
    await apiPut('/files', minimal);
  } catch (err) {
    console.error('[filesAPI] saveAll:', err);
  }
}

export async function getAuditLog(): Promise<any[]> {
  try {
    return await apiGet('/files/audit');
  } catch (err) {
    console.error('[filesAPI] getAuditLog:', err);
    return [];
  }
}

export async function saveAuditLog(log: any[]): Promise<void> {
  try {
    await apiPut('/files/audit', log);
  } catch (err) {
    console.error('[filesAPI] saveAuditLog:', err);
  }
}

export async function appendAuditEntry(entry: any): Promise<void> {
  try {
    await apiPost('/files/audit', entry);
  } catch (err) {
    console.error('[filesAPI] appendAuditEntry:', err);
  }
}
