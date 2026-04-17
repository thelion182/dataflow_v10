import { STATUS } from "../types";

export const ROLE_DEFAULT_PERMISSIONS = {
  rrhh: {
    allowedStatuses: ["cargado","actualizado","listo","duda_respondida","sustituido","eliminado"],
    actions: { bumpVersion:true, download:true, markDownloaded:false, createPeriod:false, manageUsers:false, exportCSV:false, exportDoubts:false, hardDelete:false, resetPeriod:false },
  },
  sueldos: {
    allowedStatuses: ["observado","descargado"],
    actions: { bumpVersion:false, download:true, markDownloaded:true, createPeriod:false, manageUsers:false, exportCSV:false, exportDoubts:true, hardDelete:false, resetPeriod:false },
  },
  admin: {
    allowedStatuses: STATUS.map(s=>s.key),
    actions: { bumpVersion:true, download:true, markDownloaded:true, createPeriod:true, manageUsers:true, exportCSV:true, exportDoubts:true, hardDelete:false, resetPeriod:false },
  },
  superadmin: {
    allowedStatuses: STATUS.map(s=>s.key),
    actions: { bumpVersion:true, download:true, markDownloaded:true, createPeriod:true, manageUsers:true, exportCSV:true, exportDoubts:true, hardDelete:true, resetPeriod:true },
  },
};

export function getUserEffectivePermissions(user: any){
  const role = user?.role || "rrhh";
  const roleDefaults = structuredClone(ROLE_DEFAULT_PERMISSIONS[role] || ROLE_DEFAULT_PERMISSIONS.rrhh);
  if(!user?.permissions || !user.permissions.actions || !Array.isArray(user.permissions.allowedStatuses)){
    return roleDefaults;
  }
  return {
    allowedStatuses: Array.from(new Set(user.permissions.allowedStatuses || roleDefaults.allowedStatuses)),
    actions: { ...roleDefaults.actions, ...(user.permissions.actions || {}) },
  };
}

