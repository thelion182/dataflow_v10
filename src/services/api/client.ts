// @ts-nocheck
/**
 * client.ts — helper de fetch para todos los módulos API.
 *
 * Lee VITE_API_URL del entorno y agrega el token de sesión
 * (Authorization: Bearer <token>) si está disponible en localStorage.
 *
 * Cómputos: ajustar getToken() según el mecanismo de auth elegido
 * (JWT en localStorage, cookie HttpOnly, etc.).
 */

// Si VITE_API_URL usa "localhost" pero la app se está sirviendo desde otra IP (ej: Mac/iPhone
// accediendo por red local), reemplazar "localhost" por el hostname real del navegador.
const _configuredUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '');
const BASE_URL = _configuredUrl.replace(
  /^(https?:\/\/)localhost(:\d+)?/,
  `$1${window.location.hostname}$2`
);

function getToken(): string | null {
  try {
    // Ajustar según el campo donde se guarde el JWT al hacer login
    const session = JSON.parse(localStorage.getItem('fileflow-session') || 'null');
    return session?.token || null;
  } catch {
    return null;
  }
}

function buildHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extra,
  };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'GET',
    headers: buildHeaders(),
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`GET ${path} → ${res.status} ${res.statusText}`);
  return res.json();
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: buildHeaders(),
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`POST ${path} → ${res.status} ${res.statusText}`);
  return res.json();
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'PUT',
    headers: buildHeaders(),
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`PUT ${path} → ${res.status} ${res.statusText}`);
  return res.json();
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'PATCH',
    headers: buildHeaders(),
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`PATCH ${path} → ${res.status} ${res.statusText}`);
  return res.json();
}

export async function apiDelete<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'DELETE',
    headers: buildHeaders(),
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`DELETE ${path} → ${res.status} ${res.statusText}`);
  return res.json();
}
