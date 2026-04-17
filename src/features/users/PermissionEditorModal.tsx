// @ts-nocheck
import React, { useState } from "react";
import { STATUS } from "../../types";
import { getUserById, adminSetPermissions } from "../../lib/auth";
import { getUserEffectivePermissions } from "../../lib/perms";

export function PermissionEditorModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const user = getUserById(userId);
  const basePerms = getUserEffectivePermissions(user);
  const [allowed, setAllowed] = useState<string[]>(basePerms.allowedStatuses || []);
  const [actions, setActions] = useState<any>(basePerms.actions || {});

  function toggleAllowed(key: string, checked: boolean) {
    setAllowed((prev) => {
      const set = new Set(prev);
      if (checked) set.add(key); else set.delete(key);
      return Array.from(set);
    });
  }
  function toggleAction(key: string, checked: boolean) {
    setActions((prev: any) => ({ ...prev, [key]: checked }));
  }

  function save() {
    const perms = { allowedStatuses: Array.from(new Set(allowed)), actions: { ...actions } };
    const res = adminSetPermissions(userId, perms);
    if (!(res as any).ok) { alert((res as any).error || "No se pudieron guardar los permisos."); return; }
    alert("Permisos actualizados.");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">Permisos — {user?.username}</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-200">Cerrar</button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-neutral-800 p-3 bg-neutral-900/40">
            <h4 className="font-medium mb-2">Estados permitidos</h4>
            <div className="grid grid-cols-1 gap-1">
              {STATUS.map(s => (
                <label key={s.key} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={allowed.includes(s.key)} onChange={(e) => toggleAllowed(s.key, e.target.checked)} />
                  <span>{s.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-800 p-3 bg-neutral-900/40">
            <h4 className="font-medium mb-2">Acciones permitidas</h4>
            <div className="grid grid-cols-1 gap-1 text-sm">
              {[
                ["bumpVersion", "Cargar / sustituir / nueva versión"],
                ["download", "Descargar archivos"],
                ["markDownloaded", "Marcar descargado"],
                ["createPeriod", "Crear liquidaciones"],
                ["manageUsers", "Gestionar usuarios"],
                ["exportCSV", "Exportar CSV"],
              ].map(([k, label]) => (
                <label key={k} className="flex items-center gap-2">
                  <input type="checkbox" checked={!!actions[k as keyof typeof actions]} onChange={(e) => toggleAction(k as any, e.target.checked)} />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-3">
          <button onClick={onClose} className="px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 hover:bg-neutral-800">Cancelar</button>
          <button onClick={save} className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700">Guardar</button>
        </div>
      </div>
    </div>
  );
}
