// @ts-nocheck
import React from "react";
import { cls } from "../../lib/cls";
import { prettyBytes } from "../../lib/bytes";
import { formatDate } from "../../lib/time";
import { statusBadgeClasses, Th, typeBadge } from "../shared/uiHelpers";
import {
  pendingDudasCount, answeredDudasCount,
  pendingArreglosCount, answeredArreglosCount,
} from "../observations/observationHelpers";
import { RowMenuPortal } from "./RowMenuPortal";

export function FileTable({
  filtered, periodNameById, selectedPeriodId,
  effectiveStatus, displayStatusForRole, meRole, myPerms,
  isAdmin, isSuperAdmin, selectAllRef, allVisibleSelected, visibleIds,
  selectedIds, selectAllVisible, deselectAllVisible, isSelected, toggleSelectOne,
  setSelected, setDetailOpen, setSelectedThreadId,
  handleStatusChange, setObserveDialog, blankObsRow, openFileDoubt,
  openAdjustForFile, deleteFile, doDownload, markDownloaded, bumpVersion,
  rowMenuOpen, setRowMenuOpen, rowMenuAnchor, setRowMenuAnchor,
  MENU_TRIGGER, MENU_ITEM, me,
}: any) {
  return (
    <section className="rounded-2xl border border-neutral-800 overflow-visible">
        <div className="px-4 py-2 text-xs text-neutral-400 bg-neutral-900/50">
          Mostrando archivos de:{" "}
          <span className="text-neutral-200 font-medium">
            {periodNameById[selectedPeriodId] || "—"}
          </span>
        </div>

        {/* Importante:
            - La sección NO recorta (overflow-visible)
            - Solo la tabla scrollea horizontalmente (overflow-x-auto)
            - El dropdown puede “flotar” por arriba */}
        <div className="overflow-x-auto overflow-y-visible">
          <table className="w-full text-sm">
            <thead className="bg-neutral-900/60 text-neutral-300">
              <tr>
                <Th>
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={(e) => {
                      if (e.target.checked) selectAllVisible(visibleIds);
                      else deselectAllVisible(visibleIds);
                    }}
                    title="Seleccionar todos (vista filtrada)"
                  />
                </Th>
                <Th>Archivo</Th>
                <Th>Nombre</Th>
                <Th>Tipo</Th>
                <Th>Tamaño</Th>
                <Th>Versión</Th>
                <Th>Estado</Th>
                <Th>Dudas</Th>
                <Th>Subido</Th>
                <Th>Acciones</Th>
              </tr>
            </thead>

            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-10 text-neutral-500">
                    No hay archivos en esta liquidación.
                  </td>
                </tr>
              ) : (
                filtered.map((f) => (
                  <tr
                    key={f.id}
                    className={cls(
                      "border-t border-neutral-800",
                      effectiveStatus(f) === "eliminado"
                        ? "bg-red-950/30 opacity-75"
                        : "hover:bg-neutral-900/40"
                    )}
                  >
                    {/* Checkbox de selección */}
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected(f.id)}
                        onChange={() => toggleSelectOne(f.id)}
                        title={`Seleccionar ${f.name}`}
                      />
                    </td>

                    {/* Miniatura / “Archivo” */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          setSelectedThreadId(null); // importante: empezar limpio
                          setSelected(f.id);
                          setDetailOpen(true);
                        }}
                        className="group inline-flex h-20 w-20 items-center justify-center rounded-xl border border-neutral-800 bg-white focus:outline-none"
                        title="Ver detalle y trazabilidad"
                        aria-label={`Ver detalle de ${f.name}`}
                      >
                        <svg
                          viewBox="0 0 56 68"
                          className="h-14 w-11 transition-colors"
                          fill="none"
                          aria-hidden="true"
                        >
                          {/* Sombra sutil */}
                          <filter id="fs" x="-10%" y="-5%" width="120%" height="120%">
                            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#00000022" />
                          </filter>
                          {/* Cuerpo del archivo */}
                          <path
                            d="M6 4C6 2.9 6.9 2 8 2H34L50 18V64C50 65.1 49.1 66 48 66H8C6.9 66 6 65.1 6 64V4Z"
                            fill="#f8f8f8"
                            filter="url(#fs)"
                          />
                          {/* Pliegue */}
                          <path
                            d="M34 2L50 18H36C34.9 18 34 17.1 34 16V2Z"
                            fill="#e0e0e0"
                          />
                          {/* Línea diagonal del pliegue */}
                          <path d="M34 2L50 18" stroke="#d0d0d0" strokeWidth="0.5" />
                          {/* Banda de color superior (extensión) */}
                          <rect x="6" y="30" width="44" height="14" rx="1" fill="#3b82f6" opacity="0.15" />
                          <rect x="6" y="30" width="6" height="14" rx="0" fill="#3b82f6" opacity="0.7"
                            style={{ clipPath: "inset(0 0 0 0 round 1px 0 0 1px)" }}
                          />
                          {/* Líneas de contenido */}
                          <rect x="12" y="22" width="28" height="2.2" rx="1.1" fill="#c0c0c0" />
                          <rect x="12" y="34" width="18" height="2" rx="1" fill="#3b82f6" opacity="0.8" />
                          <rect x="12" y="48" width="30" height="1.8" rx="0.9" fill="#d0d0d0" />
                          <rect x="12" y="52.5" width="22" height="1.8" rx="0.9" fill="#d8d8d8" />
                          <rect x="12" y="57" width="26" height="1.8" rx="0.9" fill="#d0d0d0" />
                          {/* Borde del cuerpo */}
                          <path
                            d="M8 2H34L50 18V64C50 65.1 49.1 66 48 66H8C6.9 66 6 65.1 6 64V4C6 2.9 6.9 2 8 2Z"
                            stroke="#d4d4d4"
                            strokeWidth="1"
                            fill="none"
                          />
                        </svg>
                      </button>
                    </td>

                    <td className="px-4 py-3 text-neutral-200">{f.name}</td>
                    <td className="px-4 py-3 text-neutral-400">
                      <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 text-[11px] font-mono">
                        {f.fileType || (f.name ? f.name.split('.').pop()?.toUpperCase() : 'FILE') || 'FILE'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-neutral-400">{prettyBytes(f.size)}</td>

                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-lg bg-neutral-800">
                          v{f.version}
                        </span>
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={cls(
                          "px-2 py-0.5 rounded-lg text-xs whitespace-nowrap",
                          statusBadgeClasses(effectiveStatus(f))
                        )}
                      >
                        {displayStatusForRole(effectiveStatus(f), f)}
                      </span>
                    </td>

                    {/* Dudas + arreglos */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Sin actividad */}
                        {pendingDudasCount(f) === 0 && answeredDudasCount(f) === 0 &&
                         pendingArreglosCount(f) === 0 && answeredArreglosCount(f) === 0 && (
                          <span className="text-neutral-600 text-[11px]">—</span>
                        )}

                        {/* Dudas pendientes — rojo urgente */}
                        {pendingDudasCount(f) > 0 && (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/40"
                            title={`${pendingDudasCount(f)} duda(s) sin responder`}
                          >
                            ⚠ {pendingDudasCount(f)} duda{pendingDudasCount(f) > 1 ? "s" : ""}
                          </span>
                        )}

                        {/* Dudas respondidas (solo si no hay pendientes) */}
                        {pendingDudasCount(f) === 0 && answeredDudasCount(f) > 0 && (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] bg-neutral-800 text-neutral-400 border border-neutral-700"
                            title={`${answeredDudasCount(f)} duda(s) respondida(s)`}
                          >
                            ✓ {answeredDudasCount(f)} duda{answeredDudasCount(f) > 1 ? "s" : ""}
                          </span>
                        )}

                        {/* Arreglos pendientes */}
                        {pendingArreglosCount(f) > 0 && (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-medium bg-sky-500/20 text-sky-300 border border-sky-500/40"
                            title={`${pendingArreglosCount(f)} arreglo(s) sin procesar`}
                          >
                            ↺ {pendingArreglosCount(f)} arreglo{pendingArreglosCount(f) > 1 ? "s" : ""}
                          </span>
                        )}

                        {/* Arreglos respondidos (solo si no hay pendientes) */}
                        {pendingArreglosCount(f) === 0 && answeredArreglosCount(f) > 0 && (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] bg-neutral-800 text-neutral-400 border border-neutral-700"
                            title={`${answeredArreglosCount(f)} arreglo(s) procesado(s)`}
                          >
                            ✓ {answeredArreglosCount(f)} arreglo{answeredArreglosCount(f) > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-neutral-400">
                      {formatDate(f.at)}
                    </td>

                    {/* Acciones -> DESPLEGABLE */}
                    <td className="px-4 py-3">
                      <div className="relative inline-block">
                      <button
  onClick={(e) => {
    e.stopPropagation();

    const el = e.currentTarget as HTMLElement | null;
    const rect = el ? el.getBoundingClientRect() : null;

    setRowMenuOpen((prev) => {
      const next = prev === f.id ? null : f.id;

      if (next) {
        if (rect) setRowMenuAnchor(rect);
        else if (!rowMenuAnchor) setRowMenuAnchor(new DOMRect(8, 8, 0, 0)); // fallback mínimo
      } else {
        setRowMenuAnchor(null);
      }
      

      return next;
    });
  }}
  className={MENU_TRIGGER}
>
  Acciones ▾
</button>


                        {rowMenuOpen === f.id && rowMenuAnchor && (
  <RowMenuPortal
    anchorRect={rowMenuAnchor}
    onClose={() => {
      setRowMenuOpen(null);
      setRowMenuAnchor(null);
    }}
    width={256}
  >
    {/* Versionado / descarga */}
    {myPerms.actions.bumpVersion && (
      <button
        onClick={() => {
          setRowMenuOpen(null);
          setRowMenuAnchor(null);
          bumpVersion(f.id);
        }}
        className={MENU_ITEM}
      >
        ➕ Nueva versión
      </button>
    )}
    {myPerms.actions.download && (
      <button
        onClick={() => {
          setRowMenuOpen(null);
          setRowMenuAnchor(null);
          doDownload(f.id);
        }}
        className={MENU_ITEM}
      >
        ⬇️ Descargar
      </button>
    )}
    {myPerms.actions.markDownloaded && (
      <button
        onClick={() => {
          setRowMenuOpen(null);
          setRowMenuAnchor(null);
          markDownloaded(f.id);
        }}
        className={MENU_ITEM}
      >
        ✅ Marcar descargado
      </button>
    )}

    {/* Arreglos de Información (RRHH/Admin) */}
    {(meRole === "rrhh" || meRole === "admin") && (
      <>
        <div className="px-2 pt-2 pb-1 text-[11px] uppercase tracking-wide text-neutral-500">
          Arreglos
        </div>
        <button
          onClick={() => {
            setRowMenuOpen(null);
            setRowMenuAnchor(null);
            openAdjustForFile(f);
          }}
          className={MENU_ITEM}
          title="Solicitar arreglos de información para este archivo"
        >
          🛠️ Arreglos (RRHH)
        </button>
      </>
    )}

    {/* Dudas */}
    {(meRole === "sueldos" || meRole === "admin") && (
      <>
        <div className="px-2 pt-2 pb-1 text-[11px] uppercase tracking-wide text-neutral-500">
          Dudas
        </div>
        <button
          onClick={() => {
            setRowMenuOpen(null);
            setRowMenuAnchor(null);
            setObserveDialog({
              open: true,
              fileId: f.id,
              rows: [blankObsRow()],
            });
          }}
          className={MENU_ITEM}
          title="Cargar dudas por funcionario"
        >
          🧾 Dudas por funcionario
        </button>
        <button
          onClick={() => {
            setRowMenuOpen(null);
            setRowMenuAnchor(null);
            openFileDoubt(f);
          }}
          className={MENU_ITEM}
          title="Duda general del archivo"
        >
          ❓ Duda del archivo
        </button>
      </>
    )}

    {/* Administración */}
    {(meRole === "admin" || meRole === "superadmin") && (
      <>
        <div className="px-2 pt-2 pb-1 text-[11px] uppercase tracking-wide text-neutral-500">
          Administración
        </div>
        <button
          onClick={() => {
            setRowMenuOpen(null);
            setRowMenuAnchor(null);
            deleteFile(f.id);
          }}
          className={cls(MENU_ITEM, "text-rose-300")}
          title={isSuperAdmin ? "Eliminar permanentemente (sin trazabilidad)" : "Anular archivo (queda en trazabilidad)"}
        >
          {isSuperAdmin ? "💀 Eliminar permanentemente" : "🗑️ Anular"}
        </button>
      </>
    )}
  </RowMenuPortal>
)}

                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
    </section>
  );
}
