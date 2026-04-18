import { STATUS } from "../types";

export const ROLE_DEFAULT_PERMISSIONS = {
  rrhh: {
    allowedStatuses: STATUS.map(s => s.key),
    actions: {
      bumpVersion: true,
      download: false,
      markDownloaded: false,
      marcarDuda: false,
      responderDuda: true,
      procesarDudas: false,
      crearReclamo: true,
      gestionarReclamos: false,
      createPeriod: false,
      manageUsers: false,
      exportCSV: false,
      exportDoubts: false,
      hardDelete: false,
      resetPeriod: false,
    },
  },
  sueldos: {
    allowedStatuses: STATUS.map(s => s.key),
    actions: {
      bumpVersion: false,
      download: true,
      markDownloaded: true,
      marcarDuda: true,
      responderDuda: false,
      procesarDudas: true,
      crearReclamo: false,
      gestionarReclamos: true,
      createPeriod: false,
      manageUsers: false,
      exportCSV: false,
      exportDoubts: true,
      hardDelete: false,
      resetPeriod: false,
    },
  },
  admin: {
    allowedStatuses: STATUS.map(s => s.key),
    actions: {
      bumpVersion: true,
      download: true,
      markDownloaded: true,
      marcarDuda: true,
      responderDuda: true,
      procesarDudas: true,
      crearReclamo: true,
      gestionarReclamos: true,
      createPeriod: true,
      manageUsers: true,
      exportCSV: true,
      exportDoubts: true,
      hardDelete: false,
      resetPeriod: false,
    },
  },
  superadmin: {
    allowedStatuses: STATUS.map(s => s.key),
    actions: {
      bumpVersion: true,
      download: true,
      markDownloaded: true,
      marcarDuda: true,
      responderDuda: true,
      procesarDudas: true,
      crearReclamo: true,
      gestionarReclamos: true,
      createPeriod: true,
      manageUsers: true,
      exportCSV: true,
      exportDoubts: true,
      hardDelete: true,
      resetPeriod: true,
    },
  },
};

export function getUserEffectivePermissions(user: any) {
  const role = user?.role || "rrhh";
  // Admin y superadmin siempre tienen los permisos completos de su rol, sin override
  if (role === "admin" || role === "superadmin") {
    return structuredClone(ROLE_DEFAULT_PERMISSIONS[role]);
  }
  const roleDefaults = structuredClone(ROLE_DEFAULT_PERMISSIONS[role] || ROLE_DEFAULT_PERMISSIONS.rrhh);
  if (!user?.permissions || !user.permissions.actions || !Array.isArray(user.permissions.allowedStatuses)) {
    return roleDefaults;
  }
  return {
    allowedStatuses: roleDefaults.allowedStatuses,
    actions: { ...roleDefaults.actions, ...(user.permissions.actions || {}) },
  };
}
