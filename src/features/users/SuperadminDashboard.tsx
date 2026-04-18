// @ts-nocheck
import React, { useMemo, useState, useCallback, useEffect } from "react";
import { formatDate } from "../../lib/time";
import { db } from "../../services/db";

const AUDIT_KEY_OLD = "dataflow-audit-log-v1";

// ─── Labels ──────────────────────────────────────────────────────────────────

const RLABELS: Record<string, string> = {
  rrhh: "RRHH",
  sueldos: "Sueldos",
  admin: "Admin",
  superadmin: "SuperAdmin",
};

const MODULO_LABELS: Record<string, string> = {
  auth:         "Autenticación",
  reclamos:     "Reclamos",
  archivos:     "Archivos",
  usuarios:     "Usuarios",
  liquidaciones:"Liquidaciones",
  sectores:     "Sectores",
  config:       "Configuración",
};

const ACCION_LABELS: Record<string, string> = {
  login:           "Login OK",
  login_fallido:   "Login fallido",
  login_bloqueado: "Login bloqueado",
  logout:          "Logout",
  crear_reclamo:   "Crear reclamo",
  cambiar_estado:  "Cambiar estado",
  eliminar_reclamo:"Eliminar reclamo",
  hard_delete:     "Eliminación dura",
  reset_period:    "Reset período",
};

// ─── Resultado badge ──────────────────────────────────────────────────────────

function ResultadoBadge({ resultado }: { resultado: string }) {
  const cls =
    resultado === "ok"       ? "bg-emerald-900/40 text-emerald-300 border border-emerald-800/60" :
    resultado === "bloqueado"? "bg-amber-900/40 text-amber-300 border border-amber-800/60" :
                               "bg-rose-900/40 text-rose-300 border border-rose-800/60";
  return (
    <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${cls}`}>
      {resultado === "ok" ? "OK" : resultado === "bloqueado" ? "Bloqueado" : "Error"}
    </span>
  );
}

function AccionBadge({ accion }: { accion: string }) {
  const isAuth   = ["login", "logout"].includes(accion);
  const isError  = ["login_fallido", "login_bloqueado"].includes(accion);
  const isDanger = ["eliminar_reclamo", "hard_delete", "reset_period"].includes(accion);

  const cls =
    isError  ? "bg-rose-900/30 text-rose-300 border border-rose-800/50" :
    isDanger ? "bg-amber-900/30 text-amber-300 border border-amber-800/50" :
    isAuth   ? "bg-blue-900/30 text-blue-300 border border-blue-800/50" :
               "bg-neutral-800 text-neutral-400 border border-neutral-700";

  return (
    <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${cls}`}>
      {ACCION_LABELS[accion] || accion}
    </span>
  );
}

// ─── CSV export ───────────────────────────────────────────────────────────────

function exportCSV(entries: any[]) {
  const cols = ["Fecha", "Usuario", "Rol", "Módulo", "Acción", "Entidad", "Detalles", "IP", "Ambiente", "Resultado"];
  const escape = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = entries.map(e => [
    e.timestamp ? new Date(e.timestamp).toLocaleString("es-UY") : "—",
    e.usuarioNombre || e.byUsername || "—",
    RLABELS[e.usuarioRol] || e.usuarioRol || "—",
    MODULO_LABELS[e.modulo] || e.modulo || "—",
    ACCION_LABELS[e.accion] || e.accion || e.action || "—",
    e.entidadRef || e.details?.split(" ")?.[0] || "—",
    e.detalles || e.details || "—",
    e.ip || "N/D",
    e.ambiente || "—",
    e.resultado || "—",
  ].map(escape).join(","));
  const csv = [cols.map(escape).join(","), ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `audit-dataflow-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SuperadminDashboard({ onClose, files, downloadLogs, usersSnap, periods, periodNameById }: any) {
  const [tab, setTab] = useState("auditoria");

  // ── Actividad de usuarios ────────────────────────────────────────────────
  const userActivity = useMemo(() => {
    const map = new Map();
    for (const u of usersSnap || []) {
      map.set(u.id, {
        id: u.id,
        username: u.username,
        displayName: u.displayName || u.username,
        role: u.role,
        uploads: 0,
        downloads: 0,
        lastAction: null,
      });
    }
    for (const f of files || []) {
      const uid = f.byUserId || "";
      if (!map.has(uid)) map.set(uid, { id: uid, username: f.byUsername || uid, displayName: f.byUsername || uid, role: "?", uploads: 0, downloads: 0, lastAction: null });
      const e = map.get(uid);
      e.uploads += 1;
      if (!e.lastAction || f.at > e.lastAction) e.lastAction = f.at;
    }
    for (const dl of downloadLogs || []) {
      const uid = dl.usuarioId || "";
      if (!map.has(uid)) map.set(uid, { id: uid, username: dl.usuarioNombre || uid, displayName: dl.usuarioNombre || uid, role: "?", uploads: 0, downloads: 0, lastAction: null });
      const e = map.get(uid);
      e.downloads += 1;
      if (!e.lastAction || dl.timestamp > e.lastAction) e.lastAction = dl.timestamp;
    }
    return Array.from(map.values()).sort((a, b) => (b.lastAction || "").localeCompare(a.lastAction || ""));
  }, [files, downloadLogs, usersSnap]);

  // ── Audit log (v2 nuevo + v1 legado) ─────────────────────────────────────
  const [auditV2, setAuditV2] = useState<any[]>([]);
  useEffect(() => {
    try {
      const r = db.audit.getAll();
      if (r && typeof (r as any).then === 'function') {
        (r as any).then((arr: any) => { if (Array.isArray(arr)) setAuditV2(arr); }).catch(() => {});
      } else if (Array.isArray(r)) {
        setAuditV2(r);
      }
    } catch { setAuditV2([]); }
  }, []);

  const auditLegado = useMemo(() => {
    try { return JSON.parse(localStorage.getItem(AUDIT_KEY_OLD) || "[]"); } catch { return []; }
  }, []);

  // Normalizar entradas legadas al formato v2
  const allEntries = useMemo(() => {
    const legado = auditLegado.map((e: any) => ({
      id: e.id || String(Math.random()),
      timestamp: e.t || e.timestamp || "",
      usuarioId: e.byUserId || "",
      usuarioNombre: e.byUsername || "—",
      usuarioRol: "",
      modulo: e.action === "hard_delete" ? "archivos" : "liquidaciones",
      accion: e.action || "—",
      entidadRef: "",
      detalles: e.details || "",
      ip: "N/D",
      ambiente: "—",
      resultado: "ok",
      _legado: true,
    }));
    // Más reciente primero
    return [...auditV2, ...legado].sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || ""));
  }, [auditV2, auditLegado]);

  // ── Filtros audit ─────────────────────────────────────────────────────────
  const [filtroModulo,   setFiltroModulo]   = useState("");
  const [filtroAccion,   setFiltroAccion]   = useState("");
  const [filtroUsuario,  setFiltroUsuario]  = useState("");
  const [filtroFechaDesde, setFiltroFechaDesde] = useState("");
  const [filtroFechaHasta, setFiltroFechaHasta] = useState("");
  const [filtroResultado,  setFiltroResultado]  = useState("");

  const filteredEntries = useMemo(() => {
    return allEntries.filter(e => {
      if (filtroModulo   && e.modulo  !== filtroModulo)   return false;
      if (filtroAccion   && e.accion  !== filtroAccion)   return false;
      if (filtroResultado && e.resultado !== filtroResultado) return false;
      if (filtroUsuario  && !`${e.usuarioNombre} ${e.usuarioId}`.toLowerCase().includes(filtroUsuario.toLowerCase())) return false;
      if (filtroFechaDesde && e.timestamp < filtroFechaDesde) return false;
      if (filtroFechaHasta && e.timestamp > filtroFechaHasta + "T23:59:59") return false;
      return true;
    });
  }, [allEntries, filtroModulo, filtroAccion, filtroUsuario, filtroFechaDesde, filtroFechaHasta, filtroResultado]);

  const modulosUnicos  = useMemo(() => [...new Set(allEntries.map(e => e.modulo).filter(Boolean))], [allEntries]);
  const accionesUnicas = useMemo(() => [...new Set(allEntries.map(e => e.accion).filter(Boolean))], [allEntries]);

  const hayFiltros = filtroModulo || filtroAccion || filtroUsuario || filtroFechaDesde || filtroFechaHasta || filtroResultado;

  function limpiarFiltros() {
    setFiltroModulo(""); setFiltroAccion(""); setFiltroUsuario("");
    setFiltroFechaDesde(""); setFiltroFechaHasta(""); setFiltroResultado("");
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl border border-neutral-800 bg-neutral-900 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
          <div>
            <h3 className="font-semibold text-neutral-100">Dashboard — Super Administrador</h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              {(files || []).length} archivos · {(usersSnap || []).length} usuarios · {(periods || []).length} liquidaciones
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-200 text-sm px-3 py-1.5 rounded-lg hover:bg-neutral-800"
          >
            Cerrar
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 pt-3">
          {[
            { key: "auditoria",  label: "Log de auditoría" },
            { key: "actividad",  label: "Actividad de usuarios" },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                tab === t.key
                  ? "bg-neutral-700 text-neutral-100"
                  : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* ── TAB: AUDITORÍA ─────────────────────────────────────────── */}
          {tab === "auditoria" && (
            <>
              {/* Filtros */}
              <div className="flex flex-wrap gap-2 items-end">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-neutral-500 uppercase tracking-wide">Módulo</label>
                  <select
                    value={filtroModulo}
                    onChange={e => setFiltroModulo(e.target.value)}
                    className="rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-1.5 text-xs text-neutral-200 focus:outline-none"
                  >
                    <option value="">Todos</option>
                    {modulosUnicos.map(m => <option key={m} value={m}>{MODULO_LABELS[m] || m}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-neutral-500 uppercase tracking-wide">Acción</label>
                  <select
                    value={filtroAccion}
                    onChange={e => setFiltroAccion(e.target.value)}
                    className="rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-1.5 text-xs text-neutral-200 focus:outline-none"
                  >
                    <option value="">Todas</option>
                    {accionesUnicas.map(a => <option key={a} value={a}>{ACCION_LABELS[a] || a}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-neutral-500 uppercase tracking-wide">Resultado</label>
                  <select
                    value={filtroResultado}
                    onChange={e => setFiltroResultado(e.target.value)}
                    className="rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-1.5 text-xs text-neutral-200 focus:outline-none"
                  >
                    <option value="">Todos</option>
                    <option value="ok">OK</option>
                    <option value="error">Error</option>
                    <option value="bloqueado">Bloqueado</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-neutral-500 uppercase tracking-wide">Usuario</label>
                  <input
                    type="text"
                    placeholder="Buscar usuario..."
                    value={filtroUsuario}
                    onChange={e => setFiltroUsuario(e.target.value)}
                    className="rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-1.5 text-xs text-neutral-200 focus:outline-none w-36"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-neutral-500 uppercase tracking-wide">Desde</label>
                  <input
                    type="date"
                    value={filtroFechaDesde}
                    onChange={e => setFiltroFechaDesde(e.target.value)}
                    className="rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-1.5 text-xs text-neutral-200 focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-neutral-500 uppercase tracking-wide">Hasta</label>
                  <input
                    type="date"
                    value={filtroFechaHasta}
                    onChange={e => setFiltroFechaHasta(e.target.value)}
                    className="rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-1.5 text-xs text-neutral-200 focus:outline-none"
                  />
                </div>
                <div className="flex gap-2 items-end pb-0.5">
                  {hayFiltros && (
                    <button
                      onClick={limpiarFiltros}
                      className="rounded-lg border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 px-2 py-1.5 text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
                    >
                      Limpiar
                    </button>
                  )}
                  <button
                    onClick={() => exportCSV(filteredEntries)}
                    className="rounded-lg bg-neutral-700 hover:bg-neutral-600 px-3 py-1.5 text-xs text-neutral-200 transition-colors flex items-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 10.5L4.5 7H7V2h2v5h2.5L8 10.5z"/>
                      <path d="M2 12h12v1.5H2V12z"/>
                    </svg>
                    Exportar CSV
                  </button>
                </div>
              </div>

              {/* Contadores */}
              <div className="flex gap-2 text-xs text-neutral-500">
                <span className="text-neutral-300 font-medium">{filteredEntries.length}</span> entradas
                {hayFiltros && <span>· (de {allEntries.length} totales)</span>}
                {auditV2.length === 0 && allEntries.length === 0 && (
                  <span className="text-amber-500">— Aún no hay eventos registrados. Los logs se generan a partir de este momento.</span>
                )}
              </div>

              {/* Tabla */}
              {filteredEntries.length === 0
                ? <p className="text-neutral-500 text-sm py-8 text-center">Sin entradas que coincidan con los filtros.</p>
                : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs min-w-[780px]">
                      <thead className="text-neutral-400 sticky top-0 bg-neutral-900 z-10">
                        <tr>
                          <th className="text-left py-2 pr-3 whitespace-nowrap">Fecha y hora</th>
                          <th className="text-left py-2 pr-3">Usuario</th>
                          <th className="text-left py-2 pr-3">Módulo</th>
                          <th className="text-left py-2 pr-3">Acción</th>
                          <th className="text-left py-2 pr-3">Entidad</th>
                          <th className="text-left py-2 pr-3">Detalles</th>
                          <th className="text-left py-2 pr-3">IP</th>
                          <th className="text-left py-2 pr-3">Ambiente</th>
                          <th className="text-left py-2">Resultado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredEntries.map((e: any) => (
                          <tr key={e.id} className="border-t border-neutral-800 hover:bg-neutral-800/30 transition-colors">
                            <td className="py-2 pr-3 text-neutral-400 whitespace-nowrap tabular-nums">
                              {e.timestamp
                                ? new Date(e.timestamp).toLocaleString("es-UY", { dateStyle: "short", timeStyle: "short" })
                                : "—"}
                            </td>
                            <td className="py-2 pr-3">
                              <div className="text-neutral-200 font-medium">{e.usuarioNombre || e.byUsername || "—"}</div>
                              {e.usuarioRol && <div className="text-neutral-600">{RLABELS[e.usuarioRol] || e.usuarioRol}</div>}
                            </td>
                            <td className="py-2 pr-3 text-neutral-400">{MODULO_LABELS[e.modulo] || e.modulo || "—"}</td>
                            <td className="py-2 pr-3"><AccionBadge accion={e.accion || e.action || ""} /></td>
                            <td className="py-2 pr-3 font-mono text-neutral-400">{e.entidadRef || "—"}</td>
                            <td className="py-2 pr-3 text-neutral-500 max-w-[200px] truncate" title={e.detalles || e.details}>
                              {e.detalles || e.details || "—"}
                            </td>
                            <td className="py-2 pr-3 text-neutral-600 font-mono">{e.ip || "N/D"}</td>
                            <td className="py-2 pr-3 text-neutral-500 max-w-[140px] truncate" title={e.ambiente}>{e.ambiente || "—"}</td>
                            <td className="py-2">{e.resultado ? <ResultadoBadge resultado={e.resultado} /> : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              }
            </>
          )}

          {/* ── TAB: ACTIVIDAD ─────────────────────────────────────────── */}
          {tab === "actividad" && (
            <table className="w-full text-xs">
              <thead className="text-neutral-400 sticky top-0 bg-neutral-900">
                <tr>
                  <th className="text-left py-2 pr-4">Usuario</th>
                  <th className="text-left py-2 pr-4">Rol</th>
                  <th className="text-right py-2 pr-4">Archivos subidos</th>
                  <th className="text-right py-2 pr-4">Descargas</th>
                  <th className="text-left py-2">Última acción</th>
                </tr>
              </thead>
              <tbody>
                {userActivity.length === 0 && (
                  <tr><td colSpan={5} className="py-6 text-center text-neutral-500">Sin datos</td></tr>
                )}
                {userActivity.map(u => (
                  <tr key={u.id} className="border-t border-neutral-800">
                    <td className="py-2 pr-4">
                      <div className="text-neutral-200 font-medium">{u.displayName}</div>
                      {u.displayName !== u.username && <div className="text-neutral-500">{u.username}</div>}
                    </td>
                    <td className="py-2 pr-4 text-neutral-400">{RLABELS[u.role] || u.role}</td>
                    <td className="py-2 pr-4 text-right text-neutral-300">{u.uploads}</td>
                    <td className="py-2 pr-4 text-right text-neutral-300">{u.downloads}</td>
                    <td className="py-2 text-neutral-400">{u.lastAction ? formatDate(u.lastAction) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

        </div>
      </div>
    </div>
  );
}
