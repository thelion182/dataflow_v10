// @ts-nocheck
import React from "react";
import { prettyBytes } from "../../lib/bytes";

export function AdjustModal({ adjustDialog, fileForAdjust, periodNameById, prettyBytes, setAdjCell, addAdjRow, removeAdjRow, cancelAdjust, confirmAdjust }: any) {
  return (
    <>
      {/* MODAL: Arreglos de Información (RRHH) */}
      {adjustDialog.open && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-neutral-800 bg-neutral-900 p-5 shadow-2xl">
            <h3 className="text-xl font-semibold mb-1">Arreglos de Información</h3>

            {fileForAdjust && (
              <p className="text-xs text-neutral-400 mb-2">
                Archivo:{" "}
                <span className="text-neutral-200 font-medium">
                  {fileForAdjust.name}
                </span>{" "}
                · v{fileForAdjust.version} ·{" "}
                {prettyBytes(fileForAdjust.size)} ·{" "}
                {periodNameById[fileForAdjust.periodId] || "—"}
              </p>
            )}

            <p className="text-neutral-400 text-sm mb-4">
              Completá los datos para solicitar alta/modificación/baja. Esto notificará a <b>Sueldos</b>.
            </p>

            <div className="space-y-3 max-h-[60vh] overflow-auto pr-1">
              {adjustDialog.rows.map((r, i) => (
                <div
                  key={r.id}
                  className="grid grid-cols-12 gap-2 items-end border border-neutral-800 rounded-xl p-3"
                >
                  {/* Nro, Nombre, Cargo, Acción (SIEMPRE) */}
                  <div className="col-span-2">
                    <label className="text-xs text-neutral-400">Nro funcionario</label>
                    <input
                      value={r.nro}
                      onChange={(e) => setAdjCell(i, "nro", e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-800 outline-none"
                      placeholder="Ej: 1234"
                    />
                  </div>

                  <div className="col-span-3">
                    <label className="text-xs text-neutral-400">Nombre</label>
                    <input
                      value={r.nombre}
                      onChange={(e) => setAdjCell(i, "nombre", e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-800 outline-none"
                      placeholder="Apellido, Nombre"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="text-xs text-neutral-400">Cargo</label>
                    <input
                      value={r.cargo}
                      onChange={(e) => setAdjCell(i, "cargo", e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-800 outline-none"
                      placeholder="Cargo"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="text-xs text-neutral-400">Acción</label>
                    <select
                      value={r.accion}
                      onChange={(e) =>
                        setAdjCell(i, "accion", e.target.value as AjusteAccion)
                      }
                      className="w-full px-3 py-2 rounded-xl bg-neutral-800 outline-none"
                    >
                      <option value="alta">Alta</option>
                      <option value="modificar">Modificar</option>
                      <option value="baja">Baja</option>
                    </select>
                  </div>

                  {/* 🔹 ALTA / BAJA → se ve Código, Desc, DHC, Actividad */}
                  {r.accion !== "modificar" && (
                    <>
                      {/* Código + descripción */}
                      <div className="col-span-2">
                        <label className="text-xs text-neutral-400">Código</label>
                        <input
                          value={r.codigo || ""}
                          onChange={(e) =>
                            setAdjCell(
                              i,
                              "codigo",
                              e.target.value.replace(/\D/g, "").slice(0, 5)
                            )
                          }
                          className="w-full px-3 py-2 rounded-xl bg-neutral-800 outline-none"
                          placeholder="Ej: 12345"
                          maxLength={5}
                          inputMode="numeric"
                        />
                      </div>

                      <div className="col-span-4">
                        <label className="text-xs text-neutral-400">
                          Descripción de código
                        </label>
                        <input
                          value={r.codDesc || ""}
                          onChange={(e) => setAdjCell(i, "codDesc", e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-neutral-800 outline-none"
                          placeholder="Ej: Guardia, AD, Compensación…"
                        />
                      </div>

                      {/* Días / Horas / Cantidades */}
                      <div className="col-span-3">
                        <label className="text-xs text-neutral-400">
                          Días / Horas / Cantidades
                        </label>
                        <input
                          value={r.dhc || ""}
                          onChange={(e) => setAdjCell(i, "dhc", e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-neutral-800 outline-none"
                          placeholder="Ej: 3 · 12:00 · 5"
                        />
                      </div>

                      {/* Actividad */}
                      <div className="col-span-3">
                        <label className="text-xs text-neutral-400">Actividad</label>
                        <input
                          value={r.actividad || ""}
                          onChange={(e) => setAdjCell(i, "actividad", e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-neutral-800 outline-none"
                          placeholder="Código de actividad"
                        />
                      </div>
                    </>
                  )}

                  {/* ✅ Centro de costo: SIEMPRE visible (Alta / Baja / Modificar) */}
                  <div className="col-span-3">
                    <label className="text-xs text-neutral-400">Centro de costo</label>
                    <input
                      value={r.cc || ""}
                      onChange={(e) => setAdjCell(i, "cc", e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-800 outline-none"
                      placeholder="Ej: 101/100.00-"
                    />
                  </div>

                  {/* 🔹 SOLO PARA MODIFICAR → Qué modificás + de / a */}
                  {r.accion === "modificar" && (
                    <>
                      <div className="col-span-3">
                        <label className="text-xs text-neutral-400">Qué modificás</label>
                        <select
                          value={r.modCampo || "codigo"}
                          onChange={(e) =>
                            setAdjCell(
                              i,
                              "modCampo",
                              e.target.value as "codigo" | "dhc" | "actividad"
                            )
                          }
                          className="w-full px-3 py-2 rounded-xl bg-neutral-800 outline-none text-sm"
                        >
                          <option value="codigo">Código</option>
                          <option value="dhc">Días / Horas / Cantidades</option>
                          <option value="actividad">Actividad</option>
                        </select>
                      </div>

                      <div className="col-span-3">
                        <label className="text-xs text-neutral-400">
                          Valor actual (de)
                        </label>
                        <input
                          value={r.modDe || ""}
                          onChange={(e) => setAdjCell(i, "modDe", e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-neutral-800 outline-none"
                          placeholder="Ej: 3 · 12:00 · 5"
                        />
                      </div>

                      <div className="col-span-3">
                        <label className="text-xs text-neutral-400">
                          Valor nuevo (a)
                        </label>
                        <input
                          value={r.modA || ""}
                          onChange={(e) => setAdjCell(i, "modA", e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-neutral-800 outline-none"
                          placeholder="Ej: 4 · 12:00 · 6"
                        />
                      </div>
                    </>
                  )}

                  {/* Nota (siempre disponible) */}
                  <div className="col-span-12">
                    <label className="text-xs text-neutral-400">Nota (opcional)</label>
                    <textarea
                      value={r.nota || ""}
                      onChange={(e) => setAdjCell(i, "nota", e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-800 outline-none"
                      rows={2}
                      placeholder="Detalle adicional (turno, fecha, aclaración específica)"
                    />
                  </div>

                  {/* Botón quitar fila */}
                  <div className="col-span-12 flex justify-between">
                    <button
                      onClick={() => removeAdjRow(i)}
                      className="px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 hover:bg-neutral-800 text-sm"
                    >
                      Quitar fila
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex justify-between">
              <button
                onClick={addAdjRow}
                className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-sm"
              >
                ➕ Agregar fila
              </button>
              <div className="flex gap-2">
                <button
                  onClick={cancelAdjust}
                  className="px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 hover:bg-neutral-800"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmAdjust}
                  className="px-3 py-2 rounded-xl bg-sky-700 hover:bg-sky-600"
                >
                  Enviar a Sueldos
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
