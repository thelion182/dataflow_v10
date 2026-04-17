// @ts-nocheck
/**
 * periodsStorage.ts
 * Abstracción de persistencia para Liquidaciones (períodos).
 *
 * MIGRACIÓN A BACKEND:
 * Reemplazar este archivo por src/services/api/periodsAPI.ts.
 * El campo `locked` debe poder setearse solo desde el rol superadmin.
 */
import { STORAGE_KEY_PERIODS, STORAGE_KEY_PERIOD_SELECTED } from '../../lib/storage';

export function getAll(): any[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_PERIODS) || '[]');
  } catch {
    return [];
  }
}

export function saveAll(periods: any[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_PERIODS, JSON.stringify(periods));
  } catch {}
}

export function getSelected(): string {
  try {
    return localStorage.getItem(STORAGE_KEY_PERIOD_SELECTED) || '';
  } catch {
    return '';
  }
}

export function saveSelected(periodId: string): void {
  try {
    if (periodId) localStorage.setItem(STORAGE_KEY_PERIOD_SELECTED, periodId);
    else localStorage.removeItem(STORAGE_KEY_PERIOD_SELECTED);
  } catch {}
}
