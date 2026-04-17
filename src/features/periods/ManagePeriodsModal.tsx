// @ts-nocheck
import React, { useState } from "react";
import { cls } from "../../lib/cls";
import { db } from "../../services/db";

// Cuenta reclamos activos (no eliminados) asociados a una liquidación por nombre
function reclamosPendientesPorLiquidacion(nombreLiquidacion: string): number {
  try {
    const todos = db.reclamos.getAll();
    return todos.filter(r =>
      !r.eliminado &&
      (r.estado === 'Emitido' || r.estado === 'En proceso') &&
      (r.liquidacion === nombreLiquidacion || r.paraLiquidacion === nombreLiquidacion)
    ).length;
  } catch {
    return 0;
  }
}

export function ManagePeriodsModal({ managePeriodsOpen, setManagePeriodsOpen, sortedPeriods, filesCountByPeriod, selectedPeriodId, setSelectedPeriodId, periods, setPeriods, isAdmin, isSuperAdmin, cls }: any) {
  const [avisoLocked, setAvisoLocked] = useState<{ periodId: string; nombre: string; cantidad: number } | null>(null);
  return (
    <>
      {/* MODAL: Gestionar liquidaciones */}
      {managePeriodsOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Gestionar liquidaciones</h3>
              <button
                onClick={() => setManagePeriodsOpen(false)}
                className="text-neutral-400 hover:text-neutral-200"
              >
                Cerrar
              </button>
            </div>

            <p className="text-neutral-400 text-sm mb-3">
              Podés borrar liquidaciones que no tengan archivos asociados.
            </p>

            <div className="max-h-[50vh] overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-neutral-400">
                  <tr>
                    <th className="text-left px-2 py-1">Nombre</th>
                    <th className="text-left px-2 py-1">Archivos</th>
                    <th className="text-left px-2 py-1">Carga desde</th>
                    <th className="text-left px-2 py-1">Carga hasta</th>
                    <th className="text-left px-2 py-1">Estado</th>
                    <th className="text-left px-2 py-1">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPeriods.map((p) => {
                    const count = filesCountByPeriod[p.id] || 0;
                    const isSelected = p.id === selectedPeriodId;
                    const canDelete = count === 0;
                    return (
                      <tr key={p.id} className="border-t border-neutral-800">
                        <td className="px-2 py-1">
                          <div className="flex items-center gap-2">
                            <span className="text-neutral-200">{p.name}</span>
                            {isSelected && (
                              <span className="px-1.5 py-0.5 text-[10px] rounded bg-neutral-800 text-neutral-300">
                                seleccionada
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-2 py-1 text-neutral-400">{count}</td>

                        <td className="px-2 py-1">
                          <input
                            type="date"
                            className="w-full px-2 py-1 rounded-lg bg-neutral-800 text-xs text-neutral-200 outline-none border border-neutral-700 disabled:opacity-60 disabled:cursor-not-allowed"
                            value={p.uploadFrom || ""}
                            disabled={!isAdmin}
                            onChange={(e) => {
                              if (!isAdmin) return;
                              const value = e.target.value;
                              setPeriods((prev: any[]) =>
                                prev.map((x) =>
                                  x.id === p.id ? { ...x, uploadFrom: value } : x
                                )
                              );
                            }}
                            title="Fecha desde la que RRHH puede subir archivos para esta liquidación"
                          />
                        </td>

                        <td className="px-2 py-1">
                          <input
                            type="date"
                            className="w-full px-2 py-1 rounded-lg bg-neutral-800 text-xs text-neutral-200 outline-none border border-neutral-700 disabled:opacity-60 disabled:cursor-not-allowed"
                            value={p.uploadTo || ""}
                            disabled={!isAdmin}
                            onChange={(e) => {
                              if (!isAdmin) return;
                              const value = e.target.value;
                              setPeriods((prev: any[]) =>
                                prev.map((x) =>
                                  x.id === p.id ? { ...x, uploadTo: value } : x
                                )
                              );
                            }}
                            title="Fecha hasta la que RRHH puede subir archivos para esta liquidación"
                          />
                        </td>

                        <td className="px-2 py-1">
                          {(isSuperAdmin || isAdmin) ? (
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!!p.locked}
                                onChange={(e) => {
                                  const locked = e.target.checked;
                                  if (locked) {
                                    // Verificar reclamos pendientes antes de bloquear
                                    const pendientes = reclamosPendientesPorLiquidacion(p.name);
                                    if (pendientes > 0) {
                                      setAvisoLocked({ periodId: p.id, nombre: p.name, cantidad: pendientes });
                                      return; // no bloquear todavía
                                    }
                                  }
                                  setPeriods((prev: any[]) =>
                                    prev.map((x) => x.id === p.id ? { ...x, locked } : x)
                                  );
                                }}
                              />
                              <span className="text-xs">{p.locked ? "🔒 Bloqueada" : "Abierta"}</span>
                            </label>
                          ) : (
                            <span className="text-xs text-neutral-400">{p.locked ? "🔒 Bloqueada" : "Abierta"}</span>
                          )}
                        </td>

                        <td className="px-2 py-1">
                          <button
                            disabled={!canDelete || !isAdmin}
                            onClick={() => {
                              if (!canDelete || !isAdmin) return;
                              if (!confirm(`¿Borrar la liquidación "${p.name}"?`))
                                return;

                              const np = periods.filter(
                                (x) => x.id !== p.id
                              );
                              setPeriods(np);

                              if (isSelected) {
                                const next = [...np].sort(
                                  (a: any, b: any) =>
                                    b.year - a.year || b.month - a.month
                                )[0];
                                setSelectedPeriodId(next?.id || "");
                              }
                            }}
                            className={cls(
                              "px-2 py-1 rounded-lg text-xs",
                              canDelete && isAdmin
                                ? "bg-red-900/30 border border-red-800 hover:bg-red-900/50"
                                : "bg-neutral-900 border border-neutral-800 text-neutral-500 cursor-not-allowed"
                            )}
                            title={
                              !isAdmin
                                ? "Solo el administrador puede borrar liquidaciones"
                                : canDelete
                                ? "Borrar liquidación"
                                : "No se puede borrar: tiene archivos asociados"
                            }
                          >
                            Borrar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {sortedPeriods.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-2 py-3 text-neutral-500 text-center"
                      >
                        No hay liquidaciones.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end mt-3">
              <button
                onClick={() => setManagePeriodsOpen(false)}
                className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Aviso: reclamos pendientes al bloquear liquidación */}
      {avisoLocked && (
        <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl border border-amber-500/40 bg-neutral-900 shadow-2xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl mt-0.5">⚠️</span>
              <div>
                <h3 className="text-base font-bold text-amber-300">Reclamos activos en esta liquidación</h3>
                <p className="text-sm text-neutral-300 mt-1">
                  La liquidación <span className="font-semibold text-neutral-100">"{avisoLocked.nombre}"</span> tiene{' '}
                  <span className="font-bold text-amber-300">{avisoLocked.cantidad}</span> reclamo{avisoLocked.cantidad !== 1 ? 's' : ''} en estado{' '}
                  <span className="italic">Emitido</span> o <span className="italic">En proceso</span>.
                </p>
                <p className="text-xs text-neutral-500 mt-2">
                  Si la bloqueás, estos reclamos quedarán sin resolver. ¿Querés bloquearla igualmente?
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAvisoLocked(null)}
                style={{ padding: '6px 14px' }}
                className="rounded-xl bg-neutral-800 hover:bg-neutral-700 text-sm text-neutral-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setPeriods((prev: any[]) =>
                    prev.map((x) => x.id === avisoLocked.periodId ? { ...x, locked: true } : x)
                  );
                  setAvisoLocked(null);
                }}
                style={{ padding: '6px 14px' }}
                className="rounded-xl bg-amber-700 hover:bg-amber-600 text-sm text-white font-medium"
              >
                Bloquear igual
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
