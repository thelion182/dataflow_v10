// @ts-nocheck
import React from "react";

export default function PeriodPicker({
  role,
  canCreate,
  periods,
  selectedPeriodId,
  setSelectedPeriodId,
}: {
  role: string;
  canCreate: boolean;
  periods: any[];
  selectedPeriodId: string;
  setSelectedPeriodId: (id: string) => void;
}) {
  return (
    <select
      value={selectedPeriodId}
      onChange={(e) => setSelectedPeriodId(e.target.value)}
      className="px-3 py-2 rounded-xl bg-neutral-800 outline-none text-sm"
      aria-label="Seleccionar liquidación"
    >
      <option value="">— Liquidación —</option>
      {periods.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );
}
