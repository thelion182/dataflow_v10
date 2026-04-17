// @ts-nocheck
/**
 * sectorsStorage.ts
 * Abstracción de persistencia para Sectores y Sedes.
 *
 * MIGRACIÓN A BACKEND:
 * Reemplazar este archivo por src/services/api/sectorsAPI.ts.
 * Actualizar la entrada db.sectors en db.ts.
 */
import { STORAGE_KEY_SECTORS, STORAGE_KEY_SITES } from '../../lib/storage';

export function getAllSectors(): any[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_SECTORS) || '[]');
  } catch {
    return [];
  }
}

export function saveSectors(sectors: any[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_SECTORS, JSON.stringify(sectors));
  } catch {}
}

export function getAllSites(): any[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_SITES) || '[]');
  } catch {
    return [];
  }
}

export function saveSites(sites: any[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_SITES, JSON.stringify(sites));
  } catch {}
}
