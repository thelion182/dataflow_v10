// @ts-nocheck
import React from "react";
import AutoGrowTextarea from "../../components/AutoGrowTextarea";

export function ObserveModal({
  observeDialog, fileForObserve, periodNameById, prettyBytes,
  setObsCell, addObsRow, removeObsRow, cancelObserve, confirmObserve, sectors,
}: any) {

  // Todos los sectores activos, SIN deduplicar — cada combo sector+sede es una opción
  const sectorOptions = React.useMemo(() => {
    return (sectors || []).filter((s: any) => !!s?.active && !!s?.name);
  }, [sectors]);

  // Al elegir un sector del select: setea nombre Y cc
  function handleSectorSelect(i: number, sectorId: string) {
    const s = sectorOptions.find((x: any) => x.id === sectorId);
    if (!s) { setObsCell(i, "sector", ""); setObsCell(i, "cc", ""); return; }
    setObsCell(i, "sector", s.name);
    if (s.cc) setObsCell(i, "cc", s.cc);
  }

  if (!observeDialog.open) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-neutral-800 bg-neutral-900 shadow-2xl">

        {/* ── Header ── */}
        <div className="px-5 pt-5 pb-4 border-b border-neutral-800">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-neutral-100 text-base">
                Dudas por funcionario
              </h3>
              {fileForObserve && (
                <p className="text-xs text-neutral-400 mt-1">
                  <span className="text-neutral-200 font-medium">{fileForObserve.name}</span>
                  {" "}·{" "}v{fileForObserve.version}
                  {" "}·{" "}{prettyBytes(fileForObserve.size)}
                  {" "}·{" "}<span className="text-neutral-300">{periodNameById[fileForObserve.periodId] || "—"}</span>
                </p>
              )}
            </div>
            <span className="shrink-0 text-xs text-neutral-500 bg-neutral-800 rounded-lg px-2 py-1">
              {observeDialog.rows.length} {observeDialog.rows.length === 1 ? "fila" : "filas"}
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-2">
            Registrá las dudas por funcionario. Información y Sueldos verán este detalle.
          </p>
        </div>

        {/* ── Filas (scroll) ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {observeDialog.rows.map((r: any, i: number) => (
            <div
              key={r.id}
              className="rounded-xl border border-neutral-800 bg-neutral-950/50 p-4 relative"
            >
              {/* Número de fila + botón quitar */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">
                  Funcionario #{i + 1}
                </span>
                <button
                  onClick={() => removeObsRow(i)}
                  className="text-[11px] text-neutral-500 hover:text-rose-400 px-2 py-0.5 rounded-lg hover:bg-rose-950/40 border border-transparent hover:border-rose-900/50 transition-colors"
                >
                  Quitar
                </button>
              </div>

              {/* Fila 1: Nro + Nombre */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-[11px] text-neutral-500 mb-1">Nro. Funcionario</label>
                  <input
                    value={r.nro}
                    onChange={(e) => setObsCell(i, "nro", e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-neutral-800 border border-neutral-700 text-sm text-neutral-100 outline-none focus:border-neutral-500 placeholder:text-neutral-600"
                    placeholder="Ej: 1234"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-neutral-500 mb-1">Nombre</label>
                  <input
                    value={r.nombre}
                    onChange={(e) => setObsCell(i, "nombre", e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-neutral-800 border border-neutral-700 text-sm text-neutral-100 outline-none focus:border-neutral-500 placeholder:text-neutral-600"
                    placeholder="Apellido, Nombre"
                  />
                </div>
              </div>

              {/* Fila 2: Sector + CC */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-[11px] text-neutral-500 mb-1">Sector</label>
                  {sectorOptions.length > 0 ? (
                    <select
                      value={sectorOptions.find((s: any) => s.name === r.sector && (s.cc || "") === (r.cc || ""))?.id || ""}
                      onChange={(e) => handleSectorSelect(i, e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-neutral-800 border border-neutral-700 text-sm text-neutral-100 outline-none focus:border-neutral-500"
                    >
                      <option value="">(Elegir sector…)</option>
                      {sectorOptions.map((s: any) => (
                        <option key={s.id} value={s.id}>
                          {s.name}{s.siteCode ? ` — ${s.siteCode}` : ""}
                          {s.cc ? ` (${s.cc})` : ""}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={r.sector}
                      onChange={(e) => setObsCell(i, "sector", e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-neutral-800 border border-neutral-700 text-sm text-neutral-100 outline-none focus:border-neutral-500 placeholder:text-neutral-600"
                      placeholder="Sector"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-[11px] text-neutral-500 mb-1">Centro de Costo</label>
                  {/* Desplegable con opciones de sectores + escritura libre via datalist */}
                  <input
                    value={r.cc}
                    list={`cc-list-${r.id}`}
                    onChange={(e) => setObsCell(i, "cc", e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-neutral-800 border border-neutral-700 text-sm text-neutral-100 outline-none focus:border-neutral-500 placeholder:text-neutral-600"
                    placeholder="CC001 o escribí…"
                  />
                  <datalist id={`cc-list-${r.id}`}>
                    {/* Opciones únicas de CC de los sectores activos */}
                    {Array.from(new Map(
                      sectorOptions
                        .filter((s: any) => !!s.cc)
                        .map((s: any) => [s.cc, s])
                    ).values()).map((s: any) => (
                      <option key={s.id} value={s.cc}>
                        {s.name}{s.siteCode ? ` — ${s.siteCode}` : ""}
                      </option>
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Fila 3: Duda */}
              <div>
                <label className="block text-[11px] text-neutral-500 mb-1">Duda</label>
                <AutoGrowTextarea
                  value={r.duda}
                  onChange={(v) => setObsCell(i, "duda", v)}
                  placeholder="Describí la duda de este funcionario…"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-800 border border-neutral-700 text-sm text-neutral-100 outline-none focus:border-neutral-500 placeholder:text-neutral-600 resize-none min-h-[80px]"
                />
              </div>
            </div>
          ))}

          {observeDialog.rows.length === 0 && (
            <div className="text-center py-10 text-neutral-600 text-sm">
              No hay filas todavía. Usá "Agregar funcionario" para empezar.
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-5 py-4 border-t border-neutral-800 flex items-center justify-between gap-3">
          <button
            onClick={addObsRow}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-sm text-neutral-100 border border-neutral-700 transition-colors"
          >
            <span className="text-base leading-none">+</span>
            Agregar funcionario
          </button>
          <div className="flex gap-2">
            <button
              onClick={cancelObserve}
              className="px-4 py-2 rounded-xl bg-neutral-900 border border-neutral-700 hover:bg-neutral-800 text-sm text-neutral-300 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={confirmObserve}
              className="px-4 py-2 rounded-xl bg-amber-600/80 hover:bg-amber-600 border border-amber-500/60 text-sm text-white font-medium transition-colors"
            >
              Confirmar observación
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
