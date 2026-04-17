// @ts-nocheck
/**
 * downloadsAPI.ts — implementación API para contadores y logs de descarga.
 * Expone las mismas funciones que localStorage/downloadsStorage.ts pero usando fetch().
 *
 * Endpoints esperados en el backend:
 *   GET  /api/downloads/counters    → devuelve Record<string, number>
 *   PUT  /api/downloads/counters    → guarda counters (body: Record<string, number>)
 *   GET  /api/downloads/downloaded  → devuelve Record<string, boolean>
 *   PUT  /api/downloads/downloaded  → guarda downloaded (body: Record<string, boolean>)
 *   GET  /api/downloads/logs        → devuelve DownloadLog[]
 *   PUT  /api/downloads/logs        → guarda logs (body: DownloadLog[])
 *
 * IMPORTANTE para Cómputos:
 *   Los contadores de numeración (counters) deben ser atómicos en el backend
 *   para garantizar unicidad entre sesiones concurrentes.
 *   Considerar usar un endpoint POST /api/downloads/counters/increment
 *   que devuelva el próximo número de forma atómica (SELECT … FOR UPDATE).
 *   Ver BACKEND_GUIDE.md sección "Numeración de descargas".
 */
import { apiGet, apiPut } from './client';

export async function getCounters(): Promise<Record<string, number>> {
  try {
    return await apiGet('/downloads/counters');
  } catch (err) {
    console.error('[downloadsAPI] getCounters:', err);
    return {};
  }
}

export async function saveCounters(counters: Record<string, number>): Promise<void> {
  try {
    await apiPut('/downloads/counters', counters);
  } catch (err) {
    console.error('[downloadsAPI] saveCounters:', err);
  }
}

export async function getDownloadedFiles(): Promise<Record<string, boolean>> {
  try {
    return await apiGet('/downloads/downloaded');
  } catch (err) {
    console.error('[downloadsAPI] getDownloadedFiles:', err);
    return {};
  }
}

export async function saveDownloadedFiles(files: Record<string, boolean>): Promise<void> {
  try {
    await apiPut('/downloads/downloaded', files);
  } catch (err) {
    console.error('[downloadsAPI] saveDownloadedFiles:', err);
  }
}

export async function getLogs(): Promise<any[]> {
  try {
    return await apiGet('/downloads/logs');
  } catch (err) {
    console.error('[downloadsAPI] getLogs:', err);
    return [];
  }
}

export async function saveLogs(logs: any[]): Promise<void> {
  try {
    await apiPut('/downloads/logs', logs);
  } catch (err) {
    console.error('[downloadsAPI] saveLogs:', err);
  }
}
