// @ts-nocheck
/**
 * reclamosAPI.ts — implementación API para el módulo de Reclamos.
 * Expone las mismas funciones que localStorage/reclamosStorage.ts pero usando fetch().
 *
 * Endpoints esperados en el backend:
 *   GET    /api/reclamos                     → devuelve Reclamo[]
 *   POST   /api/reclamos                     → crea reclamo (body: Reclamo) → devuelve Reclamo
 *   GET    /api/reclamos/:id                 → devuelve Reclamo
 *   PATCH  /api/reclamos/:id                 → actualiza parcial (body: Partial<Reclamo>)
 *   DELETE /api/reclamos/:id                 → soft-delete (body: { usuarioId, usuarioNombre, nota? })
 *   POST   /api/reclamos/:id/estado          → cambia estado (body: { estado, usuarioId, usuarioNombre, nota? })
 *   POST   /api/reclamos/:id/notificaciones  → agrega notificación (body: NotificacionSimulada)
 *   POST   /api/reclamos/:id/notas           → agrega nota interna (body: NotaInterna)
 */
import { apiDelete, apiGet, apiPatch, apiPost } from './client';

export async function getAll(): Promise<any[]> {
  try {
    return await apiGet('/reclamos');
  } catch (err) {
    console.error('[reclamosAPI] getAll:', err);
    return [];
  }
}

export async function getById(id: string): Promise<any | null> {
  try {
    return await apiGet(`/reclamos/${id}`);
  } catch (err) {
    console.error('[reclamosAPI] getById:', err);
    return null;
  }
}

export async function create(data: any): Promise<any> {
  try {
    if (!data.notasInternas) data.notasInternas = [];
    return await apiPost('/reclamos', data);
  } catch (err) {
    console.error('[reclamosAPI] create:', err);
    return data;
  }
}

export async function update(id: string, changes: any): Promise<any | null> {
  try {
    return await apiPatch(`/reclamos/${id}`, changes);
  } catch (err) {
    console.error('[reclamosAPI] update:', err);
    return null;
  }
}

export async function softDelete(
  id: string,
  usuarioId: string,
  usuarioNombre: string,
  nota?: string
): Promise<any | null> {
  try {
    return await apiDelete(`/reclamos/${id}`, { usuarioId, usuarioNombre, nota });
  } catch (err) {
    console.error('[reclamosAPI] softDelete:', err);
    return null;
  }
}

export async function updateEstado(
  id: string,
  estado: string,
  usuarioId: string,
  usuarioNombre: string,
  nota?: string
): Promise<any | null> {
  try {
    return await apiPost(`/reclamos/${id}/estado`, { estado, usuarioId, usuarioNombre, nota });
  } catch (err) {
    console.error('[reclamosAPI] updateEstado:', err);
    return null;
  }
}

export async function addNotificacion(id: string, notificacion: any): Promise<any | null> {
  try {
    return await apiPost(`/reclamos/${id}/notificaciones`, notificacion);
  } catch (err) {
    console.error('[reclamosAPI] addNotificacion:', err);
    return null;
  }
}

export async function addNotaInterna(id: string, nota: any): Promise<any | null> {
  try {
    return await apiPost(`/reclamos/${id}/notas`, nota);
  } catch (err) {
    console.error('[reclamosAPI] addNotaInterna:', err);
    return null;
  }
}
