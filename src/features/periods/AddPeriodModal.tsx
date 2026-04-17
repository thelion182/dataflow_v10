// @ts-nocheck
import React from "react";
import { uuid } from "../../lib/ids";
import { monthName } from "../../lib/time";

export function AddPeriodModal({
  addPeriodOpen, setAddPeriodOpen,
  newPeriodYM, setNewPeriodYM,
  myPerms, periods, setPeriods, setSelectedPeriodId,
}: any) {
  if (!addPeriodOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
        <h3 className="font-semibold mb-2">Nueva liquidación</h3>
        <p className="text-neutral-400 text-sm mb-2">
          Elegí mes y año (no se repite si ya existe).
        </p>
        <input
          type="month"
          value={newPeriodYM}
          onChange={(e) => setNewPeriodYM(e.target.value)}
          className="w-full px-3 py-2 rounded-xl bg-neutral-800 outline-none"
        />
        <div className="flex justify-end gap-2 mt-3">
          <button
            onClick={() => setAddPeriodOpen(false)}
            className="px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 hover:bg-neutral-800"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              if (!myPerms.actions.createPeriod) {
                alert("No tenés permiso");
                return;
              }
              const ym = (newPeriodYM || "").trim();
              if (!ym) { alert("Elegí un mes."); return; }
              const [y, m] = ym.split("-").map(Number);
              const name = `${monthName(m)} ${y}`;
              const exists = periods.some((p: any) => p.year === y && p.month === m);
              if (exists) { alert("Esa liquidación ya existe."); return; }
              const id = uuid();
              const nuevoPeriodo = { id, year: y, month: m, name, uploadFrom: "", uploadTo: "" };
              const np = [...periods, nuevoPeriodo];
              setPeriods(np);
              setSelectedPeriodId(id);
              setAddPeriodOpen(false);
            }}
            className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700"
          >
            Crear
          </button>
        </div>
      </div>
    </div>
  );
}
