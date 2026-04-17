// @ts-nocheck
import React from "react";

export function SectorsModal({ sectorsOpen, setSectorsOpen, sectors, sites, isAdmin, rrhhUsers, addSector, updateSector, deleteSector, updateSite, handleImportSectorsCSV, downloadSectorsTemplateCSV, setSectorsCsvHelpOpen, setSitesManageOpen }: any) {
  return (
    <>
      {/* MODAL: Sectores & Sedes (UNIFICADO) */}
{sectorsOpen && (
  <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
    <div className="w-full max-w-5xl rounded-2xl border border-neutral-800 bg-neutral-900 p-5 shadow-2xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="font-semibold text-neutral-50 text-sm">
            Gestión de sectores & sedes
          </h3>
          <p className="text-xs text-neutral-400 mt-1">
            Acá configurás las reglas “Sector + Sede” para que un mismo sector pueda existir en varios sanatorios.
            Solo Administrador puede modificar.
          </p>
        </div>

        <button
          onClick={() => setSectorsOpen(false)}
          className="text-neutral-400 hover:text-neutral-100 text-xs px-2 py-1 rounded-lg hover:bg-neutral-800"
        >
          Cerrar
        </button>
      </div>

      {/* Barra superior (acciones) */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="text-[11px] text-neutral-500">
          Total reglas (Sector+Sede): <b>{sectors.length}</b> · Total sedes: <b>{sites.length}</b>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Import / Plantilla (sectores) */}
            <button
              onClick={() => document.getElementById("csvSectorsInput")?.click()}
              className="text-xs px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-100"
              title="Importar reglas desde un CSV separado por coma"
            >
              ⬆️ Importar CSV
            </button>

            <input
              id="csvSectorsInput"
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => handleImportSectorsCSV(e)}
            />




            <button
  onClick={() => setSectorsCsvHelpOpen(true)}
  className="px-2 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs"
>
  ❓ Formato CSV
</button>


            {/* Agregar regla */}
            <button
              onClick={() => {
                const name = window.prompt("Nombre del sector (ej: Ropería):");
                if (!name) return;

                // Si hay sedes, proponemos la primera; si no, queda vacío
                const defaultSiteCode = (sites?.[0]?.code || "").toUpperCase();

                addSector({
                  name: name.trim(),
                  patterns: [],
                  active: true,
                  requiredCount: 1,
                  allowNoNews: true,
                  siteCode: "", // ✅ por defecto vacío, el admin lo elige
                });
                
              }}
              className="text-xs px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-100"
              title="Crear una regla Sector + Sede"
            >
              ➕ Agregar regla
            </button>

            {/* Agregar sede (ahora dentro del mismo modal) */}
            <button
  onClick={() => setSitesManageOpen(true)}
  className="px-2 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs"
  title="Crear y editar sedes"
>
  ➕ Agregar sede
</button>

          </div>
        )}
      </div>

      {/* Divider */}
      <div className="mb-3 h-px w-full bg-neutral-800/70" />

      {/* TABLA REGLAS (Sector + Sede) */}
      <div className="max-h-[360px] overflow-auto rounded-2xl border border-neutral-800">
        <table className="w-full text-xs">
          <thead className="bg-neutral-900/80 sticky top-0 z-10">
            <tr className="text-[11px] text-neutral-500">
              <th className="text-left px-3 py-2 font-normal w-[14%]">Sector</th>
              <th className="text-left px-3 py-2 font-normal w-[20%]">Patrones</th>
              <th className="text-left px-3 py-2 font-normal w-[10%]">Sede</th>
              <th className="text-left px-3 py-2 font-normal w-[12%]">Responsable</th>
              <th className="text-left px-3 py-2 font-normal w-[10%]">C. Costo</th>
              <th className="text-right px-3 py-2 font-normal w-[7%]">Req</th>
              <th className="text-left px-3 py-2 font-normal w-[9%]">Sin nov.</th>
              <th className="text-left px-3 py-2 font-normal w-[6%]">Activo</th>
              <th className="text-right px-3 py-2 font-normal w-[8%]">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {sectors.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-3 py-4 text-center text-[11px] text-neutral-500"
                >
                  No hay reglas todavía. {isAdmin ? "Usá “Agregar regla”." : ""}
                </td>
              </tr>
            )}

            {sectors.map((s: any) => {
              const patternsString = (s.patterns || []).join(", ");
              const site =
              (sites || []).find(
                (x: any) => String(x.code || "").toUpperCase() === String(s.siteCode || "").toUpperCase()
              ) || null;
            
              

              return (
                <tr
                  key={s.id}
                  className="border-t border-neutral-800/70 hover:bg-neutral-900/70"
                >
                  {/* Sector */}
                  <td className="px-3 py-2 align-top">
                    {isAdmin ? (
                      <input
                        className="w-full rounded-xl bg-neutral-900 border border-neutral-700 px-2 py-1 text-xs text-neutral-100"
                        value={s.name}
                        onChange={(e) => updateSector(s.id, { name: e.target.value })}

                      />
                    ) : (
                      <span className="text-neutral-100 text-xs">{s.name}</span>
                    )}
                  </td>

                  {/* Patrones */}
                  <td className="px-3 py-2 align-top">
                    {isAdmin ? (
                      <textarea
                        className="w-full rounded-xl bg-neutral-900 border border-neutral-700 px-2 py-1 text-xs text-neutral-100 resize-none h-[52px]"
                        value={patternsString}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const arr = raw
                            .split(",")
                            .map((p) => p.trim())
                            .filter(Boolean);
                          updateSector(s.id, { patterns: arr });
                        }}
                        placeholder="ej: ropería, roperia, ropa"
                      />
                    ) : (
                      <span className="text-neutral-300 text-[11px]">
                        {patternsString || "—"}
                      </span>
                    )}
                  </td>

                  {/* Sede */}
<td className="px-3 py-2 align-top">
  {isAdmin ? (
    <select
      className="w-full rounded-xl bg-neutral-900 border border-neutral-700 px-2 py-1 text-xs text-neutral-100"
      value={s.siteCode || ""}
      onChange={(e) => {
        const code = (e.target.value || "").trim().toUpperCase();
        updateSector(s.id, { siteCode: code });
      }}
      title="Elegí la sede para esta regla"
    >
      <option value="">(Sin sede)</option>
      {(sites || [])
        .filter((x: any) => x.active)
        .map((x: any) => (
          <option key={x.code} value={x.code}>
            {x.code} — {x.name}
          </option>
        ))}
    </select>
  ) : (
    <span className="text-neutral-300 text-[11px]">
      {s.siteCode ? `${s.siteCode}${site?.name ? ` — ${site.name}` : ""}` : "—"}
    </span>
  )}
</td>


                  {/* Responsable (por sede) */}
                  <td className="px-3 py-2 align-top">
                    {isAdmin ? (
                      <select
                        className="w-full rounded-xl bg-neutral-900 border border-neutral-700 px-2 py-1 text-xs text-neutral-100"
                        value={s.ownerUserId || ""}
                        onChange={(e) => {
                          const uid = e.target.value || "";
                          const u = rrhhUsers?.find((x: any) => x.id === uid);
                          updateSector(s.id, {
                            ownerUserId: uid || null,
                            ownerUsername: uid ? (u?.username || u?.displayName || "") : null,
                          });
                        }}
                      >
                        <option value="">(Sin asignar)</option>
                        {(rrhhUsers || []).map((u: any) => (
                          <option key={u.id} value={u.id}>
                            {u.displayName || u.username}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-neutral-300 text-[11px]">
                        {s.ownerUsername || "—"}
                      </span>
                    )}
                  </td>

                  {/* Centro de costo */}
                  <td className="px-3 py-2 align-top">
                    {isAdmin ? (
                      <input
                        className="w-full rounded-xl bg-neutral-900 border border-neutral-700 px-2 py-1 text-xs text-neutral-100"
                        value={s.cc || ""}
                        onChange={(e) => updateSector(s.id, { cc: e.target.value })}
                        placeholder="Ej: CC001"
                      />
                    ) : (
                      <span className="text-neutral-300 text-[11px]">{s.cc || "—"}</span>
                    )}
                  </td>

                  {/* Requeridos */}
                  <td className="px-3 py-2 align-top text-right">
                    {isAdmin ? (
                      <input
                        type="number"
                        min={0}
                        className="w-16 text-right rounded-xl bg-neutral-900 border border-neutral-700 px-2 py-1 text-xs text-neutral-100"
                        value={Number.isFinite(s.requiredCount) ? s.requiredCount : 0}
                        onChange={(e) => {
                          const n = Math.max(0, parseInt(e.target.value || "0", 10));
                          updateSector(s.id, { requiredCount: Number.isFinite(n) ? n : 0 });
                        }}
                      />
                    ) : (
                      <span className="text-[11px] text-neutral-300">
                        {Number.isFinite(s.requiredCount) ? s.requiredCount : 0}
                      </span>
                    )}
                  </td>

                  {/* Sin novedades */}
                  <td className="px-3 py-2 align-top">
                    {isAdmin ? (
                      <label className="inline-flex items-center gap-2 text-[11px] text-neutral-200">
                        <input
                          type="checkbox"
                          checked={!!s.allowNoNews}
                          onChange={(e) =>
                            updateSector(s.id, { allowNoNews: e.target.checked })
                          }
                        />
                        <span>Cuenta</span>
                      </label>
                    ) : (
                      <span className="text-[11px] text-neutral-300">
                        {s.allowNoNews ? "Cuenta" : "No cuenta"}
                      </span>
                    )}
                  </td>

                  {/* Activo */}
                  <td className="px-3 py-2 align-top">
                    {isAdmin ? (
                      <label className="inline-flex items-center gap-2 text-[11px] text-neutral-200">
                        <input
                          type="checkbox"
                          checked={!!s.active}
                          onChange={(e) => updateSector(s.id, { active: e.target.checked })}
                        />
                        <span>{s.active ? "Activo" : "Inactivo"}</span>
                      </label>
                    ) : (
                      <span
                        className={
                          "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] " +
                          (s.active
                            ? "bg-emerald-900/40 text-emerald-300 border border-emerald-700/60"
                            : "bg-neutral-900/70 text-neutral-400 border border-neutral-700/60")
                        }
                      >
                        {s.active ? "Activo" : "Inactivo"}
                      </span>
                    )}
                  </td>

                  {/* Acciones */}
                  <td className="px-3 py-2 align-top text-right">
                    {isAdmin ? (
                      <button
                        onClick={() => deleteSector(s.id)}
                        className="text-[11px] text-red-400 hover:text-red-300 hover:bg-red-950/40 px-2 py-1 rounded-lg border border-transparent hover:border-red-800/70"
                      >
                        Borrar
                      </button>
                    ) : (
                      <span className="text-[10px] text-neutral-500">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 text-[10px] text-neutral-500">
        Tip: el sistema detecta sede por código (SG/SC/JPII) en el nombre del archivo, y luego aplica patrones del sector.
        Esta tabla representa combinaciones “Sector + Sede”.
      </div>
    </div>
  </div>
)}
{/* FIN MODAL: Sectores & Sedes (UNIFICADO) */}
    </>
  );
}
