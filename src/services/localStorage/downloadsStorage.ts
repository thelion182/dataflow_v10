// @ts-nocheck
/**
 * downloadsStorage.ts
 * Abstracción de persistencia para contadores y logs de descarga.
 *
 * MIGRACIÓN A BACKEND:
 * Reemplazar este archivo por src/services/api/downloadsAPI.ts.
 * Los contadores de numeración por usuario deben vivir en la BD
 * para garantizar unicidad entre sesiones concurrentes.
 */

const KEY_COUNTERS = 'dataflow-downloadCounters';
const KEY_DOWNLOADED = 'dataflow-downloadedFiles';
const KEY_LOGS = 'dataflow-downloadLogs';

export function getCounters(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(KEY_COUNTERS) || '{}');
  } catch {
    return {};
  }
}

export function saveCounters(counters: Record<string, number>): void {
  try {
    localStorage.setItem(KEY_COUNTERS, JSON.stringify(counters));
  } catch {}
}

export function getDownloadedFiles(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(KEY_DOWNLOADED) || '{}');
  } catch {
    return {};
  }
}

export function saveDownloadedFiles(downloaded: Record<string, boolean>): void {
  try {
    localStorage.setItem(KEY_DOWNLOADED, JSON.stringify(downloaded));
  } catch {}
}

export function getLogs(): any[] {
  try {
    return JSON.parse(localStorage.getItem(KEY_LOGS) || '[]');
  } catch {
    return [];
  }
}

export function saveLogs(logs: any[]): void {
  try {
    localStorage.setItem(KEY_LOGS, JSON.stringify(logs));
  } catch {}
}
