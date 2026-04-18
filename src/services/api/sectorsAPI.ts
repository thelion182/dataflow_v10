// @ts-nocheck
/**
 * sectorsAPI.ts — implementación API para sectores y sedes.
 * Expone las mismas funciones que localStorage/sectorsStorage.ts pero usando fetch().
 *
 * Endpoints esperados en el backend:
 *   GET  /api/sectors   → devuelve SectorConfig[]
 *   PUT  /api/sectors   → reemplaza lista completa (body: SectorConfig[])
 *   GET  /api/sites     → devuelve SiteConfig[]
 *   PUT  /api/sites     → reemplaza lista completa (body: SiteConfig[])
 */
import { apiGet, apiPut } from './client';

function getCurrentRole(): string {
  try { return JSON.parse(localStorage.getItem('fileflow-session') || '{}')?.role || ''; }
  catch { return ''; }
}

export async function getAllSectors(): Promise<any[]> {
  const data = await apiGet('/sectors');
  return Array.isArray(data) ? data : [];
}

export async function saveSectors(sectors: any[]): Promise<void> {
  if (!['admin', 'superadmin'].includes(getCurrentRole())) return;
  // Nunca enviar lista vacía al backend — podría borrar todo en la DB
  if (!sectors || sectors.length === 0) return;
  try {
    await apiPut('/sectors', sectors);
  } catch (err) {
    console.error('[sectorsAPI] saveSectors:', err);
  }
}

export async function getAllSites(): Promise<any[]> {
  const data = await apiGet('/sites');
  return Array.isArray(data) ? data : [];
}

export async function saveSites(sites: any[]): Promise<void> {
  if (!['admin', 'superadmin'].includes(getCurrentRole())) return;
  if (!sites || sites.length === 0) return;
  try {
    await apiPut('/sites', sites);
  } catch (err) {
    console.error('[sectorsAPI] saveSites:', err);
  }
}
