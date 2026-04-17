// @ts-nocheck
/**
 * usersAPI.ts — implementación API para usuarios y sesión.
 * Expone las mismas funciones que localStorage/usersStorage.ts pero usando fetch().
 *
 * Endpoints esperados en el backend:
 *   GET   /api/users        → devuelve User[] (solo admin/superadmin)
 *   PUT   /api/users        → reemplaza lista (solo superadmin)
 *   GET   /api/users/:id    → devuelve User
 *   PUT   /api/users/:id    → crea o actualiza User
 *   GET   /api/auth/session → devuelve { userId } o 401
 *   POST  /api/auth/logout  → cierra sesión (invalida token/cookie)
 *
 * IMPORTANTE para Cómputos:
 *   - El login se maneja en lib/auth.ts → attemptLogin().
 *     Reemplazar la lógica SHA-256 local por POST /api/auth/login con LDAP/AD.
 *   - getSession() puede usar HttpOnly cookies en lugar de localStorage
 *     para mayor seguridad (ver BACKEND_GUIDE.md sección "Autenticación").
 *   - saveSession() con cookies se vuelve no-op (el backend maneja la cookie).
 */
import { apiGet, apiPut } from './client';

export async function getAll(): Promise<any[]> {
  try {
    return await apiGet('/users');
  } catch (err) {
    console.error('[usersAPI] getAll:', err);
    return [];
  }
}

export async function saveAll(users: any[]): Promise<void> {
  try {
    await apiPut('/users', users);
  } catch (err) {
    console.error('[usersAPI] saveAll:', err);
  }
}

export async function getById(id: string): Promise<any | null> {
  try {
    return await apiGet(`/users/${id}`);
  } catch (err) {
    console.error('[usersAPI] getById:', err);
    return null;
  }
}

export async function upsert(user: any): Promise<void> {
  try {
    await apiPut(`/users/${user.id}`, user);
  } catch (err) {
    console.error('[usersAPI] upsert:', err);
  }
}

export async function getSession(): Promise<{ userId: string } | null> {
  try {
    return await apiGet('/auth/session');
  } catch {
    // 401 es normal cuando no hay sesión activa
    return null;
  }
}

export async function saveSession(session: { userId: string } | null): Promise<void> {
  try {
    if (session === null) {
      // logout
      await apiPut('/auth/session', null);
    } else {
      await apiPut('/auth/session', session);
    }
  } catch (err) {
    console.error('[usersAPI] saveSession:', err);
  }
}
