// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import { uuid } from "../lib/ids";
import { nowISO } from "../lib/time";
import { getUserById } from "../lib/auth";
import type { DownloadLogEntry } from "../types";
import { sclone } from '../features/shared/uiHelpers';
import { db } from '../services/db';

export function useDownloads({ files, setFiles, me, meRole, myPerms, selectedPeriodId, addHistoryEntry, markDownloaded, updateFile, publishEvent, pushToast, selectedIds }: any) {

  const skipSave = useRef(true);

  const [downloadCounters, setDownloadCounters] = useState(() => {
    const r = db.downloads.getCounters();
    if (r && typeof r === 'object' && typeof (r as any).then !== 'function') { skipSave.current = false; return r; }
    return {};
  });
  const [downloadedFiles,  setDownloadedFiles]  = useState(() => {
    const r = db.downloads.getDownloadedFiles();
    if (r && typeof r === 'object' && typeof (r as any).then !== 'function') return r;
    return {};
  });
  const [downloadLogs,     setDownloadLogs]     = useState<DownloadLogEntry[]>(() => {
    const r = db.downloads.getLogs();
    if (Array.isArray(r)) return r;
    return [];
  });

  // Carga async para modo API (cuando el usuario se loguea)
  useEffect(() => {
    if (!me?.id) return;
    const rc = db.downloads.getCounters();
    if (rc && typeof (rc as any).then === 'function') {
      (rc as any).then((v: any) => { if (v && typeof v === 'object') { skipSave.current = false; setDownloadCounters(v); } }).catch(() => {});
    }
    const rd = db.downloads.getDownloadedFiles();
    if (rd && typeof (rd as any).then === 'function') {
      (rd as any).then((v: any) => { if (v && typeof v === 'object') setDownloadedFiles(v); }).catch(() => {});
    }
    const rl = db.downloads.getLogs();
    if (rl && typeof (rl as any).then === 'function') {
      (rl as any).then((v: any) => { if (Array.isArray(v)) setDownloadLogs(v); }).catch(() => {});
    }
  }, [me?.id]);

  useEffect(() => { if (!skipSave.current) db.downloads.saveCounters(downloadCounters); }, [downloadCounters]);
  useEffect(() => { if (!skipSave.current) db.downloads.saveDownloadedFiles(downloadedFiles); }, [downloadedFiles]);
  useEffect(() => { if (!skipSave.current) db.downloads.saveLogs(downloadLogs); }, [downloadLogs]);

  function archivoYaDescargadoEnPeriodo(fileId: string, periodId: string) {
    const byPeriod = downloadedFiles[periodId] || {};
    return !!byPeriod[fileId];
  }

  function getNextNumberForUserInPeriod(user: any, periodId: string): number | null {
    // Solo aplica a rol "sueldos"
    if (user?.role !== "sueldos") return null;
    if (user?.rangeStart == null || user?.rangeEnd == null) return null;

    const countersForPeriod = downloadCounters[periodId] || {};
    const lastUsed = countersForPeriod[user.id]; // p.ej 5 (ya usó 1..5)

    // Primer uso en este periodo -> arranca en rangeStart
    const candidate = (lastUsed == null)
      ? user.rangeStart
      : lastUsed + 1;

    // Validar que no se pase de su rango fijo
    if (candidate > user.rangeEnd) return null;

    return candidate;
  }

  function consumeNumberForUserInPeriod(user: any, periodId: string, usedNumber: number) {
    setDownloadCounters(prev => {
      const next = { ...prev };
      if (!next[periodId]) next[periodId] = {};
      next[periodId] = { ...next[periodId], [user.id]: usedNumber };
      return next;
    });
  }

  function getUserSubRangesForDownloads(user: any) {
    const rangeStart = user?.rangeStart;
    const rangeEnd = user?.rangeEnd;
    if (
      typeof rangeStart !== "number" ||
      typeof rangeEnd !== "number" ||
      rangeStart > rangeEnd
    ) {
      return null;
    }

    // Reservamos los últimos ~100 números del rango para archivos .txt
    // Ej: 601–800  => noTxt: 601–699, txt: 700–800
    let txtStart = rangeEnd - 100;
    if (txtStart <= rangeStart) {
      txtStart = rangeStart + 1;
    }

    const nonTxtStart = rangeStart;
    const nonTxtEnd = txtStart - 1;
    const txtEnd = rangeEnd;

    return { nonTxtStart, nonTxtEnd, txtStart, txtEnd };
  }

  function buildUsedNumbersForUserInPeriod(userId: string, periodId: string) {
    const used = new Set<number>();
    for (const f of files) {
      const byUser = f.downloadNumbersByUser?.[userId];
      if (!byUser) continue;
      const n = byUser[periodId];
      if (typeof n === "number") {
        used.add(n);
      }
    }
    return used;
  }

  function findNextFreeNumberInRange(
    used: Set<number>,
    start: number,
    end: number
  ): number | null {
    for (let n = start; n <= end; n++) {
      if (!used.has(n)) return n;
    }
    return null;
  }

  function registrarDescarga({
    fileObj,
    numeroAsignado,
  }: {
    fileObj: any;
    numeroAsignado: number;
  }) {
    const periodId = fileObj.periodId;
    const ts = nowISO();

    setDownloadedFiles((prev: any) => {
      const next = { ...prev };
      if (!next[periodId]) next[periodId] = {};
      next[periodId] = {
        ...next[periodId],
        [fileObj.id]: {
          usuarioId: me?.id,
          numeroAsignado,
          timestamp: ts,
        },
      };
      return next;
    });

    setDownloadLogs((prev: any) => ([
      {
        usuarioId: me?.id,
        usuarioNombre: me?.username,
        liquidacionId: periodId,
        numeroAsignado,
        archivoId: fileObj.id,
        archivoNombreOriginal: fileObj.name,
        timestamp: ts,
      },
      ...prev,
    ]));

    updateFile(fileObj.id, (f: any) =>
      addHistoryEntry(
        { ...f, status: "descargado", downloadedAt: ts },
        `Descargado por ${me?.username} con nro ${numeroAsignado}`
      )
    );

    publishEvent({
      type: "download_marked",
      title: "Descarga registrada",
      message: `${me?.username || "sistema"} descargó ${fileObj.name} con número ${numeroAsignado}`,
      fileId: fileObj.id,
      periodId: periodId,
    });
  }

  function doDownload(id: string) {
    if (!myPerms.actions.download) return;
  
    // Buscar archivo
    const fOriginal = files.find((x) => x.id === id);
    if (!fOriginal) return;
  
    if (!fOriginal.blobUrl) {
      alert("Este archivo no está en memoria (recarga previa). Subí uno nuevo para probar.");
      return;
    }
  
    if (!selectedPeriodId) {
      alert("No hay liquidación seleccionada.");
      return;
    }
  
    // Reglas de negocio tuyas: "una vez descargado por liquidación el mismo archivo no se puede descargar"
    // Implementamos esa restricción así:
    // Consideramos "ya descargado" si ESTE archivo tiene alguna marca de descarga para ESTA liquidación.
    // Miramos en fOriginal.downloadNumbersByUser[*][selectedPeriodId].
    const yaDescargadoEnEstaLiquidacion = (() => {
      const mapByUser = fOriginal.downloadNumbersByUser || {};
      // si CUALQUIER usuario tiene número asignado para este período, lo consideramos descargado
      return Object.values(mapByUser).some((perObj: any) => {
        if (!perObj) return false;
        return perObj[selectedPeriodId] != null;
      });
    })();
  
    if (yaDescargadoEnEstaLiquidacion) {
      alert("Este archivo ya fue descargado en esta liquidación. No se puede volver a descargar.");
      return;
    }
  
    // Caso general: nombre final del archivo que va a bajar el browser
    let finalDownloadName = fOriginal.name || "archivo.txt";
  
    // Si el usuario que descarga es de Sueldos → asignar numeración propia
    if (meRole === "sueldos") {
      const freshMe = getUserById(me.id);

      const subRanges = getUserSubRangesForDownloads(freshMe);
      if (!subRanges) {
        alert("No tenés rango asignado o el rango es inválido. Consultá al administrador.");
        return;
      }
      const { nonTxtStart, nonTxtEnd, txtStart, txtEnd } = subRanges;

      // Números ya usados por este usuario en esta liquidación
      const used = buildUsedNumbersForUserInPeriod(freshMe.id, selectedPeriodId);

      const originalName = fOriginal.name || "archivo";
      const lowerName = originalName.toLowerCase();
      const isTxt = lowerName.endsWith(".txt");

      let nextNum: number | null = null;
      if (isTxt) {
        // Reservado para TXT (parte alta del rango)
        nextNum = findNextFreeNumberInRange(used, txtStart, txtEnd);
        if (nextNum == null) {
          alert(
            `Ya usaste todos tus números para archivos TXT en esta liquidación ` +
            `(${txtStart} a ${txtEnd}).`
          );
          return;
        }
      } else {
        // No TXT (CSV, ODS, XLSX, etc.) → parte baja del rango
        nextNum = findNextFreeNumberInRange(used, nonTxtStart, nonTxtEnd);
        if (nextNum == null) {
          alert(
            `Ya usaste todos tus números para archivos no TXT en esta liquidación ` +
            `(${nonTxtStart} a ${nonTxtEnd}).`
          );
          return;
        }
      }

      // Actualizamos estructura de contadores para que el admin siga viendo el "último usado"
      let dc: any = {};
      dc = db.downloads.getCounters();
      if (!dc[selectedPeriodId]) dc[selectedPeriodId] = {};

      const currentStored = dc[selectedPeriodId][freshMe.id];
      if (typeof currentStored !== "number" || currentStored < nextNum) {
        dc[selectedPeriodId][freshMe.id] = nextNum;
      }
      db.downloads.saveCounters(dc);

      // Formato final: "<numero> <NombreOriginal>.ext"
      const lastDot = originalName.lastIndexOf(".");
      let baseName = originalName;
      let ext = "";
      if (lastDot !== -1) {
        baseName = originalName.slice(0, lastDot);
        ext = originalName.slice(lastDot); // incluye el "."
      }
      finalDownloadName = `${nextNum} ${baseName}${ext}`;

      // Marca de auditoría en el archivo
      const fClone = sclone(fOriginal);
      if (!fClone.downloadNumbersByUser) {
        fClone.downloadNumbersByUser = {};
      }
      if (!fClone.downloadNumbersByUser[freshMe.id]) {
        fClone.downloadNumbersByUser[freshMe.id] = {};
      }
      fClone.downloadNumbersByUser[freshMe.id][selectedPeriodId] = nextNum;
      fClone.downloadedAt = nowISO();

      updateFile(fOriginal.id, () => fClone);

      if (myPerms.actions.markDownloaded) {
        markDownloaded(id);
      }
    } else {
      // Rol que NO es sueldos:
      if (myPerms.actions.markDownloaded) {
        markDownloaded(id);
      }
    }

  
    // Disparar la descarga física en el browser con el nombre final calculado
    const a = document.createElement("a");
    a.href = fOriginal.blobUrl;
    a.download = finalDownloadName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

async function downloadSelectedAsZip() {
  if (!myPerms.actions.download) {
    alert("No tenés permiso para descargar.");
    return;
  }

  const ids = Array.from(selectedIds);
  if (ids.length === 0) {
    alert("No hay archivos seleccionados.");
    return;
  }

  if (!selectedPeriodId) {
    alert("Primero seleccioná una liquidación.");
    return;
  }

  const JSZip = (await import("https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm")).default;
  const zip = new JSZip();

  // Helper para leer blob desde ObjectURL
  async function blobFromObjectURL(url: string) {
    const res = await fetch(url);
    return await res.blob();
  }

  // Mismo criterio que en doDownload:
  // ¿Este archivo ya fue descargado en esta liquidación?
  function yaDescargadoEnEstaLiquidacion(f: any): boolean {
    const mapByUser = f.downloadNumbersByUser || {};
    return Object.values(mapByUser).some((perObj: any) => {
      if (!perObj) return false;
      return perObj[selectedPeriodId] != null;
    });
  }

  // Filtramos archivos válidos (existen, tienen blob, y no están ya descargados)
  const filesToProcess: any[] = [];
  let yaDescargados = 0;

  for (const id of ids) {
    const f = files.find((x) => x.id === id);
    if (!f) continue;
    if (!f.blobUrl) {
      console.warn("Sin blobUrl, no puedo incluir en ZIP:", f.name);
      continue;
    }
    if (yaDescargadoEnEstaLiquidacion(f)) {
      yaDescargados++;
      continue;
    }
    filesToProcess.push(f);
  }

  if (filesToProcess.length === 0) {
    alert(
      yaDescargados > 0
        ? "Todos los archivos seleccionados ya fueron descargados en esta liquidación."
        : "No se pudo agregar ningún archivo al ZIP."
    );
    return;
  }

  const isSueldos = meRole === "sueldos";

  // Si es Sueldos, preparamos numeración (separando TXT y no TXT)
  let dc: any = {};
  let freshMe: any = null;
  let subRanges: any = null;
  let usedNumbers: Set<number> | null = null;

  if (isSueldos) {
    freshMe = getUserById(me.id);
    subRanges = getUserSubRangesForDownloads(freshMe);
    if (!subRanges) {
      alert("No tenés rango asignado o el rango es inválido. Consultá al administrador.");
      return;
    }

    const { nonTxtStart, nonTxtEnd, txtStart, txtEnd } = subRanges;

    // Leemos contadores via db
    dc = db.downloads.getCounters();
    if (!dc[selectedPeriodId]) dc[selectedPeriodId] = {};

    // Números ya usados por este usuario en esta liquidación
    const initialUsed = buildUsedNumbersForUserInPeriod(freshMe.id, selectedPeriodId);
    usedNumbers = new Set(initialUsed);

    // --- PRE-CHEQUEO: ¿alcanza el rango para lo que estoy seleccionando? ---
    let neededTxt = 0;
    let neededNonTxt = 0;

    for (const f of filesToProcess) {
      const originalName = f.name || "";
      const lower = originalName.toLowerCase();
      const isTxt = lower.endsWith(".txt");
      if (isTxt) neededTxt++;
      else neededNonTxt++;
    }

    function countAvailable(used: Set<number>, start: number, end: number) {
      let c = 0;
      for (let n = start; n <= end; n++) {
        if (!used.has(n)) c++;
      }
      return c;
    }

    const availTxt = countAvailable(initialUsed, txtStart, txtEnd);
    const availNonTxt = countAvailable(initialUsed, nonTxtStart, nonTxtEnd);

    if (neededTxt > availTxt) {
      alert(
        `No tenés suficientes números libres para archivos TXT en esta liquidación.\n` +
        `Necesitás ${neededTxt} y sólo hay ${availTxt} libres en el rango ${txtStart}–${txtEnd}.`
      );
      return;
    }

    if (neededNonTxt > availNonTxt) {
      alert(
        `No tenés suficientes números libres para archivos NO TXT en esta liquidación.\n` +
        `Necesitás ${neededNonTxt} y sólo hay ${availNonTxt} libres en el rango ${nonTxtStart}–${nonTxtEnd}.`
      );
      return;
    }
  }

  let added = 0;

  // --- Recorremos archivos y los vamos metiendo al ZIP ---
  for (const f of filesToProcess) {
    const originalName = f.name || "archivo";
    let finalName = originalName;
    let numeroAsignado: number | null = null;

    if (isSueldos && usedNumbers && subRanges && freshMe) {
      const { nonTxtStart, nonTxtEnd, txtStart, txtEnd } = subRanges;
      const lower = originalName.toLowerCase();
      const isTxt = lower.endsWith(".txt");

      // Elegimos el rango según sea TXT o no
      if (isTxt) {
        numeroAsignado = findNextFreeNumberInRange(usedNumbers, txtStart, txtEnd);
        if (numeroAsignado == null) {
          alert(
            `Ya usaste todos tus números para archivos TXT en esta liquidación ` +
            `(${txtStart} a ${txtEnd}).`
          );
          return;
        }
      } else {
        numeroAsignado = findNextFreeNumberInRange(usedNumbers, nonTxtStart, nonTxtEnd);
        if (numeroAsignado == null) {
          alert(
            `Ya usaste todos tus números para archivos no TXT en esta liquidación ` +
            `(${nonTxtStart} a ${nonTxtEnd}).`
          );
          return;
        }
      }

      // Marcamos el número como usado
      usedNumbers.add(numeroAsignado);

      // Actualizamos estructura de contadores para que el admin vea el "último usado"
      const currentStored = dc[selectedPeriodId][freshMe.id];
      if (typeof currentStored !== "number" || currentStored < numeroAsignado) {
        dc[selectedPeriodId][freshMe.id] = numeroAsignado;
      }

      // Formato final: "<numero> <NombreOriginal>.ext"
      const lastDot = originalName.lastIndexOf(".");
      let baseName = originalName;
      let ext = "";
      if (lastDot !== -1) {
        baseName = originalName.slice(0, lastDot);
        ext = originalName.slice(lastDot); // incluye el "."
      }
      finalName = `${numeroAsignado} ${baseName}${ext}`;

      // Marca de auditoría en el archivo
      const fClone = sclone(f);
      if (!fClone.downloadNumbersByUser) {
        fClone.downloadNumbersByUser = {};
      }
      if (!fClone.downloadNumbersByUser[freshMe.id]) {
        fClone.downloadNumbersByUser[freshMe.id] = {};
      }
      fClone.downloadNumbersByUser[freshMe.id][selectedPeriodId] = numeroAsignado;
      fClone.downloadedAt = nowISO();

      updateFile(f.id, () => fClone);

      if (myPerms.actions.markDownloaded) {
        markDownloaded(f.id);
      }

      // También registramos la descarga en las estructuras auxiliares
      registrarDescarga({
        fileObj: fClone,
        numeroAsignado,
      });
    } else {
      // Rol que NO es sueldos:
      // nombre original y sólo marcamos descargado si corresponde
      if (myPerms.actions.markDownloaded) {
        markDownloaded(f.id);
      }
    }

    // Añadimos el archivo (con el nombre ya decidido) al ZIP
    const blob = await blobFromObjectURL(f.blobUrl);
    zip.file(finalName, blob);
    added++;
  }

  // Persistimos contadores de Sueldos (si aplica)
  if (isSueldos) {
    db.downloads.saveCounters(dc);
  }

  if (added === 0) {
    alert("No se pudo agregar ningún archivo al ZIP.");
    return;
  }

  // Generamos y disparamos la descarga del ZIP
  const content = await zip.generateAsync({ type: "blob" });
  const zipBlobUrl = URL.createObjectURL(content);

  const a = document.createElement("a");
  a.href = zipBlobUrl;
  a.download = `dataflow_archivos_${selectedPeriodId}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(zipBlobUrl);

  publishEvent({
    type: "download_marked",
    title: "ZIP descargado",
    message: `${me?.username || "sistema"} descargó ${added} archivo(s) en ZIP.`,
    periodId: selectedPeriodId,
  });
}

  return {
    downloadCounters, setDownloadCounters,
    downloadedFiles, setDownloadedFiles,
    downloadLogs, setDownloadLogs,
    archivoYaDescargadoEnPeriodo,
    getNextNumberForUserInPeriod,
    consumeNumberForUserInPeriod,
    getUserSubRangesForDownloads,
    buildUsedNumbersForUserInPeriod,
    findNextFreeNumberInRange,
    registrarDescarga,
    doDownload,
    downloadSelectedAsZip,
  };
}
