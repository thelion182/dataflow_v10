// @ts-nocheck
import type { Reclamo, EstadoReclamo, HistorialEstado, NotificacionSimulada, NotaInterna } from '../../features/reclamos/types/reclamo.types';

const KEY = 'dataflow_reclamos';

export function getAll(): Reclamo[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

function saveAll(list: Reclamo[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function getById(id: string): Reclamo | null {
  return getAll().find((r) => r.id === id) || null;
}

export function create(data: Reclamo): Reclamo {
  const list = getAll();
  // Garantiza que notasInternas exista en registros nuevos
  if (!data.notasInternas) data.notasInternas = [];
  list.push(data);
  saveAll(list);
  return data;
}

export function update(id: string, changes: Partial<Reclamo>): Reclamo | null {
  const list = getAll();
  const idx = list.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  list[idx] = { ...list[idx], ...changes };
  saveAll(list);
  return list[idx];
}

export function softDelete(
  id: string,
  usuarioId: string,
  usuarioNombre: string,
  nota?: string
): Reclamo | null {
  const list = getAll();
  const idx = list.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  const entrada: HistorialEstado = {
    estado: 'Eliminado',
    fecha: new Date().toISOString(),
    usuarioId,
    usuarioNombre,
    nota,
  };
  list[idx] = {
    ...list[idx],
    eliminado: true,
    estado: 'Eliminado',
    historialEstados: [...list[idx].historialEstados, entrada],
  };
  saveAll(list);
  return list[idx];
}

export function updateEstado(
  id: string,
  estado: EstadoReclamo,
  usuarioId: string,
  usuarioNombre: string,
  nota?: string,
  _estadoAnterior?: string
): Reclamo | null {
  const list = getAll();
  const idx = list.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  const entrada: HistorialEstado = {
    estado,
    fecha: new Date().toISOString(),
    usuarioId,
    usuarioNombre,
    nota,
  };
  list[idx] = {
    ...list[idx],
    estado,
    historialEstados: [...list[idx].historialEstados, entrada],
  };
  saveAll(list);
  return list[idx];
}

export function addNotificacion(
  id: string,
  notificacion: NotificacionSimulada
): Reclamo | null {
  const list = getAll();
  const idx = list.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  list[idx] = {
    ...list[idx],
    notificaciones: [...list[idx].notificaciones, notificacion],
  };
  saveAll(list);
  return list[idx];
}

export function addNotaInterna(
  id: string,
  nota: NotaInterna
): Reclamo | null {
  const list = getAll();
  const idx = list.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  const notasExistentes = list[idx].notasInternas || [];
  list[idx] = {
    ...list[idx],
    notasInternas: [...notasExistentes, nota],
  };
  saveAll(list);
  return list[idx];
}
