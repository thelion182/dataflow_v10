// @ts-nocheck
import React, { useState, useMemo, useEffect, useCallback } from "react";
import Avatar from "../../components/Avatar";
import {
  loadUsers,
  saveUsers,
  adminCreateUser,
  adminResetPassword,
  adminSetRole,
  adminSetActive,
  replaceUsers,
  upsertUser,
} from "../../lib/auth";
import { getUserEffectivePermissions } from "../../lib/perms";
import { ROLE_LABELS } from "../shared/constants";
import { db } from "../../services/db";

export function UserAdminModal({
  onClose,
  onOpenPermissions,
  meRole,
  onBorrarArchivosLiquidacion,
}: {
  onClose: () => void;
  onOpenPermissions: (userId: string) => void;
  meRole?: string;
  onBorrarArchivosLiquidacion?: () => void;
}) {
  const isSuperAdmin = meRole === "superadmin";
  const isAdminOrSuper = meRole === "admin" || meRole === "superadmin";
  const [q, setQ] = useState("");
  const [filterRole, setFilterRole] = useState<string>("");
  const [filterActive, setFilterActive] = useState<string>("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<"rrhh" | "sueldos" | "admin">("rrhh");
  const [tempPass, setTempPass] = useState("");
  const [mustChange, setMustChange] = useState(true);
  const [rangesDraft, setRangesDraft] = useState<Record<string, { start: string; end: string }>>({});

  const [users, setUsers] = useState<any[]>(() => loadUsers());

  // En modo API, recargar usuarios desde el backend al abrir el modal
  const reloadUsers = useCallback(() => {
    const result = db.users.getAll();
    if (result && typeof result.then === 'function') {
      result.then((arr: any) => {
        if (Array.isArray(arr) && arr.length > 0) {
          saveUsers(arr);   // actualiza localStorage como caché
          setUsers(arr);
        }
      }).catch(() => {});
    }
  }, []);

  useEffect(() => { reloadUsers(); }, []);

  const usersFiltered = useMemo(
    () =>
      users.filter((u: any) => {
        // Admin no ve superadmins; solo el superadmin los ve
        if (!isSuperAdmin && u.role === "superadmin") return false;
        // Filtro por rol
        if (filterRole && u.role !== filterRole) return false;
        // Filtro por estado activo
        if (filterActive === "activo" && !u.active) return false;
        if (filterActive === "inactivo" && u.active) return false;
        // Filtro de texto (nombre de usuario, nombre completo, rol)
        const qTrimmed = q.trim().toLowerCase();
        if (qTrimmed) {
          const text = `${u.username || ""} ${u.displayName || ""} ${ROLE_LABELS[u.role] || u.role || ""}`.toLowerCase();
          if (!text.includes(qTrimmed)) return false;
        }
        return true;
      }),
    [q, filterRole, filterActive, users, isSuperAdmin]
  );

  function isStrong(p: string) {
    return p.length >= 8 && /[a-zA-Z]/.test(p) && /\d/.test(p);
  }

  async function createUser() {
    const uname = username.trim();
    const pass = tempPass.trim();
    if (!uname || !pass) { alert("Usuario y contraseña temporal son obligatorios"); return; }
    if (users.some((u: any) => u.username.toLowerCase() === uname.toLowerCase())) { alert("Ese usuario ya existe"); return; }
    if (!isStrong(pass)) { alert("La contraseña temporal debe tener al menos 8 caracteres y combinar letras y números."); return; }
    const defaults = getUserEffectivePermissions({ role } as any);
    const res = await adminCreateUser({ username: uname, role, tempPassword: pass, mustChangePassword: mustChange, permissions: defaults });
    if (!(res as any).ok) { alert((res as any).error || "No se pudo crear."); return; }
    setUsername(""); setRole("rrhh"); setTempPass(""); setMustChange(true);
    reloadUsers();
  }

  async function resetPass(u: any) {
    const pass = prompt(`Nueva contraseña temporal para ${u.username}`);
    if (!pass) return;
    if (!isStrong(pass)) { alert("Debe tener al menos 8 caracteres, letras y números"); return; }
    const res: any = await adminResetPassword(u.id, pass);
    if (!res?.ok) { alert(res?.error || "No se pudo resetear."); return; }
    alert("Contraseña temporal actualizada. Se pedirá cambio al primer login.");
    reloadUsers();
  }

  function toggleActive(u: any) {
    const res = adminSetActive(u.id, !u.active);
    if (!(res as any).ok) alert((res as any).error || "No se pudo cambiar estado.");
    reloadUsers();
  }

  function changeRole(u: any, newRole: "rrhh" | "sueldos" | "admin") {
    const res = adminSetRole(u.id, newRole);
    if (!(res as any).ok) { alert((res as any).error || "No se pudo cambiar rol."); return; }
    reloadUsers();
  }

  function removeUser(u: any) {
    if (!confirm(`¿Eliminar usuario ${u.username}?`)) return;
    const rest = users.filter((x: any) => x.id !== u.id);
    replaceUsers(rest);
    reloadUsers();
  }

  function getRangeDraft(u: any) {
    if (rangesDraft[u.id]) return rangesDraft[u.id];
    return { start: u.rangeStart != null ? String(u.rangeStart) : "", end: u.rangeEnd != null ? String(u.rangeEnd) : "" };
  }

  function setRangeDraftField(u: any, field: "start" | "end", value: string) {
    setRangesDraft((prev) => {
      const prevForUser = prev[u.id] || getRangeDraft(u);
      return { ...prev, [u.id]: { ...prevForUser, [field]: value } };
    });
  }

  function saveRangeToUser(u: any) {
    const draft = getRangeDraft(u);
    const newStart = draft.start.trim() === "" ? undefined : Number(draft.start);
    const newEnd = draft.end.trim() === "" ? undefined : Number(draft.end);
    if ((draft.start.trim() !== "" && Number.isNaN(newStart)) || (draft.end.trim() !== "" && Number.isNaN(newEnd))) { alert("Rango inválido (deben ser números)."); return; }
    upsertUser({ ...u, rangeStart: newStart, rangeEnd: newEnd });
    alert("Rango guardado.");
    reloadUsers();
  }

  async function adjustLastNumberForUser(u: any) {
    const rawCounters = db.downloads.getCounters();
    let dc: any = {};
    const resolved = (rawCounters && typeof rawCounters.then === 'function')
      ? await rawCounters.catch(() => ({}))
      : rawCounters;
    if (resolved && typeof resolved === 'object') dc = resolved;

    const rawPerId = db.downloads.getSelectedPeriodId ? db.downloads.getSelectedPeriodId() : null;
    const perId = (typeof rawPerId === 'string' ? rawPerId : null)
      || localStorage.getItem("dataflow-period-selected") || "";

    if (!dc[perId]) dc[perId] = {};
    const currentVal = dc[perId][u.id] ?? (u.rangeStart != null ? u.rangeStart - 1 : 0);
    const newValStr = prompt(`Ajustar último número usado de ${u.username} en la liquidación actual (${perId}).\nValor actual: ${currentVal}\nNuevo valor (entre ${u.rangeStart ?? "?"} y ${u.rangeEnd ?? "?"}, o poné ${u.rangeStart != null ? u.rangeStart - 1 : "inicio-1"} para "todavía no usó ninguno"):`);
    if (newValStr == null) return;
    const newValNum = Number(newValStr);
    const minPermitido = u.rangeStart != null ? u.rangeStart - 1 : Number.NEGATIVE_INFINITY;
    const maxPermitido = u.rangeEnd != null ? u.rangeEnd : Number.POSITIVE_INFINITY;
    if (Number.isNaN(newValNum) || newValNum < minPermitido || newValNum > maxPermitido) { alert("Valor inválido."); return; }
    dc[perId][u.id] = newValNum;
    db.downloads.saveCounters(dc);
    alert("Último número ajustado.");
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-4xl max-h-[85vh] overflow-y-auto rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">Gestionar usuarios</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-200">Cerrar</button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Crear */}
          <div className="rounded-2xl border border-neutral-800 p-3 bg-neutral-900/40">
            <h4 className="font-medium mb-2">Nuevo usuario</h4>
            <div className="space-y-2">
              <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Usuario (ej: info.juana)" className="w-full px-3 py-2 rounded-xl bg-neutral-800 outline-none" />
              <select value={role} onChange={(e) => setRole(e.target.value as any)} className="w-full px-3 py-2 rounded-xl bg-neutral-800 outline-none">
                <option value="rrhh">Información (RRHH)</option>
                <option value="sueldos">Sueldos</option>
                <option value="admin">Administrador</option>
                {isSuperAdmin && <option value="superadmin">Super Administrador</option>}
              </select>
              <input type="password" value={tempPass} onChange={(e) => setTempPass(e.target.value)} placeholder="Contraseña temporal" className="w-full px-3 py-2 rounded-xl bg-neutral-800 outline-none" />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={mustChange} onChange={(e) => setMustChange(e.target.checked)} />
                <span>Forzar cambio al primer login</span>
              </label>
              <button onClick={createUser} className="w-full px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700">Crear</button>
            </div>
          </div>

          {/* Listado */}
          <div className="rounded-2xl border border-neutral-800 p-3 bg-neutral-900/40">
            <h4 className="font-medium mb-2">Usuarios</h4>
            <div className="flex flex-wrap gap-2 mb-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por nombre o usuario…"
                className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-neutral-800 outline-none text-sm"
              />
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="px-3 py-2 rounded-xl bg-neutral-800 outline-none text-sm"
              >
                <option value="">Todos los roles</option>
                <option value="rrhh">Información</option>
                <option value="sueldos">Sueldos</option>
                <option value="admin">Administrador</option>
                {isSuperAdmin && <option value="superadmin">Super Admin</option>}
              </select>
              <select
                value={filterActive}
                onChange={(e) => setFilterActive(e.target.value)}
                className="px-3 py-2 rounded-xl bg-neutral-800 outline-none text-sm"
              >
                <option value="">Todos</option>
                <option value="activo">Activos</option>
                <option value="inactivo">Inactivos</option>
              </select>
            </div>
            <div className="max-h-[50vh] overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-neutral-400">
                  <tr>
                    <th className="text-left px-2 py-1">Usuario</th>
                    <th className="text-left px-2 py-1">Rol / Rango / Último nro</th>
                    <th className="text-left px-2 py-1">Estado</th>
                    <th className="text-left px-2 py-1">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usersFiltered.map((u: any) => {
                    const draft = getRangeDraft(u);
                    const perId = localStorage.getItem("dataflow-period-selected") || "";
                    let lastNum = "—";
                    try {
                      const rawDc = localStorage.getItem("dataflow-downloadCounters");
                      const dc = rawDc ? JSON.parse(rawDc) : {};
                      const val = dc?.[perId]?.[u.id];
                      lastNum = val == null ? "—" : String(val);
                    } catch { lastNum = "—"; }

                    return (
                      <tr key={u.id} className="border-t border-neutral-800 align-top">
                        <td className="px-2 py-1 align-top">
                          <div className="text-neutral-200">{u.username}</div>
                        </td>
                        <td className="px-2 py-1 align-top">
                          <select value={u.role} onChange={(e) => changeRole(u, e.target.value as any)} className="px-2 py-1 rounded-lg bg-neutral-800 outline-none">
                            <option value="rrhh">Información</option>
                            <option value="sueldos">Sueldos</option>
                            <option value="admin">Administrador</option>
                            {isSuperAdmin && <option value="superadmin">Super Admin</option>}
                          </select>
                          {u.role === "sueldos" && (
                            <div className="mt-2 text-[11px] text-neutral-400 space-y-2">
                              <div className="flex flex-wrap items-center gap-1">
                                <span>Rango:</span>
                                <input type="number" className="w-16 px-2 py-1 rounded-lg bg-neutral-800 outline-none" value={draft.start} onChange={(e) => setRangeDraftField(u, "start", e.target.value)} placeholder="ini" />
                                <span>-</span>
                                <input type="number" className="w-16 px-2 py-1 rounded-lg bg-neutral-800 outline-none" value={draft.end} onChange={(e) => setRangeDraftField(u, "end", e.target.value)} placeholder="fin" />
                                <button onClick={() => saveRangeToUser(u)} className="px-2 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-[10px] border border-neutral-700">Guardar</button>
                              </div>
                              <div className="text-[10px] text-neutral-500 leading-snug">Esta franja es exclusiva de {u.username}. Se reutiliza en cada liquidación.</div>
                              <div className="text-[11px] text-neutral-400 leading-snug">
                                <div>Último nro usado (<span className="text-neutral-300">{perId || "sin liquidación"}</span>):</div>
                                <div className="text-neutral-200">{lastNum}</div>
                                <button onClick={() => adjustLastNumberForUser(u)} className="mt-1 px-2 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-[10px] border border-neutral-700">Ajustar</button>
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-1 align-top">{u.active ? "Activo" : "Inactivo"}</td>
                        <td className="px-2 py-1 align-top">
                          <div className="flex flex-wrap gap-2">
                            <button onClick={() => onOpenPermissions(u.id)} className="px-2 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs">Permisos</button>
                            <button onClick={() => resetPass(u)} className="px-2 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs">Reset pass</button>
                            <button onClick={() => toggleActive(u)} className="px-2 py-1 rounded-lg bg-neutral-900 border border-neutral-700 hover:bg-neutral-800 text-xs">{u.active ? "Desactivar" : "Activar"}</button>
                            {(u.role === "rrhh" || u.role === "sueldos") && isAdminOrSuper && onBorrarArchivosLiquidacion ? (
                              <button onClick={() => { if (confirm("¿Borrar TODOS los archivos de la liquidación actual? Esta acción no se puede deshacer.")) onBorrarArchivosLiquidacion(); }} className="px-2 py-1 rounded-lg bg-orange-900/30 border border-orange-800 hover:bg-orange-900/50 text-xs">Borrar archivos liquidación</button>
                            ) : (
                              <button onClick={() => removeUser(u)} className="px-2 py-1 rounded-lg bg-red-900/30 border border-red-800 hover:bg-red-900/50 text-xs">Eliminar</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
