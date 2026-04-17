// @ts-nocheck
import React from "react";

export function ExportRespModal({ exportRespOpen, setExportRespOpen, exportFrom, setExportFrom, exportTo, setExportTo, exportKind, setExportKind, exportRespKind, setExportRespKind, exportDateFrom, setExportDateFrom, exportDateTo, setExportDateTo, exportRespondedCSV, selectedPeriodId, periodNameById }: any) {
  return (
    <>
      {/* MODAL: Reporte dudas respondidas (CSV) */}
      {exportRespOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Reporte: dudas y arreglos</h3>
              <button
                onClick={() => setExportRespOpen(false)}
                className="text-neutral-400 hover:text-neutral-200"
              >
                Cerrar
              </button>
            </div>

            <p className="text-neutral-400 text-sm mb-3">
              Exporta a CSV todas las <b>dudas y arreglos</b> de la liquidación{" "}
              <span className="text-neutral-200">
                {periodNameById[selectedPeriodId] || "—"}
              </span>
              , filtrando por <b>Nº de funcionario</b> y otros criterios.
            </p>

            {/* Rango de funcionarios */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-neutral-300 block mb-1">
                  Desde Nº
                </label>
                <input
                  value={exportFrom}
                  onChange={(e) => setExportFrom(e.target.value)}
                  placeholder="Ej: 1000"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-800 outline-none"
                  inputMode="numeric"
                />
              </div>
              <div>
                <label className="text-sm text-neutral-300 block mb-1">
                  Hasta Nº
                </label>
                <input
                  value={exportTo}
                  onChange={(e) => setExportTo(e.target.value)}
                  placeholder="Ej: 2000"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-800 outline-none"
                  inputMode="numeric"
                />
              </div>
            </div>

            {/* Filtros: tipo de registro + respuesta de Sueldos */}
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="text-sm text-neutral-300 block mb-1">
                  Tipo de registro
                </label>
                <select
                  value={exportKind}
                  onChange={(e) =>
                    setExportKind(
                      e.target.value as "all" | "dudas" | "arreglos"
                    )
                  }
                  className="w-full px-3 py-2 rounded-xl bg-neutral-800 outline-none text-sm"
                >
                  <option value="all">Dudas y arreglos</option>
                  <option value="dudas">Sólo dudas</option>
                  <option value="arreglos">Sólo arreglos RRHH</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-neutral-300 block mb-1">
                  Respuesta de Sueldos
                </label>
                <select
                  value={exportRespKind}
                  onChange={(e) =>
                    setExportRespKind(
                      e.target.value as "all" | "con_sueldos" | "sin_sueldos"
                    )
                  }
                  className="w-full px-3 py-2 rounded-xl bg-neutral-800 outline-none text-sm"
                >
                  <option value="all">Con o sin respuesta</option>
                  <option value="con_sueldos">
                    Sólo con respuesta de Sueldos
                  </option>
                  <option value="sin_sueldos">
                    Sólo sin respuesta de Sueldos
                  </option>
                </select>
              </div>
            </div>

            {/* Filtro por fecha */}
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="text-sm text-neutral-300 block mb-1">
                  Desde fecha
                </label>
                <input
                  type="date"
                  value={exportDateFrom}
                  onChange={(e) => setExportDateFrom(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-800 outline-none text-sm"
                />
              </div>
              <div>
                <label className="text-sm text-neutral-300 block mb-1">
                  Hasta fecha
                </label>
                <input
                  type="date"
                  value={exportDateTo}
                  onChange={(e) => setExportDateTo(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-800 outline-none text-sm"
                />
              </div>
            </div>

            <div className="text-xs text-neutral-500 mt-2">
              Podés dejar vacío “Desde” o “Hasta” o las fechas para no acotar por ese extremo.
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setExportRespOpen(false)}
                className="px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 hover:bg-neutral-800"
              >
                Cancelar
              </button>
              <button
                onClick={exportRespondedCSV}
                className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700"
              >
                Exportar CSV
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
