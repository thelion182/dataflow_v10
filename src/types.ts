// src/types.ts

// =========================
// Estados posibles del archivo
// =========================
//
// OJO: las keys tienen que matchear EXACTO lo que usa tu app:
// - f.status
// - statusOverride
// - effectiveStatus(f)
// - allowedStatuses en permisos
//
// Y los labels son lo que se muestra en la UI.

export const STATUS = [
  { key: "cargado",             label: "Enviado" },              // subido por RRHH
  { key: "observado",           label: "Observado" },            // sueldos marcó dudas
  { key: "con_dudas",           label: "Con dudas" },            // auto: tiene dudas sin responder
  { key: "duda_respondida",     label: "Duda respondida" },      // RRHH contestó todo
  { key: "pend_procesar",       label: "Pend. de procesar" },    // auto: respondida, sin procesar
  { key: "descargado",          label: "Descargado" },           // Sueldos descargó
  { key: "procesado",           label: "Procesado" },            // auto: todo procesado
  { key: "listo",               label: "Listo" },                // para estados forzados
  { key: "actualizado",         label: "Actualizado" },          // nueva versión subida
  { key: "sustituido",          label: "Sustituido" },           // archivo reemplazado
  { key: "eliminado",           label: "Eliminado" },            // admin borró
];

// =========================
// Roles válidos
// =========================
//
// Esto lo usás por ejemplo en ProfileModal:
// ROLES.find(r => r.key === me.role)?.label

export const ROLES = [
  { key: "rrhh",       label: "Información (RRHH)" },
  { key: "sueldos",    label: "Sueldos" },
  { key: "admin",      label: "Administrador" },
  { key: "superadmin", label: "Super Administrador" },
];

// =========================
// Tipo de permisos efectivos
// =========================
//
// getUserEffectivePermissions(user) devuelve algo así.
// Lo usamos para saber qué botones habilitar: bumpVersion, download, etc.

export type UserActionsPermissions = {
  bumpVersion?: boolean;      // subir / sustituir archivo
  download?: boolean;         // descargar
  markDownloaded?: boolean;   // marcar como descargado
  createPeriod?: boolean;     // crear liquidaciones
  manageUsers?: boolean;      // abrir modal usuarios
  exportCSV?: boolean;        // exportar reportes
  hardDelete?: boolean;       // eliminar físico (solo superadmin)
  resetPeriod?: boolean;      // borrar todos los archivos de una liquidación (solo superadmin)
};

export type UserPermissions = {
  allowedStatuses: string[] | Set<string>;
  actions: UserActionsPermissions;
};

// =========================
// Usuario de la app (localStorage)
// =========================
//
// Este tipo tiene que alinear con:
// - ensureDefaultAdminSync()
// - adminCreateUser()
// - adminSetRole()
// - ProfileModal
// - UserAdminModal
// - login
//
// IMPORTANTÍSIMO: acá agregamos rangeStart / rangeEnd
// para el rango numérico exclusivo de cada usuario de Sueldos.
// También mantenemos mustChangePassword, etc.

export type AppUser = {
  id: string;
  username: string;
  role: "rrhh" | "sueldos" | "admin" | "superadmin";

  passwordHash: string;
  mustChangePassword: boolean;

  active: boolean;
  loginAttempts: number;
  lockedUntil: string; // ISO string o ""

  createdAt: string;   // ISO
  lastLoginAt: string; // ISO o ""

  displayName: string;
  title: string;
  avatarDataUrl: string; // data URL base64 para el perfil

  // permisos efectivos/overrides guardados en el user
  permissions: UserPermissions;

  // 🔥 Rango de numeración fijo que le asigna el admin
  // para generar el prefijo del archivo descargado.
  // Ejemplo: Ana -> 1..99, Pedro -> 100..199, etc.
  // Se reutiliza en TODAS las liquidaciones.
  rangeStart?: number;
  rangeEnd?: number;
};

// =========================
// (Opcional) pequeños tipos de ayuda para archivos,
// si querés tenerlos tipados en el futuro.
//
// NO es obligatorio para que compile la app.
// Lo dejo por prolijidad, pero podés borrarlo si
// te rompe algo en tu build TS (no debería).
// =========================

export type AppFileHistoryEntry = {
  t: string; // ISO date
  action: string; // "Cargado", "Descargado", etc.
  byUserId: string;
  byUsername: string;
  details?: string;
};

export type AppObservationRow = {
  id: string;
  nro: string;
  nombre: string;
  duda: string;
  sector: string;
  cc: string;
  answered: boolean;
  answerText: string;
  answeredByUsername: string;
  answeredByUserId: string;
  answeredAt: string; // ISO
};


export type AppObservationThread = {
  id: string;
  createdAt: string; // ISO
  byUsername: string;
  byUserId: string;
  rows: AppObservationRow[];
};

export type AppFile = {
  id: string;
  name: string;
  size: number;
  type: string;

  status: string;
  statusOverride?: string;

  siteId?: string | null;
  siteName?: string | null;
  // ✅ para trazabilidad y vista por sector
  siteCode?: string | null;
  // 🔽 NUEVO: info de sector asociada al archivo
  sectorId?: string | null;
  sectorName?: string | null;
  noNews?: boolean;

  version: number;
  byUsername: string;
  byUserId: string;
  at: string;
  downloadedAt?: string;
  notes: string;

  blobUrl?: string;
  periodId: string;

  history: AppFileHistoryEntry[];
  observations: AppObservationThread[];
};

// ===================================
// Sectores (para vincular archivos)
// ===================================

export type SectorConfig = {
  id: string;
  name: string;
  patterns: string[];
  active: boolean;

  requiredCount: number;
  allowNoNews: boolean;

  // ✅ la regla aplica a esta sede
  siteCode: string; // "SG", "SC", "JPII" (o vacío si no aplica)

  // Centro de costo del sector
  cc?: string;

  // Responsable RRHH asignado a esta regla
  ownerUserId?: string | null;
  ownerUsername?: string | null;
};


export type SiteConfig = {
  id: string;
  code: string;        // "SG", "SC", "JPII", "F01"...
  name: string;        // "Sanatorio Galicia", etc.
  patterns: string[];  // fallback: "galicia", "central"...
  active: boolean;
};

export type DownloadLogEntry = {
  usuarioId: string;
  usuarioNombre: string;
  liquidacionId: string;
  numeroAsignado: number;
  archivoId: string;
  archivoNombreOriginal: string;
  timestamp: string;
};
