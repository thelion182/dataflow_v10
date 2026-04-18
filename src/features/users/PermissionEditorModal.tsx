// @ts-nocheck
import React, { useState } from "react";
import { getUserById, adminSetPermissions } from "../../lib/auth";
import { getUserEffectivePermissions } from "../../lib/perms";

const ACTION_GROUPS = [
  {
    label: "Módulo Archivos",
    items: [
      ["bumpVersion",    "Cargar / sustituir archivos"],
      ["download",       "Descargar archivos"],
      ["markDownloaded", "Marcar como descargado"],
      ["marcarDuda",     "Marcar dudas en archivos"],
      ["responderDuda",  "Responder dudas"],
      ["procesarDudas",  "Procesar dudas / arreglos"],
    ],
  },
  {
    label: "Módulo Reclamos",
    items: [
      ["crearReclamo",      "Crear reclamos"],
      ["gestionarReclamos", "Gestionar reclamos (estado / notas)"],
    ],
  },
  {
    label: "Administración",
    items: [
      ["createPeriod", "Crear liquidaciones"],
      ["manageUsers",  "Gestionar usuarios"],
      ["exportCSV",    "Exportar CSV"],
      ["exportDoubts", "Exportar dudas / respondidas"],
    ],
  },
];

export function PermissionEditorModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const user = getUserById(userId);
  const basePerms = getUserEffectivePermissions(user);
  const [actions, setActions] = useState<any>(basePerms.actions || {});

  const isFixed = user?.role === "admin" || user?.role === "superadmin";

  function toggleAction(key: string, checked: boolean) {
    setActions((prev: any) => ({ ...prev, [key]: checked }));
  }

  function save() {
    const perms = { allowedStatuses: basePerms.allowedStatuses, actions: { ...actions } };
    const res = adminSetPermissions(userId, perms);
    if (!(res as any).ok) { alert((res as any).error || "No se pudieron guardar los permisos."); return; }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold">Permisos — {user?.displayName || user?.username}</h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Rol: <span className="text-neutral-300">{user?.role}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-200">Cerrar</button>
        </div>

        {isFixed ? (
          <div className="rounded-xl border border-neutral-700 bg-neutral-800/40 p-4 text-sm text-neutral-300 text-center">
            <span className="font-medium text-neutral-100">{user?.role === "superadmin" ? "Super Administrador" : "Administrador"}</span>
            {" "}tiene acceso completo a todas las funciones del sistema.
            <br />Los permisos de este rol no son editables.
          </div>
        ) : (
          <div className="space-y-4">
            {ACTION_GROUPS.map(group => (
              <div key={group.label} className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-3">
                <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-2">{group.label}</h4>
                <div className="space-y-1.5">
                  {group.items.map(([k, label]) => (
                    <label key={k} className="flex items-center gap-2 text-sm cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={!!actions[k]}
                        onChange={(e) => toggleAction(k, e.target.checked)}
                        className="rounded"
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 hover:bg-neutral-800 text-sm">Cancelar</button>
          {!isFixed && (
            <button onClick={save} className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-sm">Guardar</button>
          )}
        </div>
      </div>
    </div>
  );
}
