import { STORAGE_KEY_SESSION, STORAGE_KEY_USERS } from "./storage";
import { nowISO } from "./time";
import { uuid } from "./ids";
import { getUserEffectivePermissions, ROLE_DEFAULT_PERMISSIONS } from "./perms";
import type { AppUser } from "../types";
import { logAudit } from "./audit";

const USE_API = import.meta.env.VITE_USE_API === 'true';
const _rawApiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '');
const API_URL = _rawApiUrl.replace(/^(https?:\/\/)localhost(:\d+)?/, `$1${window.location.hostname}$2`);

export async function sha256(input: string) {
  const enc = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ======================================================
// USERS LOAD/SAVE
// ======================================================

export function loadUsers(): AppUser[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_USERS) || "[]");
  } catch {
    return [];
  }
}

export function saveUsers(arr: AppUser[]) {
  localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(arr));
}

export function replaceUsers(newList: AppUser[]) {
  saveUsers(newList);
}

export function upsertUser(user: AppUser) {
  const list = loadUsers();
  const i = list.findIndex((u) => u.id === user.id);
  if (i >= 0) list[i] = user;
  else list.push(user);
  saveUsers(list);
  if (USE_API) {
    fetch(`${API_URL}/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(user),
    }).catch(() => {});
  }
}

// ======================================================
// SESSION
// ======================================================

export function getSession() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_SESSION) || "null");
  } catch {
    return null;
  }
}

export function setSession(session: any) {
  if (session) localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
  else localStorage.removeItem(STORAGE_KEY_SESSION);
}

export function logout() {
  logAudit({ modulo: 'auth', accion: 'logout' });
  if (USE_API) {
    fetch(`${API_URL}/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
  }
  setSession(null);
}

// SHA-256 de "Admin-1234"
export const DEFAULT_ADMIN_HASH =
  "daf153b6353b19a9f426ed6d5b7a25c1d29d9598515031bf571c799d05c37214";

// SHA-256 de "Super-1234"
export const DEFAULT_SUPERADMIN_HASH =
  "39b8847c5a6619852c34d0672b85c36ac68bcdcc5ccaf7b28e8b223d1292eeb6";

// ======================================================
// DEFAULT ADMIN (BOOTSTRAP DEMO)
// ======================================================

export function ensureDefaultAdminSync() {
  const users = loadUsers();
  if (users.length === 0) {
    const admin: AppUser = {
      id: uuid(),
      username: "admin",
      role: "admin",
      passwordHash: DEFAULT_ADMIN_HASH,
      mustChangePassword: true,
      active: true,
      loginAttempts: 0,
      lockedUntil: "",
      createdAt: nowISO(),
      lastLoginAt: "",
      displayName: "Administrador",
      title: "Admin",
      avatarDataUrl: "",
      permissions: structuredClone(ROLE_DEFAULT_PERMISSIONS.admin),
      rangeStart: undefined,
      rangeEnd: undefined,
    };
    const superadmin: AppUser = {
      id: uuid(),
      username: "superadmin",
      role: "superadmin",
      passwordHash: DEFAULT_SUPERADMIN_HASH,
      mustChangePassword: true,
      active: true,
      loginAttempts: 0,
      lockedUntil: "",
      createdAt: nowISO(),
      lastLoginAt: "",
      displayName: "Super Administrador",
      title: "SuperAdmin",
      avatarDataUrl: "",
      permissions: structuredClone(ROLE_DEFAULT_PERMISSIONS.superadmin),
      rangeStart: undefined,
      rangeEnd: undefined,
    };
    saveUsers([admin, superadmin]);
  } else {
    // Si ya hay usuarios pero no existe ningún superadmin, crearlo
    const hasSuperAdmin = users.some((u) => u.role === "superadmin");
    if (!hasSuperAdmin) {
      const superadmin: AppUser = {
        id: uuid(),
        username: "superadmin",
        role: "superadmin",
        passwordHash: DEFAULT_SUPERADMIN_HASH,
        mustChangePassword: true,
        active: true,
        loginAttempts: 0,
        lockedUntil: "",
        createdAt: nowISO(),
        lastLoginAt: "",
        displayName: "Super Administrador",
        title: "SuperAdmin",
        avatarDataUrl: "",
        permissions: structuredClone(ROLE_DEFAULT_PERMISSIONS.superadmin),
        rangeStart: undefined,
        rangeEnd: undefined,
      };
      saveUsers([...users, superadmin]);
    }
  }
}

// ======================================================
// LOGIN FLOW
// ======================================================

export async function attemptLogin(username: string, password: string) {
  if (USE_API) {
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        logAudit({ modulo: 'auth', accion: 'login_fallido', detalles: data.error || '', resultado: 'error', usuarioNombre: username });
        return { ok: false, error: data.error || 'Usuario o contraseña inválidos.' };
      }
      // Construir objeto compatible con el frontend y guardarlo en localStorage
      const u: AppUser = {
        id: data.id,
        username: data.username,
        displayName: data.displayName || data.username,
        role: data.role,
        active: true,
        mustChangePassword: data.mustChangePassword || false,
        permissions: structuredClone(ROLE_DEFAULT_PERMISSIONS[data.role] || ROLE_DEFAULT_PERMISSIONS.rrhh),
        rangeStart: data.rangeStart ?? undefined,
        rangeEnd: data.rangeEnd ?? undefined,
        rangeTxtStart: data.rangeTxtStart ?? undefined,
        rangeTxtEnd: data.rangeTxtEnd ?? undefined,
        passwordHash: '',
        loginAttempts: 0,
        lockedUntil: '',
        createdAt: '',
        lastLoginAt: nowISO(),
        title: data.role === 'rrhh' ? 'RRHH' : data.role === 'sueldos' ? 'Sueldos' : data.role === 'superadmin' ? 'SuperAdmin' : 'Admin',
        avatarDataUrl: '',
      };
      upsertUser(u);
      setSession({ userId: u.id });
      logAudit({ modulo: 'auth', accion: 'login', resultado: 'ok', usuarioId: u.id, usuarioNombre: u.displayName || u.username, usuarioRol: u.role });
      return { ok: true, user: u };
    } catch (err) {
      console.error('[auth] API login error:', err);
      return { ok: false, error: 'Error de conexión con el servidor.' };
    }
  }

  const users = loadUsers();
  const user = users.find(
    (u) => u.username.toLowerCase() === (username || "").toLowerCase()
  );
  if (!user) {
    logAudit({ modulo: 'auth', accion: 'login_fallido', detalles: `Usuario no encontrado: ${username}`, resultado: 'error', usuarioNombre: username });
    return { ok: false, error: "Usuario o contraseña inválidos." };
  }
  if (!user.active) {
    logAudit({ modulo: 'auth', accion: 'login_bloqueado', detalles: 'Usuario inactivo', resultado: 'bloqueado', usuarioId: user.id, usuarioNombre: user.displayName || user.username, usuarioRol: user.role });
    return { ok: false, error: "Usuario inactivo. Contactá al Administrador." };
  }

  // lockout
  if (user.lockedUntil) {
    const now = Date.now();
    const until = new Date(user.lockedUntil).getTime();
    if (now < until) {
      const leftMin = Math.ceil((until - now) / 60000);
      return {
        ok: false,
        error: `Usuario bloqueado. Reintentá en ${leftMin} min.`,
      };
    } else {
      // ya venció bloqueo → limpiar
      user.lockedUntil = "";
      user.loginAttempts = 0;
      upsertUser(user);
    }
  }

  const passHash = await sha256(password || "");
  if (passHash !== user.passwordHash) {
    user.loginAttempts = (user.loginAttempts || 0) + 1;
    if (user.loginAttempts >= 5) {
      user.lockedUntil = new Date(Date.now() + 5 * 60000).toISOString();
      upsertUser(user);
      logAudit({ modulo: 'auth', accion: 'login_bloqueado', detalles: 'Bloqueado por 5 min (muchos intentos)', resultado: 'bloqueado', usuarioId: user.id, usuarioNombre: user.displayName || user.username, usuarioRol: user.role });
      return {
        ok: false,
        error: "Muchos intentos fallidos. Bloqueado por 5 min.",
      };
    }
    upsertUser(user);
    logAudit({ modulo: 'auth', accion: 'login_fallido', detalles: `Intento ${user.loginAttempts} de 5`, resultado: 'error', usuarioId: user.id, usuarioNombre: user.displayName || user.username, usuarioRol: user.role });
    return { ok: false, error: "Usuario o contraseña inválidos." };
  }

  // login OK
  user.loginAttempts = 0;
  user.lockedUntil = "";
  user.lastLoginAt = nowISO();
  upsertUser(user);
  setSession({ userId: user.id });
  logAudit({ modulo: 'auth', accion: 'login', resultado: 'ok', usuarioId: user.id, usuarioNombre: user.displayName || user.username, usuarioRol: user.role });
  return { ok: true, user };
}

/**
 * Cambio de contraseña desde el usuario.
 * Se valida la contraseña actual antes de actualizar.
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
) {
  const users = loadUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx < 0) return { ok: false, error: "Usuario no encontrado." };

  // Validar contraseña actual
  const currHash = await sha256(currentPassword || "");
  if (currHash !== users[idx].passwordHash) {
    return { ok: false, error: "La contraseña actual no es correcta." };
  }

  // Guardar nueva contraseña
  users[idx].passwordHash = await sha256(newPassword || "");

  // Limpiar flag de "debe cambiar contraseña"
  users[idx].mustChangePassword = false;

  // Resetear intentos/bloqueos por las dudas
  users[idx].loginAttempts = 0;
  users[idx].lockedUntil = "";

  saveUsers(users);
  return { ok: true };
}

export function getUserById(id: string) {
  return loadUsers().find((u) => u.id === id) || null;
}

// helper expuesto (creo que lo usás en algún lado)
export function getUserEffectivePermissionsFromUser(u: AppUser | null) {
  return getUserEffectivePermissions(u);
}

// ======================================================
// ADMIN HELPERS
// ======================================================

/**
 * Crear un usuario nuevo.
 * - Si es de rol "sueldos", nace con rangeStart/rangeEnd = undefined para que el admin lo edite.
 */
export async function adminCreateUser({
  username,
  role,
  tempPassword,
  mustChangePassword = true,
  permissions = null,
}: any) {
  const users = loadUsers();
  if (
    users.some(
      (u) => u.username.toLowerCase() === (username || "").toLowerCase()
    )
  ) {
    return { ok: false, error: "Ya existe un usuario con ese nombre." };
  }

  const u: AppUser = {
    id: uuid(),
    username,
    role,
    passwordHash: await sha256(tempPassword || ""),
    mustChangePassword: !!mustChangePassword,

    active: true,
    loginAttempts: 0,
    lockedUntil: "",

    createdAt: nowISO(),
    lastLoginAt: "",

    displayName: username,
    title:
      role === "rrhh" ? "RRHH" : role === "sueldos" ? "Sueldos" : role === "superadmin" ? "SuperAdmin" : "Admin",
    avatarDataUrl: "",

    permissions: permissions
      ? structuredClone(permissions)
      : structuredClone(
          ROLE_DEFAULT_PERMISSIONS[role] || ROLE_DEFAULT_PERMISSIONS.rrhh
        ),

    rangeStart: undefined,
    rangeEnd: undefined,
  };

  users.push(u);
  saveUsers(users);

  if (USE_API) {
    try {
      const res = await fetch(`${API_URL}/users/${u.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...u, plainPassword: tempPassword }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        return { ok: false, error: d.error || 'Error al crear usuario en el servidor.' };
      }
    } catch {
      return { ok: false, error: 'Error de conexión al crear usuario.' };
    }
  }

  return { ok: true, user: u };
}

export async function adminResetPassword(
  userId: string,
  newTempPassword: string
) {
  const users = loadUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx < 0) return { ok: false, error: "Usuario no encontrado." };

  users[idx].passwordHash = await sha256(newTempPassword || "");
  users[idx].mustChangePassword = true;
  users[idx].loginAttempts = 0;
  users[idx].lockedUntil = "";
  saveUsers(users);

  if (USE_API) {
    try {
      const res = await fetch(`${API_URL}/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...users[idx], plainPassword: newTempPassword, mustChangePassword: true }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        return { ok: false, error: d.error || 'Error al actualizar contraseña en el servidor.' };
      }
    } catch {
      return { ok: false, error: 'Error de conexión al resetear contraseña.' };
    }
  }

  return { ok: true };
}

/**
 * Cambiar el rol.
 * - Actualiza el rol.
 * - Si el usuario no tiene permisos todavía, le asigna los del rol.
 * - Si el rol nuevo es "sueldos" y nunca tenía rangoStart/rangeEnd,
 *   los inicializa como undefined para que la UI pueda editarlos.
 * - NO borra rangos si deja de ser "sueldos". Así el admin puede volver
 *   a darle sueldos más tarde sin perder el histórico.
 */
export function adminSetRole(userId: string, role: any) {
  const users = loadUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx < 0) return { ok: false, error: "Usuario no encontrado." };

  users[idx].role = role;

  if (!users[idx].permissions) {
    users[idx].permissions = structuredClone(
      ROLE_DEFAULT_PERMISSIONS[role] || ROLE_DEFAULT_PERMISSIONS.rrhh
    );
  }

  saveUsers(users);

  if (USE_API) {
    fetch(`${API_URL}/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(users[idx]),
    }).catch(() => {});
  }

  return { ok: true };
}

export function adminSetActive(userId: string, active: boolean) {
  const users = loadUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx < 0) return { ok: false, error: "Usuario no encontrado." };

  users[idx].active = !!active;
  saveUsers(users);

  if (USE_API) {
    fetch(`${API_URL}/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(users[idx]),
    }).catch(() => {});
  }

  return { ok: true };
}

export function adminSetPermissions(userId: string, permissions: any) {
  const users = loadUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx < 0) return { ok: false, error: "Usuario no encontrado." };

  users[idx].permissions = structuredClone(permissions);
  saveUsers(users);
  return { ok: true };
}