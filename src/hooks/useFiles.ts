// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import { uuid } from "../lib/ids";
import { nowISO, formatDate } from "../lib/time";
import { prettyBytes } from "../lib/bytes";
import { STATUS } from "../types";
import { ROLE_DEFAULT_PERMISSIONS } from "../lib/perms";
import { sclone } from '../features/shared/uiHelpers';
import { db } from '../services/db';
import {
  pendingCount, answeredCount,
  answeredFuncionarioDoubtsCount, answeredArchivoDoubtsCount,
} from '../features/observations/observationHelpers';

const USE_API = import.meta.env.VITE_USE_API === 'true';
const _rawApiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '');
const API_URL = _rawApiUrl.replace(/^(https?:\/\/)localhost(:\d+)?/, `$1${window.location.hostname}$2`);

/**
 * Sube el binario al backend y devuelve el objeto de archivo guardado.
 * Se usa en modo API para archivo nuevo y para reemplazo de versión.
 */
async function uploadBinaryToBackend(
  file: File,
  opts: { fileId?: string; periodId?: string; sector?: string; siteCode?: string; subcategory?: string; combinationId?: string; noNews?: boolean }
): Promise<any | null> {
  try {
    const form = new FormData();
    form.append('file', file);
    if (opts.fileId)       form.append('fileId',       opts.fileId);
    if (opts.periodId)     form.append('periodId',     opts.periodId);
    if (opts.sector)       form.append('sector',       opts.sector);
    if (opts.siteCode)     form.append('siteCode',     opts.siteCode);
    if (opts.subcategory)  form.append('subcategory',  opts.subcategory);
    if (opts.combinationId) form.append('combinationId', opts.combinationId);
    if (opts.noNews)       form.append('noNews',       String(!!opts.noNews));
    const res = await fetch(`${API_URL}/files/upload`, {
      method: 'POST',
      credentials: 'include',
      body: form,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export function useFiles({ me, periods, selectedPeriodId, periodNameById, sectors, sites, combinations, publishEvent, pushToast, myPerms, setLastPicked, onOpenObserve, detectCombinationForFile }: any) {
  // skipSave: true en API mode (async) hasta que cargue datos; false inmediato en localStorage (sync)
  const skipSave = useRef(true);
  const [files, setFiles] = useState<any[]>(() => {
    const result = db.files.getAll();
    if (Array.isArray(result)) { skipSave.current = false; return result.map(f => ({ ...f, size: Number(f.size) || 0, byUserId: f.byUserId || f.uploaderId || '', byUsername: f.byUsername || f.uploaderName || '' })); }
    return [];
  });

  // Carga async para modo API (cuando el usuario se loguea)
  useEffect(() => {
    if (!me?.id) return;
    const result = db.files.getAll();
    if (result && typeof (result as any).then === 'function') {
      (result as any)
        .then((f: any) => { if (Array.isArray(f)) { skipSave.current = false; setFiles(f.map((x: any) => ({ ...x, size: Number(x.size) || 0, byUserId: x.byUserId || x.uploaderId || '', byUsername: x.byUsername || x.uploaderName || '' }))); } })
        .catch(() => {});
    }
  }, [me?.id]);

  // Persist files via db (strip blobUrl — Blob objects no son serializables)
  useEffect(() => {
    if (skipSave.current) return;
    db.files.saveAll(files);
  }, [files]);

  // Recarga automática cuando llega un evento SSE 'file:uploaded' o 'file:status'
  useEffect(() => {
    const reload = () => {
      const result = db.files.getAll();
      if (result && typeof (result as any).then === 'function') {
        (result as any).then((f: any) => {
          if (Array.isArray(f)) setFiles(f.map((x: any) => ({ ...x, size: Number(x.size) || 0, byUserId: x.byUserId || x.uploaderId || '', byUsername: x.byUsername || x.uploaderName || '' })));
        }).catch(() => {});
      } else if (Array.isArray(result) && result.length > 0) {
        setFiles(result.map((f: any) => ({ ...f, size: Number(f.size) || 0, byUserId: f.byUserId || f.uploaderId || '', byUsername: f.byUsername || f.uploaderName || '' })));
      }
    };
    window.addEventListener('dataflow:files:refresh', reload);
    return () => window.removeEventListener('dataflow:files:refresh', reload);
  }, []);

  function updateFile(id: string, updater: (f: any) => any) {
    setFiles((prev: any[]) => prev.map((f: any) => (f.id === id ? updater(JSON.parse(JSON.stringify(f))) : f)));
  }

  function effectiveStatus(f: any) {
    // statusOverride siempre tiene prioridad (admin puede fijar un estado)
    if (f?.statusOverride) return f.statusOverride;

    // Auto-derivar desde observaciones (dudas + arreglos)
    const obs = (f?.observations || []).filter((t: any) => !t?.deleted);
    if (obs.length > 0) {
      const allRows = obs.flatMap((t: any) => t.rows || []);
      if (allRows.length > 0) {
        const pending  = allRows.filter((r: any) => !r.answered).length;
        const unproc   = allRows.filter((r: any) => r.answered && !r.processed).length;
        if (pending > 0)  return "con_dudas";    // al menos una sin responder → con dudas
        if (unproc > 0)   return "pend_procesar"; // todas respondidas pero sin procesar
        return "procesado";                       // todo respondido Y procesado
      }
    }

    return f?.status || "cargado";
  }

  function addHistoryEntry(file, action, details = "") {
    const entry = { t: nowISO(), action, byUserId: me?.id || "", byUsername: me?.username || "sistema", details };
    return { ...file, history: [entry, ...(file.history || [])] };
  }

  function displayStatusForRole(statusKey, file) {
    const role = me?.role;
    const pend = pendingCount(file);
    const resp = answeredCount(file);
    const baseLabel = STATUS.find((s) => s.key === statusKey)?.label || statusKey;

    // --- Auto-estados de observaciones (prioridad máxima) ---
    if (statusKey === "con_dudas") {
      return `Con dudas (${pend} pend${resp > 0 ? ` / ${resp} resp` : ''})`;
    }
    if (statusKey === "pend_procesar") {
      return `Pend. de procesar (${resp} resp)`;
    }
    if (statusKey === "procesado") {
      return "Procesado ✓";
    }

    // --- Vista especial para Sueldos cuando está cargado ---
    if (role === "sueldos" && statusKey === "cargado") {
      return "Pendiente de descarga";
    }

    // --- Vista especial para RRHH cuando el estado real es "cargado" ---
    if (role === "rrhh" && statusKey === "cargado") {
      return "Enviado";
    }

    // --- Resto de casos: usar etiqueta base ---
    return baseLabel;
  }



  function setStatus(id, statusLike) {
    const status = typeof statusLike === "string" ? statusLike : statusLike?.key;
    if (!status) return;

    updateFile(id, (f) =>
      addHistoryEntry(
        { ...f, status },
        `Estado: ${STATUS.find((s) => s.key === status)?.label || status}`
      )
    );
  }

  function markDownloaded(id) {
    updateFile(id, (f) =>
      addHistoryEntry(
        { ...f, status: "descargado", downloadedAt: nowISO() },
        "Descargado"
      )
    );
    publishEvent({
      type: "download_marked",
      title: "Marcado como descargado",
      message: `${me?.username || "sistema"} marcó ${id} como descargado`,
      fileId: id,
      // si querés, podés sumar periodId también:
      // periodId: f.periodId,
    });
  }

  function bumpVersion(id) {
    if (!myPerms.actions.bumpVersion) return;
    const before = files.find((x) => x.id === id);
    updateFile(id, (f) =>
      addHistoryEntry(
        { ...f, version: (f.version || 1) + 1, status: "actualizado" },
        "Nueva versión"
      )
    );
    publishEvent({
      type: "version_bumped",
      title: "Nueva versión",
      message: `${me?.username || "sistema"} subió nueva versión de ${before?.name || "archivo"}`,
      fileId: id,
      periodId: before?.periodId,
    });
  }

  function setNote(id, notes) {
    updateFile(id, (f) =>
      addHistoryEntry(
        { ...f, notes },
        "Nota actualizada"
      )
    );
    const fx = files.find((x) => x.id === id);
    publishEvent({
      type: "note_updated",
      title: "Nota actualizada",
      message: `${me?.username || "sistema"} editó notas de ${fx?.name || "archivo"}`,
      fileId: id,
      periodId: fx?.periodId,
    });
  }

  function guessTypeFromName(name) {
    const n = (name || "").toLowerCase();
    if (n.endsWith(".csv")) return "text/csv";
    if (n.endsWith(".txt")) return "text/plain";
    if (n.endsWith(".xlsx") || n.endsWith(".xls")) return "application/vnd.ms-excel";
    if (n.endsWith(".ods")) return "application/vnd.oasis.opendocument.spreadsheet";
    return "application/octet-stream";
  }

  function safeObjectURL(file) {
    try { return (window.URL || (window as any).webkitURL).createObjectURL(file); } catch { return null; }
  }

  function isUploadAllowedForRole(periodId: string, role?: string | null) {
    // Admin (y otros roles que no son rrhh) pueden subir siempre
    if (!periodId) return false;
    const p = periods.find((x: any) => x.id === periodId);
    if (p?.locked && me?.role !== "superadmin") return false;
    if (role && role !== "rrhh") return true;
    if (!p) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const fromStr = p.uploadFrom as string | undefined;
    const toStr   = p.uploadTo   as string | undefined;

    // Si no hay fechas cargadas, no se restringe
    if (!fromStr && !toStr) return true;

    const from = fromStr ? new Date(fromStr) : null;
    const to   = toStr   ? new Date(toStr)   : null;

    if (from) {
      const fromDay = new Date(from);
      fromDay.setHours(0, 0, 0, 0);
      if (today < fromDay) return false;
    }

    if (to) {
      const toDay = new Date(to);
      toDay.setHours(0, 0, 0, 0);
      if (today > toDay) return false;
    }

    return true;
  }

  function deleteFile(id: string) {
    const isSuperAdmin = me?.role === "superadmin";
    const isAdminRole  = me?.role === "admin";

    if (!isSuperAdmin && !isAdminRole) {
      alert("Solo un administrador puede borrar archivos.");
      return;
    }

    const f = files.find((x) => x.id === id);
    if (!f) return;

    if (isSuperAdmin) {
      // Hard delete: elimina físicamente del array y del storage
      if (!confirm(`¿ELIMINAR DEFINITIVAMENTE "${f.name}"?\nEsta acción no se puede deshacer y no deja trazabilidad.`)) return;
      setFiles((prev) => prev.filter((x) => x.id !== id));
      db.files.appendAudit({ t: new Date().toISOString(), action: "hard_delete", byUserId: me?.id || "", byUsername: me?.username || "sistema", details: `Archivo eliminado: "${f.name}" (período: ${f.periodId})`, fileId: id, periodId: f.periodId });
      publishEvent({
        type: "file_hard_deleted",
        title: "Archivo eliminado permanentemente",
        message: `${me?.username || "sistema"} eliminó permanentemente ${f.name}`,
        fileId: id,
        periodId: f.periodId,
      });
      return;
    }

    // Admin: borrado lógico (queda en trazabilidad como ANULADO)
    if (!confirm(`¿Anular el archivo "${f.name}"? Quedará en trazabilidad como ANULADO (solo Admin lo ve).`)) return;

    setFiles((prev) =>
      prev.map((x) => {
        if (x.id !== id) return x;

        const now = new Date().toISOString();
        const whoUser = me?.username || "sistema";
        const whoId = me?.id || me?.username || "sistema";

        const next = sclone(x);
        (next as any).statusOverride = "eliminado";
        (next as any).deletedAt = now;
        (next as any).deletedByUsername = whoUser;
        (next as any).deletedByUserId = whoId;

        if (typeof addHistoryEntry === "function") {
          return addHistoryEntry(next, "Archivo ANULADO por Admin");
        }
        return next;
      })
    );

    publishEvent({
      type: "file_deleted",
      title: "Archivo anulado",
      message: `${me?.username || "sistema"} anuló ${f.name}`,
      fileId: id,
      periodId: f.periodId,
    });
  }

  async function hardResetPeriod(periodId: string) {
    const count = files.filter((x: any) => x.periodId === periodId).length;
    if (USE_API) {
      try {
        const res = await fetch(`${API_URL}/files/period/${periodId}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          alert(d.error || 'Error al resetear la liquidación en el servidor.');
          return;
        }
      } catch {
        alert('Error de conexión al resetear la liquidación.');
        return;
      }
    }
    setFiles((prev) => prev.filter((x) => x.periodId !== periodId));
    db.files.appendAudit({ t: new Date().toISOString(), action: "period_reset", byUserId: me?.id || "", byUsername: me?.username || "sistema", details: `Reset de liquidación ${periodId} (${count} archivos eliminados)`, periodId });
    publishEvent({
      type: "period_reset",
      title: "Liquidación reseteada",
      message: `${me?.username || "sistema"} eliminó todos los archivos de la liquidación ${periodId}`,
      periodId,
    });
  }

  function handleUpload(ev) {
    if (!myPerms.actions.bumpVersion) {
      if (ev?.target) (ev.target as any).value = "";
      alert("No tenés permiso para subir o sustituir archivos.");
      return;
    }

    const list = Array.from(ev.target?.files || []);
    if (!list.length) return;

    if (periods.length === 0) {
      alert("Primero creá al menos una liquidación (mes/año).");
      if (ev.target) (ev.target as any).value = "";
      return;
    }

    if (!selectedPeriodId) {
      alert("Primero seleccioná una liquidación.");
      if (ev.target) (ev.target as any).value = "";
      return;
    }

    // 👉 NUEVO: verificar ventana de carga para RRHH
    const allowed = isUploadAllowedForRole(selectedPeriodId, me?.role);
    if (!allowed) {
      if (ev?.target) (ev.target as any).value = "";

      const p = periods.find((x: any) => x.id === selectedPeriodId);
      const fromStr = p?.uploadFrom || "";
      const toStr   = p?.uploadTo   || "";

      let msg = "Para esta liquidación ya no está habilitada la carga de archivos desde Información (RRHH).";
      if (fromStr || toStr) {
        msg += "\n\nVentana de carga definida:";
        msg += `\n- Desde: ${fromStr || "sin límite de inicio"}`;
        msg += `\n- Hasta: ${toStr || "sin límite de fin"}`;
      }
      msg += "\n\nConsultá con un administrador si necesitás habilitarla o extenderla.";

      alert(msg);
      return;
    }

    // Si está permitido, seguimos como antes
    setLastPicked(list.map((f) => `${f.name || "archivo"} (${prettyBytes(f.size)})`));

    const lower = (s: string) => (s || "").toLowerCase();

    // En API mode procesamos async para poder subir el binario antes de actualizar estado
    const processFile = async (file: File) => {
      const existing = files.find(
        (x) => x.periodId === selectedPeriodId && lower(x.name) === lower(file.name)
          && x.statusOverride !== 'eliminado' && !x.eliminated
      );

      // ===== Detectar combinación (sede + sector + subcategoría) =====
      const detection = detectCombinationForFile ? detectCombinationForFile(file.name || "") : { ok: false, error: "no_site", siteCode: null };

      if (!detection.ok) {
        const msg = detection.error === "no_site"
          ? `"${file.name}"\nNo contiene un código de sede válido (SC, SG, JPII…). El archivo no puede subirse.`
          : `"${file.name}"\nLa combinación detectada (sede: ${detection.siteCode}) no existe en la configuración. Pedile a un administrador que la cree.`;
        alert(msg);
        return;
      }

      const combo = detection.combination;
      const resolvedSiteCode    = combo.siteCode;
      const resolvedSectorName  = combo.sectorName;
      const resolvedSubcategory = combo.subcategory || null;
      const resolvedComboId     = combo.id;

      const opts = {
        sectorName:    resolvedSectorName,
        subcategory:   resolvedSubcategory,
        combinationId: resolvedComboId,
      };

      if (existing && myPerms.actions.bumpVersion) {
        // Sustituye el archivo existente actualizando su versión en la misma fila
        const nextVer = (Number.isFinite(existing.version) ? existing.version : 1) + 1;

        const ok = confirm(
          `Ya existe "${file.name}" en esta liquidación (v${existing.version || 1}).\n` +
          `¿Querés reemplazarlo con esta nueva versión (v${nextVer})?`
        );

        if (ok) {
          let storagePath = existing.storagePath || null;
          if (USE_API) {
            const saved = await uploadBinaryToBackend(file, {
              fileId: existing.id,
              periodId: selectedPeriodId,
              sector: resolvedSectorName || existing.sectorName || existing.sector || undefined,
              siteCode: resolvedSiteCode || existing.siteCode || undefined,
              subcategory: resolvedSubcategory || existing.subcategory || undefined,
              combinationId: resolvedComboId || existing.combinationId || undefined,
            });
            if (saved?.storagePath) storagePath = saved.storagePath;
          }
          const newBlobUrl = safeObjectURL(file as any);
          updateFile(existing.id, (f: any) =>
            addHistoryEntry(
              {
                ...f,
                version: nextVer,
                size: file.size,
                blobUrl: newBlobUrl,
                storagePath: storagePath || f.storagePath,
                status: "actualizado",
                at: nowISO(),
                byUsername: me?.username || "sistema",
                byUserId: me?.id || "",
                sectorName:    (opts as any)?.sectorName    ?? f.sectorName    ?? null,
                subcategory:   (opts as any)?.subcategory   ?? f.subcategory   ?? null,
                combinationId: (opts as any)?.combinationId ?? f.combinationId ?? null,
                siteCode:      resolvedSiteCode ?? f.siteCode ?? null,
              },
              `Nueva versión v${nextVer} subida por ${me?.username || "sistema"}`
            )
          );
          publishEvent({
            type: "version_bumped",
            title: `Nueva versión (v${nextVer})`,
            message: `${me?.username || "sistema"} reemplazó ${file.name} con v${nextVer}`,
            fileId: existing.id,
            periodId: selectedPeriodId,
          });
        }
      } else {
        // alta normal
        let backendFile: any = null;
        if (USE_API) {
          backendFile = await uploadBinaryToBackend(file, {
            periodId:      selectedPeriodId,
            sector:        resolvedSectorName  || undefined,
            siteCode:      resolvedSiteCode    || undefined,
            subcategory:   resolvedSubcategory || undefined,
            combinationId: resolvedComboId     || undefined,
          });
        }
        createNewFile(file, { ...opts, backendFile });
      }
    };

    list.forEach((file) => processFile(file as File));



    if (ev.target) (ev.target as any).value = "";
  }

  function createNewFile(
    file: { name: string; size: number; type?: string },
    opts?: { sectorName?: string; subcategory?: string; combinationId?: string; noNews?: boolean; version?: number; seriesKey?: string; siteCode?: string; backendFile?: any }
  ) {
    // Si el backend ya subió el archivo, usamos su ID y storagePath
    const backendFile = opts?.backendFile;
    const id = backendFile?.id || uuid();
    const storagePath = backendFile?.storagePath || null;

    const hasBlob = file.size && file.size > 0;
    const blobUrl = hasBlob ? safeObjectURL(file as any) : undefined;

    const base: any = {
      id,
      name: file.name || "sin_nombre",
      size: Number(file.size) || 0,
      type: file.type || guessTypeFromName(file.name || ""),
      status: "cargado",
      version: Number.isFinite(opts?.version) ? (opts!.version as number) : 1,
      seriesKey: opts?.seriesKey || null,
      byUsername: me?.username || "sistema",
      byUserId: me?.id || "",
      at: nowISO(),
      notes: "",
      blobUrl,
      storagePath,
      history: [],
      observations: [],
      periodId: selectedPeriodId,
      siteCode:      opts?.siteCode      ?? null,
      sectorName:    opts?.sectorName    ?? null,
      subcategory:   opts?.subcategory   ?? null,
      combinationId: opts?.combinationId ?? null,
      noNews: !!opts?.noNews,
    };

    const isNoNews = !!opts?.noNews;
    const enriched = addHistoryEntry(
      base,
      isNoNews ? "Sin novedades" : "Cargado",
      isNoNews
        ? `Sector marcado sin novedades por ${me?.username || "sistema"} en ${periodNameById[selectedPeriodId] || "Liquidación"}`
        : `Archivo subido por ${me?.username || "sistema"} en ${periodNameById[selectedPeriodId] || "Liquidación"}`
    );

    setFiles((prev: any[]) => [enriched, ...prev]);

    publishEvent({
      type: "file_uploaded",
      title: isNoNews ? "Sector sin novedades" : "Archivo cargado",
      message: isNoNews
        ? `${me?.username || "sistema"} marcó sin novedades el sector ${opts?.sectorName || ""} en ${periodNameById[selectedPeriodId] || "Liquidación"}`
        : `${me?.username || "sistema"} subió ${file.name || "archivo"} en ${periodNameById[selectedPeriodId] || "Liquidación"}`,
      fileId: id,
      periodId: selectedPeriodId,
    });
  }

  function clearAll() {
    if (confirm("¿Borrar todo el demo?")) { setFiles([]); db.files.saveAll([]); }
  }

  function handleStatusChange(f, next) {
    if (me?.role !== "admin" && me?.role !== "superadmin") {
      alert("Solo un administrador puede cambiar el estado manualmente.");
      return;
    }
    const nextKey = typeof next === "string" ? next : next?.key;
    if (!nextKey) return;

    const roleKey = me?.role === "superadmin" ? "superadmin" : "admin";
    const allowed = new Set(ROLE_DEFAULT_PERMISSIONS[roleKey]?.allowedStatuses || ROLE_DEFAULT_PERMISSIONS.admin.allowedStatuses);
    if (!allowed.has(nextKey)) {
      alert("Ese estado no está permitido para cambio manual.");
      return;
    }

    if (nextKey === "observado") {
      // Si querés que 'observado' manual pida detalles, mantené este flujo
      if (onOpenObserve) onOpenObserve(f.id);
      return;
    }

    // >>> OVERRIDE manual por admin <<<
    updateFile(f.id, (curr) =>
      addHistoryEntry(
        { ...curr, status: nextKey, statusOverride: nextKey },
        `Estado forzado por admin: ${STATUS.find((s) => s.key === nextKey)?.label || nextKey}`
      )
    );

    const lbl = STATUS.find((s) => s.key === nextKey)?.label || nextKey;
    publishEvent({
      type: "status_changed",
      title: `Estado → ${lbl}`,
      message: `${me?.username || "sistema"} cambió estado de ${f.name} a ${lbl}`,
      fileId: f.id,
      periodId: f.periodId,
    });
  }

  return {
    files, setFiles,
    effectiveStatus, addHistoryEntry, displayStatusForRole,
    updateFile, setStatus, markDownloaded, bumpVersion, setNote,
    guessTypeFromName, safeObjectURL, isUploadAllowedForRole,
    deleteFile, hardResetPeriod, handleUpload, createNewFile, clearAll, handleStatusChange,
  };
}
