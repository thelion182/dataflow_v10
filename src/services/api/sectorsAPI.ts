// @ts-nocheck
import { apiGet, apiPut } from './client';

export async function getAllSectors(): Promise<any[]> {
  try {
    const data = await apiGet('/sectors');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function saveSectors(sectors: any[]): Promise<void> {
  try {
    await apiPut('/sectors', sectors || []);
  } catch (err) {
    console.error('[sectorsAPI] saveSectors:', err);
  }
}

export async function getAllSites(): Promise<any[]> {
  try {
    const data = await apiGet('/sectors/sites');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function saveSites(sites: any[]): Promise<void> {
  try {
    await apiPut('/sectors/sites', sites || []);
  } catch (err) {
    console.error('[sectorsAPI] saveSites:', err);
  }
}
