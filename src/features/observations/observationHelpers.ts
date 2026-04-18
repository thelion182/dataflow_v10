// @ts-nocheck
import { uuid } from "../../lib/ids";

export function blankObsRow() {
  return { id: uuid(), nro: "", nombre: "", duda: "", sector: "", cc: "" };
}

/** Devuelve TODAS las filas (dudas + arreglos) y marca el tipo en _tipo */
export function getAllObservationRows(file: any) {
  const obs = (file?.observations || []).filter((t: any) => !t?.deleted);
  const out: any[] = [];
  for (const th of obs) {
    for (const r of (th.rows || [])) {
      out.push({ ...r, _tipo: th?.tipo || "duda" });
    }
  }
  return out;
}

export function pendingDudasCount(file: any) {
  const obs = (file?.observations || []).filter((t: any) => !t?.deleted);
  return obs
    .filter((t: any) => t.tipo !== "arreglo")
    .flatMap((t: any) => t.rows || [])
    .filter((r: any) => !r.answered).length;
}

export function answeredDudasCount(file: any) {
  const obs = (file?.observations || []).filter((t: any) => !t?.deleted);
  return obs
    .filter((t: any) => t.tipo !== "arreglo")
    .flatMap((t: any) => t.rows || [])
    .filter((r: any) => !!r.answered).length;
}

export function answeredFuncionarioDoubtsCount(file: any) {
  const obs = (file?.observations || []).filter((t: any) => !t?.deleted);
  return obs
    .filter((t: any) => t.tipo !== "arreglo")
    .flatMap((t: any) => t.rows || [])
    .filter((r: any) => !!r.answered && (r.nro || r.nombre || r.sector || r.cc)).length;
}

export function answeredArchivoDoubtsCount(file: any) {
  const obs = (file?.observations || []).filter((t: any) => !t?.deleted);
  return obs
    .filter((t: any) => t.tipo !== "arreglo")
    .flatMap((t: any) => t.rows || [])
    .filter((r: any) => !!r.answered && !(r.nro || r.nombre || r.sector || r.cc)).length;
}

export function pendingArreglosCount(file: any) {
  const obs = (file?.observations || []).filter((t: any) => !t?.deleted);
  return obs
    .filter((t: any) => t.tipo === "arreglo")
    .flatMap((t: any) => t.rows || [])
    .filter((r: any) => !r.answered).length;
}

export function answeredArreglosCount(file: any) {
  const obs = (file?.observations || []).filter((t: any) => !t?.deleted);
  return obs
    .filter((t: any) => t.tipo === "arreglo")
    .flatMap((t: any) => t.rows || [])
    .filter((r: any) => !!r.answered).length;
}

export function pendingCount(file: any) {
  return getAllObservationRows(file).filter(r => !r?.answered).length;
}

export function answeredCount(file: any) {
  return getAllObservationRows(file).filter(r => !!r?.answered).length;
}

export function hasPendingDoubts(file: any) {
  return pendingCount(file) > 0;
}

/** Dudas respondidas por RRHH pero aún no procesadas/marcadas por Sueldos */
export function respondidaNoProcessadaCount(file: any) {
  const obs = (file?.observations || []).filter((t: any) => !t?.deleted);
  return obs
    .flatMap((t: any) => t.rows || [])
    .filter((r: any) => !!r.answered && !r.processed).length;
}

export function hasRespondidaNoProcessada(file: any) {
  return respondidaNoProcessadaCount(file) > 0;
}

export function matchesDoubtFilter(file: any, mode: any, value: any) {
  if (mode === "all") return true;
  const rows = getAllObservationRows(file);
  const v = String(value || "").trim().toLowerCase();
  if (mode === "con")  return rows.some(r => !r?.answered);
  if (mode === "sin")  return rows.every(r => !!r?.answered);
  if (mode === "arreglo")       return rows.some(r => r._tipo === "arreglo");
  if (mode === "arreglo_pend")  return rows.some(r => r._tipo === "arreglo" && !r?.answered);
  if (mode === "resp_no_proc")  return rows.some(r => !!r?.answered && !r?.processed);
  if (mode === "pend_procesar") return rows.some(r => !!r?.answered && !r?.processed);
  switch (mode) {
    case "nro":    return rows.some(r => String(r?.nro || "").toLowerCase().includes(v));
    case "sector": return rows.some(r => String(r?.sector || "").toLowerCase().includes(v));
    case "cc":     return rows.some(r => String(r?.cc || "").toLowerCase().includes(v));
    case "texto":  return rows.some(r => String(r?.duda || r?.nota || "").toLowerCase().includes(v));
    default: return true;
  }
}
