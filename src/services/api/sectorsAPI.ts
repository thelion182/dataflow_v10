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

export async function getAllSectors(): Promise<any[]> {
  try {
    return await apiGet('/sectors');
  } catch (err) {
    console.error('[sectorsAPI] getAllSectors:', err);
    return [];
  }
}

export async function saveSectors(sectors: any[]): Promise<void> {
  try {
    await apiPut('/sectors', sectors);
  } catch (err) {
    console.error('[sectorsAPI] saveSectors:', err);
  }
}

export async function getAllSites(): Promise<any[]> {
  try {
    return await apiGet('/sites');
  } catch (err) {
    console.error('[sectorsAPI] getAllSites:', err);
    return [];
  }
}

export async function saveSites(sites: any[]): Promise<void> {
  try {
    await apiPut('/sites', sites);
  } catch (err) {
    console.error('[sectorsAPI] saveSites:', err);
  }
}
