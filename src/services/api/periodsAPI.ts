// @ts-nocheck
/**
 * periodsAPI.ts — implementación API para liquidaciones (períodos).
 * Expone las mismas funciones que localStorage/periodsStorage.ts pero usando fetch().
 *
 * Endpoints esperados en el backend:
 *   GET  /api/periods          → devuelve Period[]
 *   PUT  /api/periods          → reemplaza lista completa (body: Period[])
 *   GET  /api/periods/selected → devuelve { id: string }
 *   PUT  /api/periods/selected → guarda seleccionado (body: { id: string })
 *
 * IMPORTANTE para Cómputos:
 *   El campo `locked` solo puede ser modificado por roles admin y superadmin.
 *   Validar en el middleware de autenticación del endpoint PUT /api/periods.
 */
import { apiGet, apiPut } from './client';

export async function getAll(): Promise<any[]> {
  try {
    return await apiGet('/periods');
  } catch (err) {
    console.error('[periodsAPI] getAll:', err);
    return [];
  }
}

export async function saveAll(periods: any[]): Promise<void> {
  try {
    await apiPut('/periods', periods);
  } catch (err) {
    console.error('[periodsAPI] saveAll:', err);
  }
}

export async function getSelected(): Promise<string> {
  try {
    const data = await apiGet<{ id: string }>('/periods/selected');
    return data?.id || '';
  } catch (err) {
    console.error('[periodsAPI] getSelected:', err);
    return '';
  }
}

export async function saveSelected(id: string): Promise<void> {
  try {
    await apiPut('/periods/selected', { id });
  } catch (err) {
    console.error('[periodsAPI] saveSelected:', err);
  }
}
