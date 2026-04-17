// @ts-nocheck
import { useState } from "react";
import { nowISO } from "../lib/time";
import { loadUsers } from "../lib/auth";
import { sclone } from '../features/shared/uiHelpers';

export function useReports({
  files, me, myPerms, selectedPeriodId, periodNameById,
  exportFrom, setExportFrom, exportTo, setExportTo,
  exportKind, setExportKind, exportRespKind, setExportRespKind,
  exportDateFrom, setExportDateFrom, exportDateTo, setExportDateTo,
  processFrom, setProcessFrom, processTo, setProcessTo,
  processDateFrom, setProcessDateFrom, processDateTo, setProcessDateTo,
  processIncludeFileDoubts, setProcessIncludeFileDoubts,
  exportRespOpen, setExportRespOpen,
  processRespOpen, setProcessRespOpen,
  updateFile, addHistoryEntry, pushToast, publishEvent,
}: any) {

function exportCSV() {
  if (!myPerms.actions.exportCSV) return;

  const allUsers = loadUsers();
  const userById: Record<string, any> = {};
  for (const u of allUsers) {
    userById[u.id] = u;
  }

  // Texto legible de numeraciones asignadas por usuario / período.
  function humanReadableNumbers(f: any): string {
    const map = f.downloadNumbersByUser || {};
    const chunks: string[] = [];

    for (const userId of Object.keys(map)) {
      const perPeriodObj = map[userId]; // { [periodId]: assignedNumber }

      // info del usuario
      const u = userById[userId];
      const uname = u?.username || userId;
      const disp = u?.displayName || "";
      const userLabel = disp ? `${uname} (${disp})` : uname;

      for (const perId of Object.keys(perPeriodObj)) {
        const num = perPeriodObj[perId];
        const perName = periodNameById[perId] || perId;
        chunks.push(`${userLabel}: ${num} en ${perName}`);
      }
    }

    return chunks.join("; ");
  }

  // Formato crudo / técnico.
  function rawNumbers(f: any): string {
    const map = f.downloadNumbersByUser || {};
    const outer: string[] = [];
    for (const userId of Object.keys(map)) {
      const perPeriodObj = map[userId];
      const innerPairs: string[] = [];
      for (const perId of Object.keys(perPeriodObj)) {
        const num = perPeriodObj[perId];
        const perName = periodNameById[perId] || perId;
        innerPairs.push(`${perName}=${num}`);
      }
      outer.push(`${userId}|${innerPairs.join(",")}`);
    }
    return outer.join(" ; ");
  }

  // 🔹 Orden REAL de campos que vamos a exportar (sin id, sin type, sin byUserId)
  const fieldOrder = [
    "name",                   // Nombre de archivo
    "size",                   // Tamaño
    "status",                 // Estado
    "version",                // Versión
    "byUsername",             // Usuario que cargó
    "at",                     // Fecha/hora de carga
    "downloadedAt",           // Fecha/hora última descarga
    "notes",                  // Notas
    "period",                 // Liquidación
    "downloadAssignedNumbers",// Nros asignados (legible)
    "downloadAssignedRaw",    // Nros asignados (técnico)
  ] as const;

  // 🔹 Encabezados visibles en el CSV (en el mismo orden que fieldOrder)
  const headers = [
    "Nombre de archivo",
    "Tamaño (bytes)",
    "Estado",
    "Versión",
    "Usuario que cargó",
    "Fecha/hora de carga",
    "Fecha/hora última descarga",
    "Notas",
    "Liquidación",
    "Números asignados (legible)",
    "Números asignados (técnico)",
  ];

  // Generamos filas (una por archivo en 'files')
  const rows = files.map((f) => {
    const periodName = periodNameById[f.periodId] || "";
    const prettyNums = humanReadableNumbers(f);
    const rawNums = rawNumbers(f);

    const dataByField: Record<string, string> = {
      name: String(f.name ?? ""),
      size: String(f.size ?? ""),
      status: String(f.status ?? ""),
      version: String(f.version ?? ""),
      byUsername: String(f.byUsername ?? ""),
      at: String(f.at ?? ""),
      downloadedAt: String(f.downloadedAt ?? ""),
      notes: String(f.notes ?? ""),
      period: periodName,
      downloadAssignedNumbers: prettyNums,
      downloadAssignedRaw: rawNums,
    };

    return fieldOrder.map((key) => dataByField[key] ?? "");
  });

  // Helpers CSV
  const needsQuote = (s: any) => {
    const t = String(s);
    return t.includes(",") || t.includes("\n") || t.includes('"');
  };
  const esc = (s: any) => `"${String(s).replace(/"/g, '""')}"`;

  const body = rows
    .map((row) =>
      row
        .map((v) => (needsQuote(v) ? esc(v) : String(v)))
        .join(",")
    )
    .join("\n");

  const csv = headers.join(",") + "\n" + body;

  // Descargar CSV inventario
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download =
    "dataflow_reporte_" +
    new Date().toISOString().slice(0, 10) +
    ".csv";
  document.body.appendChild(a);
  a.click();
  a.remove();

  publishEvent({
    type: "note_updated",
    title: "Reporte generado",
    message: `Se exportó el CSV general de archivos (${rows.length} filas).`,
  });
}

function exportDownloadsCSV() {
  if (!myPerms.actions.exportCSV) {
    alert("No tenés permiso para exportar reportes.");
    return;
  }

  // Mapeo de usuarios
  const allUsers = loadUsers();
  const userById: Record<string, any> = {};
  for (const u of allUsers) {
    userById[u.id] = u;
  }

  // Aplanamos: archivo × usuario × liquidación → fila
  type DownloadRow = {
    periodName: string;
    fileName: string;
    username: string;
    displayName: string;
    assignedNumber: string;
    downloadedAt: string;
  };

  const flatRows: DownloadRow[] = [];

  for (const f of files) {
    const mapByUser = f.downloadNumbersByUser || {};
    for (const userId of Object.keys(mapByUser)) {
      const perToNum = mapByUser[userId] || {};

      for (const periodId of Object.keys(perToNum)) {
        const assignedNumber = perToNum[periodId];

        const u = userById[userId];
        const username = u?.username || userId;
        const displayName = u?.displayName || "";

        const periodName = periodNameById[periodId] || periodId;

        flatRows.push({
          periodName,
          fileName: String(f.name ?? ""),
          username,
          displayName,
          assignedNumber: String(assignedNumber ?? ""),
          downloadedAt: String(f.downloadedAt ?? ""),
        });
      }
    }
  }

  if (flatRows.length === 0) {
    alert("No hay descargas registradas todavía.");
    return;
  }

  // 🔹 Encabezados en español (ya sin periodId, fileId, userId)
  const headers = [
    "Liquidación",
    "Nombre de archivo",
    "Usuario (login)",
    "Nombre visible usuario",
    "Número asignado",
    "Fecha/hora descarga",
  ];

  function needsQuote(s: string) {
    return s.includes(",") || s.includes("\n") || s.includes('"');
  }
  function esc(s: string) {
    return `"${s.replace(/"/g, '""')}"`;
  }

  const body = flatRows
    .map((row) => {
      const cols = [
        row.periodName,
        row.fileName,
        row.username,
        row.displayName,
        row.assignedNumber,
        row.downloadedAt,
      ];
      return cols
        .map((v) => {
          const vs = String(v ?? "");
          return needsQuote(vs) ? esc(vs) : vs;
        })
        .join(",");
    })
    .join("\n");

  const csv = headers.join(",") + "\n" + body;

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download =
    "dataflow_descargas_" +
    new Date().toISOString().slice(0, 10) +
    ".csv";
  document.body.appendChild(a);
  a.click();
  a.remove();

  publishEvent({
    type: "note_updated",
    title: "Reporte de descargas exportado",
    message: `Se exportaron ${flatRows.length} registros de descargas.`,
  });
}

function exportRespondedCSV() {
  // Parseo de rango (permite vacío)
  const hasFrom = exportFrom.trim() !== "";
  const hasTo   = exportTo.trim() !== "";
  const fromNum = hasFrom ? Number(exportFrom) : -Infinity;
  const toNum   = hasTo   ? Number(exportTo)   :  Infinity;

  if ((hasFrom && Number.isNaN(fromNum)) || (hasTo && Number.isNaN(toNum))) {
    alert("Ingresá números válidos en el rango.");
    return;
  }
  if (fromNum > toNum) {
    alert("El rango es inválido: 'Desde' no puede ser mayor que 'Hasta'.");
    return;
  }

  // Filtros nuevos: tipo de registro y tipo de respuesta de sueldos
  const kind = exportKind;           // "all" | "dudas" | "arreglos"
  const respKind = exportRespKind;   // "all" | "con_sueldos" | "sin_sueldos"

  // Filtros de fecha (YYYY-MM-DD)
  const hasDateFrom = exportDateFrom.trim() !== "";
  const hasDateTo   = exportDateTo.trim()   !== "";
  let dateFrom: Date | null = null;
  let dateTo: Date | null = null;

  if (hasDateFrom) {
    const d = new Date(exportDateFrom);
    if (Number.isNaN(d.getTime())) {
      alert("La fecha 'Desde' no es válida.");
      return;
    }
    d.setHours(0, 0, 0, 0);
    dateFrom = d;
  }

  if (hasDateTo) {
    const d = new Date(exportDateTo);
    if (Number.isNaN(d.getTime())) {
      alert("La fecha 'Hasta' no es válida.");
      return;
    }
    d.setHours(23, 59, 59, 999);
    dateTo = d;
  }

  // ENCABEZADOS (incluyendo CC entre Nota y Resp. Sueldos)
  const headers = [
    "Nro de funcionario",
    "Nombre",
    "Duda/Arreglo RRHH",
    "Respuesta",
    "Nota",
    "Centro de costo",
    "Respuesta de sueldos",
    "Archivo",
    "Respondido por",
    "Fecha",
    "Hora",
  ];

  // SOLO archivos de la liquidación seleccionada
  const inPeriod = files.filter(
    (f) => !selectedPeriodId || f.periodId === selectedPeriodId
  );

  const rowsOut: string[][] = [];

  for (const f of inPeriod) {
    const obs = f.observations || [];
    for (const th of obs) {
      const rs = th?.rows || [];
      for (const r of rs) {
        // ¿Es un hilo de ARREGLO (Información) o una DUDA clásica?
        const isArreglo = th?.tipo === "arreglo";

        // --- Filtro por TIPO DE REGISTRO ---
        if (kind === "dudas" && isArreglo) continue;
        if (kind === "arreglos" && !isArreglo) continue;

        // Para DUDAS clásicas → solo respondidas
        // Para ARREGLOS → incluir SIEMPRE, aunque Sueldos no haya respondido
        if (!isArreglo && !r?.answered) continue;

        // Filtro x rango de funcionario
        const nroStr = String(r?.nro ?? "").trim();
        if (!nroStr) continue;
        const nroNum = Number(nroStr);
        if (Number.isNaN(nroNum)) continue;
        if (nroNum < fromNum || nroNum > toNum) continue;

        // Fecha/hora:
        // - Preferimos r.answeredAt (cuando Sueldos respondió)
        // - Si no hay y es arreglo → usamos th.createdAt
        let when: Date | null = null;
        if (r?.answeredAt) {
          const d = new Date(r.answeredAt);
          if (!Number.isNaN(d.getTime())) when = d;
        } else if (isArreglo && th?.createdAt) {
          const d = new Date(th.createdAt);
          if (!Number.isNaN(d.getTime())) when = d;
        }

        const fecha = when ? when.toLocaleDateString() : "";
        const hora  = when ? when.toLocaleTimeString() : "";

        // --- Filtro por FECHA (si se cargó) ---
        if (dateFrom && (!when || when < dateFrom)) continue;
        if (dateTo   && (!when || when > dateTo))   continue;

        // ¿Tiene respuesta de Sueldos (texto en answerText)?
        const hasSueldosAnswer =
          !!(r?.answerText && String(r.answerText).trim() !== "");

        // --- Filtro por TIPO DE RESPUESTA DE SUELDOS ---
        if (respKind === "con_sueldos" && !hasSueldosAnswer) continue;
        if (respKind === "sin_sueldos" &&  hasSueldosAnswer) continue;

        // COLUMNA "Duda/Arreglo RRHH"
        const colDudaOArreglo = isArreglo
          ? "Es arreglo de RRHH"
          : String((r as any)?.duda ?? "");

        // Nota (solo arreglos)
        const colNota = isArreglo
          ? String((r as any)?.nota ?? "")
          : "";

        // Centro de costo (nuevo)
        const colCC = String((r as any)?.cc ?? "");

        // Columnas de respuesta
        let textoRespuesta = "";
        let textoRespuestaSueldos = "";

        if (isArreglo) {
          const accion = (r as any)?.accion || "";
          const codigo = (r as any)?.codigo || "";
          const codDesc = (r as any)?.codDesc || "";
          const dhc = (r as any)?.dhc || "";
          const actividad = (r as any)?.actividad || "";
          const modCampo = (r as any)?.modCampo || "";
          const modDe = ((r as any)?.modDe || "").trim();
          const modA  = ((r as any)?.modA || "").trim();

          // Acción base
          let fraseAccion = "";
          if (accion === "alta") fraseAccion = "Alta al código";
          else if (accion === "baja") fraseAccion = "Baja al código";
          else if (accion === "modificar") {
            let campoLegible = "código";
            if (modCampo === "dhc") campoLegible = "días/horas/cantidades";
            else if (modCampo === "actividad") campoLegible = "actividad";

            fraseAccion = `Modificar ${campoLegible}`;
            if (modDe || modA) {
              fraseAccion += ` de ${modDe || "?"} a ${modA || "?"}`;
            }
          }

          // Detalles adicionales
          let cuerpo = "";
          if (codigo) cuerpo += ` (${codigo})`;
          if (codDesc) cuerpo += ` ${codDesc}`;
          if (dhc) cuerpo += `${cuerpo ? ", " : ""}${dhc}`;
          if (actividad) cuerpo += `${cuerpo ? ", " : ""}Actividad ${actividad}`;

          let frase = (fraseAccion + " " + cuerpo).trim();
          if (!frase.endsWith(".")) frase += ".";

          textoRespuesta = frase;
          textoRespuestaSueldos = String(r?.answerText ?? "");
        } else {
          // DUDAS clásicas
          textoRespuesta = String(r?.answerText ?? "");
          textoRespuestaSueldos = "";
        }

        // Quién debe figurar como "Respondido por"
        const respondedBy = isArreglo
          ? String((th as any)?.byUsername || r?.answeredByUsername || "")
          : String(r?.answeredByUsername ?? "");

        rowsOut.push([
          nroStr,                       // "Nro de funcionario"
          String(r?.nombre ?? ""),      // "Nombre"
          colDudaOArreglo,              // "Duda/Arreglo RRHH"
          textoRespuesta,               // "Respuesta"
          colNota,                      // "Nota"
          colCC,                        // "Centro de costo"
          textoRespuestaSueldos,        // "Respuesta de sueldos"
          String(f?.name ?? ""),        // "Archivo"
          respondedBy,                  // "Respondido por"
          fecha,                        // "Fecha"
          hora,                         // "Hora"
        ]);
      }
    }
  }

  if (rowsOut.length === 0) {
    alert("No se encontraron dudas/arreglos que cumplan los filtros en la liquidación seleccionada.");
    return;
  }

  // CSV helpers
  const needsQuote = (s: any) => {
    const t = String(s);
    return t.includes(",") || t.includes("\n") || t.includes('"');
  };
  const esc = (s: any) => `"${String(s).replace(/"/g, '""')}"`;

  const csv =
    headers.join(",") + "\n" +
    rowsOut
      .map(row => row.map(v => needsQuote(v) ? esc(v) : String(v)).join(","))
      .join("\n");

  const utf8bom = "\uFEFF";
  const blob = new Blob([utf8bom + csv], {
    type: "text/csv;charset=utf-8"
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const periodName = periodNameById[selectedPeriodId] || "periodo";
  a.href = url;
  a.download = `reporte_dudas_respondidas_${periodName}_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();

  // Cierro modal
  setExportRespOpen(false);

  // Notificación
  publishEvent({
    type: "note_updated",
    title: "Reporte generado",
    message: `Se exportaron ${rowsOut.length} fila(s) de dudas/arreglos (${periodName}).`,
  });
}

function processRespondedBatch() {
  if (!(me?.role === "sueldos" || me?.role === "admin")) {
    alert("Solo Sueldos puede procesar en lote.");
    return;
  }

  const from = processFrom.trim() === "" ? null : parseInt(processFrom, 10);
  const to   = processTo.trim() === "" ? null : parseInt(processTo, 10);

  if (from !== null && Number.isNaN(from)) return alert("Desde Nº inválido.");
  if (to !== null && Number.isNaN(to)) return alert("Hasta Nº inválido.");
  if (from !== null && to !== null && from > to) return alert("Rango inválido: Desde > Hasta.");

  const dateFrom = processDateFrom ? new Date(processDateFrom + "T00:00:00") : null;
  const dateTo   = processDateTo ? new Date(processDateTo + "T23:59:59") : null;

  let totalMarked = 0;

  // Solo sobre el período seleccionado (igual que tu export)
  const targetFiles = files.filter((f: any) => f.periodId === selectedPeriodId);

  targetFiles.forEach((fileObj: any) => {
    updateFile(fileObj.id, (f: any) => {
      const nf = sclone(f);
      let changed = false;

      (nf.observations || [])
        .filter((th: any) => th.tipo !== "arreglo") // solo dudas clásicas
        .forEach((th: any) => {
          (th.rows || []).forEach((r: any) => {
            if (!r.answered) return;          // solo respondidas
            if (r.processed) return;          // no duplicar
            if (!r.answeredAt) return;

            // filtro por fecha (sobre answeredAt)
            const when = new Date(r.answeredAt);
            if (dateFrom && when < dateFrom) return;
            if (dateTo && when > dateTo) return;

            // filtro por funcionario
            const nroStr = (r.nro || "").toString().trim();

            if (nroStr === "") {
              if (!processIncludeFileDoubts) return; // duda de archivo queda afuera por defecto
            } else {
              const nro = parseInt(nroStr, 10);
              if (Number.isNaN(nro)) return;
              if (from !== null && nro < from) return;
              if (to !== null && nro > to) return;
            }

            // ✅ marcar procesada
            r.processed = true;
            r.processedAt = nowISO();
            r.processedByUsername = me?.username || "sueldos";
            r.processedByUserId = me?.id || "";

            changed = true;
            totalMarked += 1;
          });
        });

      if (!changed) return nf;

      return addHistoryEntry(
        nf,
        "Procesado en lote",
        `Se procesaron dudas respondidas (batch)`
      );
    });
  });

  pushToast({
    title: "Proceso en lote finalizado",
    message: `Marcadas como procesadas: ${totalMarked}`,
  });

  setProcessRespOpen(false);
}

  return {
    exportCSV, exportDownloadsCSV, exportRespondedCSV, processRespondedBatch,
  };
}
