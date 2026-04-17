// @ts-nocheck
import React from "react";

export function SectorsCsvHelpModal({ sectorsCsvHelpOpen, setSectorsCsvHelpOpen, downloadSectorsTemplateCSV }: any) {
  return (
    <>
      {/* MODAL: Ayuda formato CSV Sectores */}
{sectorsCsvHelpOpen && (
  <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
    <div className="w-full max-w-xl rounded-2xl border border-neutral-800 bg-neutral-900 p-5 shadow-2xl">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="font-semibold text-neutral-50 text-sm">Formato del CSV (Sectores + Sedes)</h3>
          <p className="text-xs text-neutral-400 mt-1">
            Separador de columnas: <b>coma</b>. Encabezados obligatorios como en la plantilla.
          </p>
        </div>

        <button
          onClick={() => setSectorsCsvHelpOpen(false)}
          className="text-neutral-400 hover:text-neutral-100 text-xs px-2 py-1 rounded-lg hover:bg-neutral-800"
        >
          Cerrar
        </button>
      </div>

      <div className="text-xs text-neutral-300 space-y-3">
        <div>
          <div className="text-[11px] text-neutral-500 mb-1">Columnas (en este orden):</div>
          <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-3 font-mono text-[11px] text-neutral-200 whitespace-pre-wrap">
            sector,patrones,sede,responsable,requeridos,sin_novedades,activo
          </div>
        </div>

        <div>
          <div className="text-[11px] text-neutral-500 mb-1">Ejemplo de una fila:</div>
          <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-3 font-mono text-[11px] text-neutral-200 whitespace-pre-wrap">
            Roperia,sg,SG,lmatondi,1,si,si
          </div>
        </div>

        <ul className="list-disc ml-5 text-[11px] text-neutral-400 space-y-1">
          <li>
            <b>sector</b>: nombre del sector (ej: <code className="text-neutral-200">Roperia</code>).
          </li>
          <li>
            <b>patrones</b>: si hay varios, separalos con <b>;</b> (ej:
            <code className="text-neutral-200"> roperia;ropa;rop</code>). Dentro de esa celda no uses comas.
          </li>
          <li>
            <b>sede</b>: código corto (ej: <code className="text-neutral-200">SG</code>, <code className="text-neutral-200">SC</code>, <code className="text-neutral-200">JPII</code>).
          </li>
          <li>
            <b>responsable</b>: username del usuario Información/RRHH (ej: <code className="text-neutral-200">lmatondi</code>).
          </li>
          <li>
            <b>requeridos</b>: número (0, 1, 2...).
          </li>
          <li>
            <b>sin_novedades</b> y <b>activo</b>: <b>si/no</b>.
          </li>
        </ul>

        <div className="pt-2 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => downloadSectorsTemplateCSV()}
            className="text-xs px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-100"
            title="Descargar plantilla CSV"
          >
            ⬇️ Descargar plantilla
          </button>
        </div>
      </div>
    </div>
  </div>
)}
{/* FIN MODAL: Ayuda formato CSV Sectores */}
    </>
  );
}
