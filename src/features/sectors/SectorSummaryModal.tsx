// @ts-nocheck
import React from "react";
import { formatDate } from "../../lib/time";
import { userNameOr } from "../shared/uiHelpers";

export function SectorSummaryModal({ sectorSummaryOpen, setSectorSummaryOpen, setSectorSummarySelectedKey, setSectorViewQ, setSectorViewSiteQ, setSectorViewUploaderQ, setSectorViewOnlyPending, selectedPeriodId, sectorSummary, sectorSummaryGroupedFiltered, sectorSummaryExpanded, setSectorSummaryExpanded, sectorSummarySelectedKey, sectorViewQ, sectorViewSiteQ, sectorViewUploaderQ, sectorViewOnlyPending, formatDate, userNameOr }: any) {
  return (
    <>
      {/* MODAL: Vista por sector (NUEVO) */}
{sectorSummaryOpen && (
  <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
    <div className="w-full max-w-4xl rounded-2xl border border-neutral-800 bg-neutral-900 p-5 shadow-2xl">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-neutral-50 text-sm">Vista por sector</h3>
          <p className="text-xs text-neutral-400 mt-1">
            Resumen de archivos por sector para la liquidación seleccionada.
          </p>
        </div>

        <button
          onClick={() => {
            setSectorSummaryOpen(false);
            setSectorSummarySelectedKey(null);
            setSectorViewQ("");
            setSectorViewSiteQ("");
            setSectorViewUploaderQ("");
            setSectorViewOnlyPending(false);

          }}
          className="text-neutral-400 hover:text-neutral-100 text-xs px-2 py-1 rounded-lg hover:bg-neutral-800"
        >
          Cerrar
        </button>
      </div>

      {/* Si no hay periodo seleccionado o no hay archivos */}
      {(!selectedPeriodId || sectorSummary.length === 0) ? (
        <div className="text-[11px] text-neutral-500 border border-dashed border-neutral-700 rounded-xl p-4">
          {!selectedPeriodId
            ? "Seleccioná una liquidación para ver el resumen por sector."
            : "No hay archivos cargados aún para esta liquidación."}
        </div>
      ) : (
        <>
          {/* Tabla de resumen por sector (agrupada por sectorName) */}

{/* Filtros */}
<div className="mb-3 grid grid-cols-1 md:grid-cols-4 gap-2">
  <input
    value={sectorViewQ}
    onChange={(e) => setSectorViewQ(e.target.value)}
    placeholder="Filtrar sector…"
    className="rounded-xl bg-neutral-950/40 border border-neutral-800 px-3 py-2 text-xs text-neutral-100"
  />

  <input
    value={sectorViewSiteQ}
    onChange={(e) => setSectorViewSiteQ(e.target.value)}
    placeholder="Filtrar sede…"
    className="rounded-xl bg-neutral-950/40 border border-neutral-800 px-3 py-2 text-xs text-neutral-100"
  />

  <input
    value={sectorViewUploaderQ}
    onChange={(e) => setSectorViewUploaderQ(e.target.value)}
    placeholder="Filtrar subido por…"
    className="rounded-xl bg-neutral-950/40 border border-neutral-800 px-3 py-2 text-xs text-neutral-100"
  />

  <div className="flex items-center gap-2">
    <label className="flex items-center gap-2 text-xs text-neutral-300 select-none">
      <input
        type="checkbox"
        checked={sectorViewOnlyPending}
        onChange={(e) => setSectorViewOnlyPending(e.target.checked)}
      />
      Solo pendientes
    </label>

    <button
      type="button"
      onClick={() => {
        setSectorViewQ("");
        setSectorViewSiteQ("");
        setSectorViewUploaderQ("");
        setSectorViewOnlyPending(false);
      }}
      className="ml-auto text-xs px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-100"
      title="Limpiar filtros"
    >
      Limpiar
    </button>
  </div>
</div>


          <div className="max-h-[260px] overflow-auto rounded-2xl border border-neutral-800 mb-4">
            <table className="w-full text-xs">
              <thead className="text-neutral-400">
                <tr>
                  <th className="text-left px-2 py-1">Sector / Sede</th>
                  <th className="text-right px-2 py-1">Recibido/Requerido</th>
                  <th className="text-right px-2 py-1">Faltan</th>
                  <th className="text-center px-2 py-1">Estado</th>
                  <th className="text-left px-2 py-1">Subido por</th>
                  <th className="text-left px-2 py-1">Última</th>
                </tr>
              </thead>

              <tbody>
              {sectorSummaryGroupedFiltered.map((g: any) => {
                  const open = !!sectorSummaryExpanded[g.sectorName];

                  const topUploaders = Object.entries(g.uploadedBy || {})
                    .sort((a: any, b: any) => (Number(b[1]) || 0) - (Number(a[1]) || 0))
                    .slice(0, 3);

                  return (
                    <React.Fragment key={g.sectorName}>
                      {/* Fila PADRE (Sector) */}
                      <tr
                        className="border-t border-neutral-800 cursor-pointer hover:bg-neutral-800/40"
                        onClick={() =>
                          setSectorSummaryExpanded((prev: any) => ({
                            ...prev,
                            [g.sectorName]: !open,
                          }))
                        }
                        title="Click para desplegar sedes"
                      >
                        <td className="px-2 py-2 text-neutral-200 font-medium">
                          <span className="mr-2 text-neutral-400">{open ? "▾" : "▸"}</span>
                          {g.sectorName}
                        </td>

                        <td className="px-2 py-2 text-right text-neutral-200">
                          {g.receivedTotal}/{g.requiredTotal}
                        </td>

                        <td className="px-2 py-2 text-right text-neutral-300">{g.missingTotal}</td>

                        <td className="px-2 py-2 text-center">
                          {g.completed ? (
                            <span className="px-2 py-1 rounded-lg text-[11px] bg-emerald-500/15 border border-emerald-600/40 text-emerald-300">
                              Completo
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded-lg text-[11px] bg-amber-500/15 border border-amber-600/40 text-amber-300">
                              Parcial
                            </span>
                          )}
                        </td>

                        <td className="px-2 py-2 text-xs text-neutral-400">
                          {topUploaders.length === 0
                            ? "—"
                            : topUploaders.map(([u, c]: any) => `${userNameOr(u)} (${c})`).join(", ")}
                        </td>

                        <td className="px-2 py-2 text-xs text-neutral-400">
                          {g.lastUpdatedAt ? formatDate(g.lastUpdatedAt) : "—"}
                        </td>
                      </tr>

                      {/* Filas HIJAS (Sedes) */}
                      {open &&
                        (g.rows || [])
                          .slice()
                          .sort((a: any, b: any) =>
                            String(a.siteName || "").toLowerCase().localeCompare(String(b.siteName || "").toLowerCase())
                          )
                          .map((r: any) => {
                            const selected = sectorSummarySelectedKey === r.key;

                            return (
                              <tr
                                key={r.key}
                                className={
                                  "border-t border-neutral-900/60 cursor-pointer hover:bg-neutral-900/40 " +
                                  (selected ? "bg-neutral-900/50" : "")
                                }
                                onClick={(e) => {
                                  e.stopPropagation(); // no colapsar el grupo
                                  setSectorSummarySelectedKey(r.key);
                                }}
                                title="Click para ver detalle"
                              >
                                <td className="px-2 py-2 text-neutral-200">
                                  <span className="text-neutral-500 mr-2">↳</span>
                                  {r.siteName || "Sin sede"}
                                </td>

                                <td className="px-2 py-2 text-right text-neutral-200">
                                  {Math.min(Number(r.effectiveReceived) || 0, Number(r.requiredCount) || 0)}/
                                  {Number(r.requiredCount) || 0}
                                </td>

                                <td className="px-2 py-2 text-right text-neutral-300">
                                  {Number(r.missing) || 0}
                                </td>

                                <td className="px-2 py-2 text-center">
                                  {r.completed ? (
                                    <span className="px-2 py-1 rounded-lg text-[11px] bg-emerald-500/15 border border-emerald-600/40 text-emerald-300">
                                      OK
                                    </span>
                                  ) : (
                                    <span className="px-2 py-1 rounded-lg text-[11px] bg-amber-500/15 border border-amber-600/40 text-amber-300">
                                      Pendiente
                                    </span>
                                  )}
                                </td>

                                <td className="px-2 py-2 text-xs text-neutral-400">
                                  {Object.keys(r.uploadedBy || {}).length === 0
                                    ? "—"
                                    : Object.entries(r.uploadedBy || {})
                                        .sort((a: any, b: any) => (Number(b[1]) || 0) - (Number(a[1]) || 0))
                                        .slice(0, 2)
                                        .map(([u, c]: any) => `${userNameOr(u)} (${c})`)
                                        .join(", ")}
                                </td>

                                <td className="px-2 py-2 text-xs text-neutral-400">
                                  {r.lastUpdatedAt ? formatDate(r.lastUpdatedAt) : "—"}
                                </td>
                              </tr>
                            );
                          })}
                    </React.Fragment>
                  );
                })}

{sectorSummaryGroupedFiltered.length === 0 && (                  <tr>
                    <td colSpan={6} className="px-2 py-3 text-neutral-500 text-center">
                      No hay reglas con requeridos (&gt; 0) para esta liquidación.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  </div>
)}
{/* FIN MODAL: Vista por sector (NUEVO) */}
    </>
  );
}
