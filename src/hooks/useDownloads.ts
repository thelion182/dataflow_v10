// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import { uuid } from "../lib/ids";
import { nowISO } from "../lib/time";
import { getUserById } from "../lib/auth";
import type { DownloadLogEntry } from "../types";
import { sclone } from '../features/shared/uiHelpers';
import { db } from '../services/db';

const USE_API = import.meta.env.VITE_USE_API === 'true';
const _rawApiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '');
const API_URL = _rawApiUrl.replace(/^(https?:\/\/)localhost(:\d+)?/, `$1${window.location.hostname}$2`);

export function useDownloads({ files, setFiles, me, meRole, myPerms, selectedPeriodId, addHistoryEntry, markDownloaded, updateFile, publishEvent, pushToast, selectedIds }: any) {

  const skipSave = useRef(true);

  // usedNumbersByPeriod: { [periodId]: Set<number> } — números ya usados por el usuario en cada período
  // Se carga desde el backend (download_logs) al login para mantener continuidad entre sesiones
  const [usedNumbersByPeriod, setUsedNumbersByPeriod] = useState<Record<string, Set<number>>>({});

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
    // Cargar números ya usados desde el backend (para sueldos, continuidad entre sesiones)
    if (USE_API && me?.role === 'sueldos') {
      fetch(`${API_URL}/downloads/my-numbers`, { credentials: 'include' })
        .then((r) => r.json())
        .then((nums: number[]) => {
          if (!Array.isArray(nums)) return;
          // Agrupar por período vía download_logs (sin periodId en my-numbers usamos todos juntos)
          // Para el Set global por usuario, lo guardamos bajo clave especial y luego complementamos con logs
          setUsedNumbersByPeriod((prev) => {
            const next = { ...prev };
            // Entramos todos como "global" para usarlos en getCurrentUsedForPeriod
            if (!next['__all__']) next['__all__'] = new Set<number>();
            const s = new Set(next['__all__']);
            nums.forEach((n) => s.add(n));
            next['__all__'] = s;
            return next;
          });
        })
        .catch(() => {});
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

    // Dividir exactamente por la mitad:
    // Ej: 600–799 (200 nums) => noTxt: 600–699, txt: 700–799
    // Ej: 200–399 (200 nums) => noTxt: 200–299, txt: 300–399
    const total = rangeEnd - rangeStart + 1;
    const half = Math.floor(total / 2);
    const txtStart = rangeStart + half;

    const nonTxtStart = rangeStart;
    const nonTxtEnd = txtStart - 1;
    const txtEnd = rangeEnd;

    return { nonTxtStart, nonTxtEnd, txtStart, txtEnd };
  }

  function buildUsedNumbersForUserInPeriod(userId: string, periodId: string): Set<number> {
    const used = new Set<number>();

    // 1. Intentar desde downloadNumbersByUser en los archivos (modo localStorage / sesión actual)
    for (const f of files) {
      const byUser = f.downloadNumbersByUser?.[userId];
      if (!byUser) continue;
      const n = byUser[periodId];
      if (typeof n === "number") used.add(n);
    }

    // 2. Complementar desde usedNumbersByPeriod (cargado desde el backend al login)
    const fromBackend = usedNumbersByPeriod['__all__'];
    if (fromBackend) fromBackend.forEach((n) => used.add(n));

    // 3. Complementar desde downloadLogs en memoria (funciona en ambos modos)
    for (const log of downloadLogs) {
      if (
        (log as any).usuarioId === userId &&
        (log as any).liquidacionId === periodId &&
        typeof (log as any).numeroAsignado === "number"
      ) {
        used.add((log as any).numeroAsignado);
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

  async function doDownload(id: string) {
    if (!myPerms.actions.download) return;
  
    // Buscar archivo
    const fOriginal = files.find((x) => x.id === id);
    if (!fOriginal) return;
  
    if (!USE_API && !fOriginal.blobUrl && !fOriginal.noNews) {
      alert("Este archivo no está en memoria (recarga previa). Subí uno nuevo para probar.");
      return;
    }
  
    if (!selectedPeriodId) {
      alert("No hay liquidación seleccionada.");
      return;
    }
  
    // Sueldos: bloquear re-descarga del mismo archivo en la misma liquidación
    // Se consultan tres fuentes para cubrir tanto modo localStorage como API:
    //   1. downloadNumbersByUser en el objeto del archivo (modo localStorage / sesión actual)
    //   2. downloadedFiles state (cargado async desde backend al login)
    //   3. downloadLogs en memoria (fuente más confiable en modo API)
    if (meRole === 'sueldos') {
      const mapByUser = fOriginal.downloadNumbersByUser || {};
      const enFiles = (mapByUser[me.id] || {})[selectedPeriodId] != null;
      const enState = (downloadedFiles[selectedPeriodId] || {})[fOriginal.id]?.usuarioId === me.id;
      const enLogs  = downloadLogs.some((l: any) =>
        l.usuarioId === me.id && l.archivoId === fOriginal.id && l.liquidacionId === selectedPeriodId
      );
      if (enFiles || enState || enLogs) {
        alert("Ya descargaste este archivo en esta liquidación. No podés volver a descargarlo.");
        return;
      }
    }
  
    // Caso general: nombre final del archivo que va a bajar el browser
    let finalDownloadName = fOriginal.name || "archivo.txt";
  
    // Si el usuario que descarga es de Sueldos → asignar numeración propia
    if (meRole === "sueldos") {
      let freshMe = getUserById(me.id);
      if (USE_API) {
        try {
          const res = await fetch(`${API_URL}/users/${me.id}`, { credentials: 'include' });
          if (res.ok) {
            const data = await res.json();
            // Aseguramos que range sean números
            freshMe = { ...freshMe, ...data, rangeStart: Number(data.rangeStart), rangeEnd: Number(data.rangeEnd) };
          }
        } catch {}
      }

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

      // Actualizamos contadores (usamos estado en lugar de call async)
      const periodMap = { ...(downloadCounters[selectedPeriodId] || {}) };
      const currentStored = periodMap[freshMe.id];
      if (typeof currentStored !== "number" || currentStored < nextNum) {
        periodMap[freshMe.id] = nextNum;
      }
      setDownloadCounters((prev) => ({ ...prev, [selectedPeriodId]: periodMap }));

      // También actualizamos usedNumbersByPeriod en memoria para esta sesión
      setUsedNumbersByPeriod((prev) => {
        const s = new Set(prev['__all__'] || []);
        s.add(nextNum);
        return { ...prev, '__all__': s };
      });

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

  
    // Archivos "Sin novedades" no tienen binario — solo se marcan, no se descargan
    if (fOriginal.noNews) return;

    // Disparar la descarga física en el browser con el nombre final calculado
    if (USE_API) {
      // En API mode: bajar como blob para poder renombrar (a.download se ignora en cross-origin)
      const res = await fetch(`${API_URL}/files/${fOriginal.id}/download`, { credentials: 'include' });
      if (!res.ok) return; // silencioso — puede no tener storage_path
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = finalDownloadName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } else {
      const a = document.createElement("a");
      a.href = fOriginal.blobUrl;
      a.download = finalDownloadName;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
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

  // Helper para leer blob desde URL (soporta cross-origin con credentials)
  async function blobFromObjectURL(url: string) {
    const res = await fetch(url, { credentials: 'include' });
    return await res.blob();
  }

  // Para Sueldos: ¿este usuario ya descargó este archivo en esta liquidación?
  function yaDescargadoEnEstaLiquidacion(f: any): boolean {
    if (meRole !== 'sueldos') return false;
    const mapByUser = f.downloadNumbersByUser || {};
    if ((mapByUser[me.id] || {})[selectedPeriodId] != null) return true;
    if ((downloadedFiles[selectedPeriodId] || {})[f.id]?.usuarioId === me.id) return true;
    return downloadLogs.some((l: any) =>
      l.usuarioId === me.id && l.archivoId === f.id && l.liquidacionId === selectedPeriodId
    );
  }

  // Filtramos archivos válidos (existen, tienen blob o API, y no están ya descargados)
  const filesToProcess: any[] = [];
  let yaDescargados = 0;

  for (const id of ids) {
    const f = files.find((x) => x.id === id);
    if (!f) continue;
    if (!USE_API && !f.blobUrl) {
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
    if (USE_API) {
      try {
        const res = await fetch(`${API_URL}/users/${me.id}`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          freshMe = { ...freshMe, ...data, rangeStart: Number(data.rangeStart), rangeEnd: Number(data.rangeEnd) };
        }
      } catch {}
    }
    subRanges = getUserSubRangesForDownloads(freshMe);
    if (!subRanges) {
      alert("No tenés rango asignado o el rango es inválido. Consultá al administrador.");
      return;
    }

    const { nonTxtStart, nonTxtEnd, txtStart, txtEnd } = subRanges;

    // Usamos el estado de contadores (ya cargado async al login)
    dc = { ...downloadCounters };
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

  // Mapa: fileId → { fClone, finalName, numeroAsignado, ts }
  // Guardamos todo SIN tocar estado — el estado se actualiza atómicamente después del loop
  const fileUpdates = new Map();

  // --- Recorremos archivos: calcular números, nombres y recolectar blobs ---
  for (const f of filesToProcess) {
    const originalName = f.name || "archivo";
    let finalName = originalName;
    let numeroAsignado: number | null = null;
    let fClone: any = null;

    if (isSueldos && usedNumbers && subRanges && freshMe) {
      const { nonTxtStart, nonTxtEnd, txtStart, txtEnd } = subRanges;
      const lower = originalName.toLowerCase();
      const isTxt = lower.endsWith(".txt");

      // Elegimos el rango según sea TXT o no
      if (isTxt) {
        numeroAsignado = findNextFreeNumberInRange(usedNumbers, txtStart, txtEnd);
        if (numeroAsignado == null) {
          alert(
            `Ya usaste todos tus números para archivos TXT en esta liquidación (${txtStart} a ${txtEnd}).`
          );
          return;
        }
      } else {
        numeroAsignado = findNextFreeNumberInRange(usedNumbers, nonTxtStart, nonTxtEnd);
        if (numeroAsignado == null) {
          alert(
            `Ya usaste todos tus números para archivos no TXT en esta liquidación (${nonTxtStart} a ${nonTxtEnd}).`
          );
          return;
        }
      }

      usedNumbers.add(numeroAsignado);

      const currentStored = dc[selectedPeriodId][freshMe.id];
      if (typeof currentStored !== "number" || currentStored < numeroAsignado) {
        dc[selectedPeriodId][freshMe.id] = numeroAsignado;
      }

      const lastDot = originalName.lastIndexOf(".");
      let baseName = originalName;
      let ext = "";
      if (lastDot !== -1) {
        baseName = originalName.slice(0, lastDot);
        ext = originalName.slice(lastDot);
      }
      finalName = `${numeroAsignado} ${baseName}${ext}`;

      fClone = sclone(f);
      if (!fClone.downloadNumbersByUser) fClone.downloadNumbersByUser = {};
      if (!fClone.downloadNumbersByUser[freshMe.id]) fClone.downloadNumbersByUser[freshMe.id] = {};
      fClone.downloadNumbersByUser[freshMe.id][selectedPeriodId] = numeroAsignado;
      fClone.downloadedAt = nowISO();

      fileUpdates.set(f.id, { fClone, finalName, numeroAsignado, ts: nowISO() });
      zipRecords.push({ fileObj: fClone, numeroAsignado, ts: nowISO() });
    }

    // Archivos "Sin novedades" no tienen binario
    if (f.noNews) { added++; continue; }

    // Fetch del blob — NOTA: esto puede disparar SSE file:downloaded que hace refreshFiles.
    // Por eso NO tocamos el estado ANTES de este await — lo hacemos todo DESPUÉS del loop.
    const fileUrl = USE_API
      ? `${API_URL}/files/${f.id}/download`
      : f.blobUrl;
    try {
      const blob = await blobFromObjectURL(fileUrl);
      zip.file(finalName, blob);
    } catch { /* si falla el binario, salteamos */ }
    added++;
  }

  // Dar tiempo a que los SSE file:downloaded (disparados por los fetchs de arriba) se resuelvan
  // antes de aplicar nuestras actualizaciones de estado.
  await new Promise(r => setTimeout(r, 200));

  // Actualización atómica de estado: UN SOLO setFiles para todos los archivos a la vez.
  // Al usar updater funcional, opera sobre el estado MÁS RECIENTE (post-SSE-refresh).
  if (fileUpdates.size > 0) {
    setFiles((prev: any[]) => prev.map((f: any) => {
      const upd = fileUpdates.get(f.id);
      if (!upd) return f;
      return addHistoryEntry(
        {
          ...f,                                        // base = estado actual (post-SSE)
          status: "descargado",
          downloadedAt: upd.fClone.downloadedAt,
          downloadNumbersByUser: upd.fClone.downloadNumbersByUser,
        },
        `Descargado por ${me?.username} con nro ${upd.numeroAsignado}`
      );
    }));
  }

  // Para roles sin numeración (no sueldos): markDownloaded standard
  if (!isSueldos && myPerms.actions.markDownloaded) {
    for (const f of filesToProcess) {
      markDownloaded(f.id);
    }
  }

  // Registrar descargas en batch — un solo setDownloadedFiles + setDownloadLogs sin publishEvent
  // Esto evita refreshFiles por archivo que sobreescribía el estado a mitad del loop
  if (isSueldos && zipRecords.length > 0) {
    setDownloadedFiles((prev: any) => {
      const next = { ...prev };
      for (const { fileObj, numeroAsignado, ts } of zipRecords) {
        const pId = fileObj.periodId;
        if (!next[pId]) next[pId] = {};
        next[pId] = { ...next[pId], [fileObj.id]: { usuarioId: me?.id, numeroAsignado, timestamp: ts } };
      }
      return next;
    });
    setDownloadLogs((prev: any) => [
      ...zipRecords.map(({ fileObj, numeroAsignado, ts }) => ({
        usuarioId: me?.id,
        usuarioNombre: me?.username,
        liquidacionId: fileObj.periodId,
        numeroAsignado,
        archivoId: fileObj.id,
        archivoNombreOriginal: fileObj.name,
        timestamp: ts,
      })).reverse(),
      ...prev,
    ]);
  }

  // Persistimos contadores de Sueldos: actualizar estado (el useEffect guarda en backend)
  if (isSueldos && dc) {
    setDownloadCounters(dc);
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
