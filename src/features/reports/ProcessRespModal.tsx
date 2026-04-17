// @ts-nocheck
import React from "react";

export function ProcessRespModal({ processRespOpen, setProcessRespOpen, processFrom, setProcessFrom, processTo, setProcessTo, processDateFrom, setProcessDateFrom, processDateTo, setProcessDateTo, processIncludeFileDoubts, setProcessIncludeFileDoubts, processRespondedBatch }: any) {
  return (
    <>
      {processRespOpen && (
  <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
    <div className="w-full max-w-xl rounded-2xl border border-neutral-800 bg-neutral-900 shadow-2xl">
      <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
        <div>
          <div className="text-neutral-100 font-medium">Procesar dudas respondidas (batch)</div>
          <div className="text-neutral-500 text-sm">
            Marca como “procesada” cada duda ya respondida por Información, según filtros.
          </div>
        </div>
        <button
          onClick={() => setProcessRespOpen(false)}
          className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-sm"
        >
          Cerrar
        </button>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-neutral-300 block mb-1">Desde Nº funcionario</label>
            <input
              value={processFrom}
              onChange={(e) => setProcessFrom(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-neutral-800 outline-none text-sm"
              placeholder="Ej: 1000"
            />
          </div>
          <div>
            <label className="text-sm text-neutral-300 block mb-1">Hasta Nº funcionario</label>
            <input
              value={processTo}
              onChange={(e) => setProcessTo(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-neutral-800 outline-none text-sm"
              placeholder="Ej: 2000"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <label className="text-sm text-neutral-300 block mb-1">Desde fecha (respuesta)</label>
            <input
              type="date"
              value={processDateFrom}
              onChange={(e) => setProcessDateFrom(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-neutral-800 outline-none text-sm"
            />
          </div>
          <div>
            <label className="text-sm text-neutral-300 block mb-1">Hasta fecha (respuesta)</label>
            <input
              type="date"
              value={processDateTo}
              onChange={(e) => setProcessDateTo(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-neutral-800 outline-none text-sm"
            />
          </div>
        </div>

        <label className="mt-3 flex items-center gap-2 text-sm text-neutral-300">
          <input
            type="checkbox"
            checked={processIncludeFileDoubts}
            onChange={(e) => setProcessIncludeFileDoubts(e.target.checked)}
          />
          Incluir dudas de archivo (sin Nº de funcionario)
        </label>

        <div className="flex items-center justify-end gap-2 mt-4">
          <button
            onClick={() => setProcessRespOpen(false)}
            className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700"
          >
            Cancelar
          </button>
          <button
            onClick={processRespondedBatch}
            className="px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600"
          >
            Procesar ahora
          </button>
        </div>
      </div>
    </div>
  </div>
)}
    </>
  );
}
