// @ts-nocheck
import React from "react";

export const sclone = (o: any) =>
  typeof structuredClone !== "undefined"
    ? structuredClone(o)
    : JSON.parse(JSON.stringify(o));

export function userNameOr(roleOrName: any) {
  return roleOrName || "sistema";
}

export function typeBadge(type?: string) {
  const t = (type || "").toLowerCase();
  if (t.includes("csv")) return "CSV";
  if (t.includes("excel") || t.includes("sheet") || t.includes("xls")) return "Excel";
  if (t.includes("oasis") || t.includes("ods")) return "ODS";
  if (t.includes("text")) return "TXT";
  return "Otro";
}

export function statusBadgeClasses(key: string) {
  switch (key) {
    case "cargado": return "bg-amber-500/30 text-amber-200 border border-amber-400/30";
    case "duda_respondida": return "bg-teal-500/20 text-teal-300 border border-teal-500/30";
    case "descargado": return "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30";
    case "listo": return "bg-sky-500/20 text-sky-300 border border-sky-500/30";
    case "actualizado": return "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30";
    case "observado": return "bg-rose-500/20 text-rose-300 border border-rose-500/30";
    case "sustituido": return "bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30";
    case "eliminado": return "bg-red-600/20 text-red-300 border border-red-600/30";
    default: return "bg-neutral-800 text-neutral-300 border border-neutral-700";
  }
}

export function pendingChipClasses(count: number) {
  return count === 0
    ? "bg-neutral-700/40 text-neutral-300 border border-neutral-700/60"
    : "bg-rose-500/20 text-rose-300 border border-rose-500/30";
}

export function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left px-4 py-3 text-xs uppercase tracking-wider">{children}</th>;
}

export type AppEvent = {
  id: string;
  type:
    | "file_uploaded"
    | "status_changed"
    | "version_bumped"
    | "observation_added"
    | "observation_answered"
    | "note_updated"
    | "download_marked"
    | "file_deleted";
  title: string;
  message: string;
  fileId?: string;
  periodId?: string;
  byUserId?: string;
  byUsername?: string;
  at?: string;
};
