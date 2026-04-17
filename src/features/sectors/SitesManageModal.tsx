// @ts-nocheck
import React from "react";

export function SitesManageModal({ sitesManageOpen, setSitesManageOpen, sites, addSite, updateSite, deleteSite, handleImportSitesCSV, downloadSitesTemplateCSV }: any) {
  return (
    <>
      {/* MODAL: Gestión de sedes */}
{sitesManageOpen && (
  <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
    <div className="w-full max-w-3xl rounded-2xl border border-neutral-800 bg-neutral-900 p-4 shadow-2xl">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-neutral-50 text-sm">Gestión de sedes</h3>
          <p className="text-xs text-neutral-400 mt-1">
            Definí <b>código corto</b>, nombre y patrones. La detección de sede se basa en el código en el nombre del archivo.
          </p>
        </div>
        <button
          onClick={() => setSitesManageOpen(false)}
          className="text-neutral-400 hover:text-neutral-100 text-xs px-2 py-1 rounded-lg hover:bg-neutral-800"
        >
          Cerrar
        </button>
      </div>

      {/* Input hidden para importar CSV de sedes */}
      <input
        id="csvSitesInput"
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleImportSitesCSV(f);
          e.currentTarget.value = "";
        }}
      />

      <div className="flex items-center justify-between mb-3">
        <div className="text-xs text-neutral-500">
          Total sedes: <b className="text-neutral-200">{(sites || []).length}</b>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              addSite({
                code: "",
                name: "",
                patterns: [],
                active: true,
              } as any)
            }
            className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-sm"
          >
            ➕ Nueva sede
          </button>

          <button
            type="button"
            onClick={() => downloadSitesTemplateCSV()}
            className="px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 hover:bg-neutral-800 text-sm"
            title="Descargar plantilla CSV para sedes"
          >
            ⬇️ Plantilla sedes (CSV)
          </button>

          <button
            type="button"
            onClick={() => document.getElementById("csvSitesInput")?.click()}
            className="px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 hover:bg-neutral-800 text-sm"
            title="Importar sedes desde CSV"
          >
            ⬆️ Importar sedes (CSV)
          </button>
        </div>
      </div>

      <div className="max-h-[55vh] overflow-auto rounded-2xl border border-neutral-800">
        <table className="w-full text-xs">
          <thead className="bg-neutral-900/80 sticky top-0 z-10">
            <tr className="text-[11px] text-neutral-500">
              <th className="text-left px-3 py-2 font-normal w-[16%]">Código</th>
              <th className="text-left px-3 py-2 font-normal w-[28%]">Nombre</th>
              <th className="text-left px-3 py-2 font-normal w-[40%]">Patrones</th>
              <th className="text-left px-3 py-2 font-normal w-[8%]">Activo</th>
              <th className="text-left px-3 py-2 font-normal w-[8%]">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {(sites || []).map((si: any) => (
              <tr key={si.id} className="border-t border-neutral-800/70">
                <td className="px-3 py-2 align-top">
                  <input
                    value={si.code || ""}
                    onChange={(e) =>
                      updateSite(si.id, {
                        code: e.target.value.toUpperCase().replace(/\s+/g, "").slice(0, 8),
                      } as any)
                    }
                    placeholder="SG"
                    className="w-full px-2 py-1 rounded-lg bg-neutral-800 outline-none text-xs"
                  />
                </td>

                <td className="px-3 py-2 align-top">
                  <input
                    value={si.name || ""}
                    onChange={(e) => updateSite(si.id, { name: e.target.value } as any)}
                    placeholder="Sanatorio Galicia"
                    className="w-full px-2 py-1 rounded-lg bg-neutral-800 outline-none text-xs"
                  />
                </td>

                <td className="px-3 py-2 align-top">
                  <input
                    value={(si.patterns || []).join(", ")}
                    onChange={(e) =>
                      updateSite(si.id, {
                        patterns: e.target.value
                          .split(/[,;|]/)
                          .map((x) => x.trim())
                          .filter(Boolean),
                      } as any)
                    }
                    placeholder="SG, Galicia"
                    className="w-full px-2 py-1 rounded-lg bg-neutral-800 outline-none text-xs"
                  />
                  <div className="text-[10px] text-neutral-500 mt-1">
                    Separá con coma, punto y coma o “|”.
                  </div>
                </td>

                <td className="px-3 py-2 align-top">
                  <label className="inline-flex items-center gap-2 text-xs text-neutral-300">
                    <input
                      type="checkbox"
                      checked={!!si.active}
                      onChange={(e) => updateSite(si.id, { active: e.target.checked } as any)}
                    />
                    Activo
                  </label>
                </td>

                <td className="px-3 py-2 align-top">
                  <button
                    onClick={() => {
                      if (!confirm(`¿Borrar sede ${si.code || ""}?`)) return;
                      deleteSite(si.id);
                    }}
                    className="text-red-300 hover:text-red-200 text-xs"
                  >
                    Borrar
                  </button>
                </td>
              </tr>
            ))}

            {(sites || []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-3 text-neutral-500 text-center">
                  No hay sedes aún.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-neutral-500 mt-3">
        Regla: el nombre del archivo debe incluir el <b>código corto</b> (SG/SC/etc) para detectar la sede.
      </div>
    </div>
  </div>
)}
    </>
  );
}
