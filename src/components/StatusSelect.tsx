// @ts-nocheck
import React from "react";
import { STATUS } from "../types";

export default function StatusSelect({
  f,
  value,
  allowedStatuses,
  onChangeStatus,
}: {
  f: any;
  value: string;
  allowedStatuses: string[];
  onChangeStatus: (next: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChangeStatus(e.target.value)}
      className="px-2 py-0.5 rounded-lg bg-neutral-800 outline-none text-xs"
      onClick={(e) => e.stopPropagation()}
    >
      {STATUS.filter((s) => allowedStatuses.includes(s.key)).map((s) => (
        <option key={s.key} value={s.key}>
          {s.label}
        </option>
      ))}
    </select>
  );
}
