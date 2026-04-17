// @ts-nocheck
import React from "react";

export function NoNewsModal({ noNewsOpen, setNoNewsOpen, selectedKeyForNoNews, setSelectedKeyForNoNews, noNewsOptions, selectedPeriodId, createNewFile, periodNameById }: any) {
  return (
    <>
      {/* MODAL: Archivo sin novedades */}
{noNewsOpen && (
  <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
    <div className="w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-900 p-5 shadow-2xl">
      <h3 className="font-semibold text-neutral-50 text-sm mb-2">
        Marcar sector sin novedades
      </h3>
      <p className="text-xs text-neutral-400 mb-3">
        Registrá que para la liquidación actual un sector no tiene archivo.
        Sueldos verá este registro como "Sin novedades" en la trazabilidad.
      </p>

      <div className="mb-3">
        <label className="block text-[11px] text-neutral-400 mb-1">Sector</label>

        <select
          className="w-full rounded-xl bg-neutral-900 border border-neutral-700 px-3 py-2 text-xs text-neutral-100"
          value={selectedKeyForNoNews}
          onChange={(e) => setSelectedKeyForNoNews(e.target.value)}
        >
          <option value="">Seleccioná un sector…</option>

          {noNewsOptions.options.map((opt) => (
            <option key={opt.key} value={opt.key}>
              {opt.label}
            </option>
          ))}
        </select>

        {noNewsOptions.options.length === 0 && (
          <p className="mt-2 text-[11px] text-amber-400">
            No hay reglas activas con “Sin novedades” habilitado. Configuralas desde “Gestión de sectores y sedes”.
          </p>
        )}
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button
          onClick={() => {
            setNoNewsOpen(false);
            setSelectedKeyForNoNews("");
          }}
          className="px-3 py-1.5 rounded-xl text-xs text-neutral-300 hover:bg-neutral-800"
        >
          Cancelar
        </button>

        <button
          disabled={!selectedKeyForNoNews || !selectedPeriodId}
          onClick={() => {
            if (!selectedPeriodId) return;
            if (!selectedKeyForNoNews) return;

            const meta = noNewsOptions.metaByKey.get(selectedKeyForNoNews);
            if (!meta) {
              alert("No se pudo resolver la regla seleccionada. Reabrí el modal y volvé a elegir.");
              return;
            }

            const { sectorId, siteId, sectorName, siteName } = meta;

            createNewFile(
              {
                name: `Sin novedades - ${sectorName} - ${siteName}`,
                size: 0,
                type: "sin_novedades",
              },
              {
                sectorId,
                sectorName,
                siteId,
                siteName,
                noNews: true,
              }
            );

            setNoNewsOpen(false);
            setSelectedKeyForNoNews("");
          }}
          className="px-3 py-1.5 rounded-xl text-xs bg-emerald-700 hover:bg-emerald-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Confirmar
        </button>
      </div>
    </div>
  </div>
)}
    </>
  );
}
