// @ts-nocheck
/**
 * usersStorage.ts
 * Abstracción de persistencia para usuarios y sesión.
 *
 * MIGRACIÓN A BACKEND:
 * Reemplazar este archivo por src/services/api/authAPI.ts.
 * - login() debe llamar a POST /api/auth/login (con LDAP/AD o JWT)
 * - getSession() puede usar cookies HttpOnly en lugar de localStorage
 * - La lista de usuarios se gestiona desde el backend (no hay CRUD local)
 */
import { STORAGE_KEY_USERS, STORAGE_KEY_SESSION } from '../../lib/storage';

export function getAll(): any[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_USERS) || '[]');
  } catch {
    return [];
  }
}

export function saveAll(users: any[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
  } catch {}
}

export function getById(id: string): any | null {
  return getAll().find(u => u.id === id) || null;
}

export function upsert(user: any): void {
  const list = getAll();
  const i = list.findIndex(u => u.id === user.id);
  if (i >= 0) list[i] = user; else list.push(user);
  saveAll(list);
}

export function getSession(): any | null {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_SESSION) || 'null');
  } catch {
    return null;
  }
}

export function saveSession(session: any): void {
  if (session) localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
  else localStorage.removeItem(STORAGE_KEY_SESSION);
}
