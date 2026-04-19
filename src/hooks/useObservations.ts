// @ts-nocheck
import { useState } from "react";
import { uuid } from "../lib/ids";
import { nowISO, formatDate } from "../lib/time";
import { hasPendingDoubts } from "../features/observations/observationHelpers";
import { sclone } from '../features/shared/uiHelpers';

// ─── Types ───────────────────────────────────────────────────────────────────
type AjusteAccion = "alta" | "modificar" | "baja";
type AjusteFila = {
  id: string; nro: string; nombre: string; cargo: string; accion: AjusteAccion;
  codigo?: string; codDesc?: string; dhc?: string; actividad?: string; cc?: string; nota?: string;
  modCampo?: "codigo" | "dhc" | "actividad"; modDe?: string; modA?: string;
  answered?: boolean; answerText?: string; answeredByUsername?: string;
  answeredByUserId?: string; answeredAt?: string;
};
type AjusteThread = { id: string; createdAt: string; byUsername: string; byUserId: string; tipo: "arreglo"; rows: AjusteFila[]; };
type AddRowInput = { nro: string; nombre: string; duda: string; sector: string; cc: string; };

function blankAdjRow(): AjusteFila {
  return { id: uuid(), nro: "", nombre: "", cargo: "", accion: "alta", codigo: "", codDesc: "", dhc: "", actividad: "", cc: "", nota: "", modCampo: "codigo", modDe: "", modA: "" };
}
function blankObsRowLocal() {
  return { id: uuid(), nro: "", nombre: "", duda: "", sector: "", cc: "" };
}
const blankAddRowFn = (): AddRowInput => ({ nro: "", nombre: "", duda: "", sector: "", cc: "" });

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useObservations({ files, me, setFiles, pushToast, addHistoryEntry, publishEvent, selectedPeriodId }: any) {
  // ── state ──
  const [observeDialog, setObserveDialog] = useState({ open: false, fileId: null as null | string, rows: [blankObsRowLocal()] });
  const [replyDialog, setReplyDialog] = useState<{ open: boolean; fileId: string | null; threadId: string | null; rowId: string | null; key: string | null; }>({ open: false, fileId: null, threadId: null, rowId: null, key: null });
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [fileDoubtDialog, setFileDoubtDialog] = useState<{ open: boolean; fileId: string | null; text: string; imageDataUrl: string }>({ open: false, fileId: null, text: "", imageDataUrl: "" });
  const [adjustDialog, setAdjustDialog] = useState<{ open: boolean; fileId: string | null; rows: AjusteFila[]; }>({ open: false, fileId: null, rows: [blankAdjRow()] });
  const [adjustReplyInputs, setAdjustReplyInputs] = useState<Record<string, string>>({});
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [addRowInputs, setAddRowInputs] = useState<Record<string, AddRowInput>>({});

  // ── helpers ──
  function updateFile(id: string, updater: (f: any) => any) {
    setFiles((prev: any[]) => prev.map((f: any) => (f.id === id ? updater(JSON.parse(JSON.stringify(f))) : f)));
  }

function openReplyDialog(fileId: string, threadId: string, rowId: string) {
  const key = `${threadId}:${rowId}`;
  setReplyDialog({ open: true, fileId, threadId, rowId, key });
}

function closeReplyDialog() {
  setReplyDialog({ open: false, fileId: null, threadId: null, rowId: null, key: null });
}

function setAdjCell(i: number, field: keyof AjusteFila, value: string) {
  setAdjustDialog(v => {
    const rows = v.rows.map((r, idx) => (idx === i ? { ...r, [field]: value } : r));
    return { ...v, rows };
  });
}

function addAdjRow()  { setAdjustDialog(v => ({ ...v, rows: [...v.rows, blankAdjRow()] })); }

function removeAdjRow(i: number) {
  setAdjustDialog(v => ({ ...v, rows: v.rows.length > 1 ? v.rows.filter((_, idx) => idx !== i) : v.rows }));
}

  function setObsCell(i, field, value) {
    setObserveDialog((v) => {
      const rows = v.rows.map((r, idx) => (idx === i ? { ...r, [field]: value } : r));
      return { ...v, rows };
    });
  }

  function addObsRow() { setObserveDialog((v) => ({ ...v, rows: [...v.rows, blankObsRowLocal()] })); }

  function removeObsRow(i) {
    setObserveDialog((v) => ({ ...v, rows: v.rows.length > 1 ? v.rows.filter((_, idx) => idx !== i) : v.rows }));
  }

  function confirmObserve() {
    const { fileId, rows } = observeDialog;
    if (!fileId) return;
    const ccRegex = /^\d{1,10}\/(\d|[1-9]\d|100)\.00-$/;
    const clean = rows.map((r) => ({ ...r, id: r.id || uuid() }))
      .filter((r) => r.nro || r.nombre || r.duda || r.sector || r.cc);
    if (clean.length === 0) { alert("Agregá al menos una fila con una duda."); return; }
    // Validate CC format if provided
    for (const r of clean) {
      const ccValue = (r.cc || "").trim();
      if (ccValue && !ccRegex.test(ccValue)) {
        alert(`El centro de costo "${ccValue}" no es válido.\nFormato: número/porcentaje.00-\nEjemplo: 101/100.00-`);
        return;
      }
    }
    updateFile(fileId, (f) => {
      const thread = {
        id: uuid(),
        createdAt: nowISO(),
        byUsername: me?.username || "sueldos",
        byUserId: me?.id || "",
        rows: clean.map((r) => ({
          ...r,
          answered: false,
          answerText: "",
          answeredByUsername: "",
          answeredByUserId: "",
          answeredAt: "",
        
          // ✅ Cierre por Sueldos
          processed: false,
          processedAt: "",
          processedByUsername: "",
          processedByUserId: "",
        })),
      };
    
      let nf = {
        ...f,
        observations: [thread, ...(f.observations || [])],
      };
    
      nf = addHistoryEntry(nf, "Observado", `Se registraron ${clean.length} duda(s)`);
      nf.status = "observado";
      return nf;
    });
    publishEvent({
      type: "observation_added",
      title: "Observado (Dudas Funcionario)",
      message: `${me?.username || "sistema"} registró ${clean.length} duda(s) por funcionario`,
      fileId: fileId!,
      periodId: (files.find(x => x.id === fileId)?.periodId) || selectedPeriodId,
    });
    setObserveDialog({ open: false, fileId: null, rows: [blankObsRowLocal()] });
  }

  function cancelObserve() { setObserveDialog({ open: false, fileId: null, rows: [blankObsRowLocal()] }); }

  function answerObservation(fileId, threadId, rowId) {
    const key = `${threadId}:${rowId}`;
    const text = (replyInputs[key] || "").trim();
    if (!text) return;
    updateFile(fileId, (f) => {
      const nf = sclone(f);
      const th = nf.observations.find((t) => t.id === threadId);
      if (!th) return nf;
      const row = th.rows.find((r) => r.id === rowId);
      if (!row) return nf;
      row.answered = true; row.answerText = text;
      row.answeredByUsername = me?.username || "información";
      row.answeredByUserId = me?.id || "";
      row.answeredAt = nowISO();
      const pending = hasPendingDoubts(nf);
      nf.status = pending ? "observado" : "duda_respondida";
      return addHistoryEntry(nf, "Respuesta a observación", `Fila ${row.nro || row.nombre || rowId}`);
    });
    publishEvent({
      type: "observation_answered",
      title: "Duda respondida",
      message: `${me?.username || "sistema"} respondió una duda`,
      fileId,
      periodId: (files.find(x => x.id === fileId)?.periodId),
    });
    setReplyInputs((v) => ({ ...v, [key]: "" }));
  }

  function markObservationProcessed(fileId: string, threadId: string, rowId: string) {
    if (!(me?.role === "sueldos" || me?.role === "admin")) {
      alert("Solo Sueldos puede marcar como procesada.");
      return;
    }
  
    updateFile(fileId, (f: any) => {
      const nf = sclone(f);
      const th = (nf.observations || []).find((t: any) => t.id === threadId);
      if (!th) return nf;
  
      const row = (th.rows || []).find((r: any) => r.id === rowId);
      if (!row) return nf;
  
      // Solo si ya está respondida por Información
      if (!row.answered) {
        alert("Primero debe estar respondida por Información.");
        return nf;
      }
  
      // Si ya está procesada, no hacemos nada
      if (row.processed) return nf;
  
      row.processed = true;
      row.processedAt = nowISO();
      row.processedByUsername = me?.username || "sueldos";
      row.processedByUserId = me?.id || "";
  
      return addHistoryEntry(
        nf,
        "Duda procesada",
        `Fila ${row.nro || row.nombre || rowId}`
      );
    });
  
    publishEvent({
      type: "observation_processed",
      title: "Duda procesada",
      message: `${me?.username || "sistema"} marcó una duda como procesada`,
      fileId,
      periodId: (files.find((x: any) => x.id === fileId)?.periodId),
    });
  }

  function addRowToThread(fileId: string, threadId: string) {
    if (!(me?.role === "sueldos" || me?.role === "admin")) {
      alert("Solo Sueldos puede agregar filas.");
      return;
    }
  
    const input = addRowInputs?.[threadId] || blankAddRowFn();
  
    // Validación mínima (ajustala si querés)
    const nro = (input.nro || "").trim();
    const nombre = (input.nombre || "").trim();
    const duda = (input.duda || "").trim();
    const sector = (input.sector || "").trim();
    const cc = (input.cc || "").trim();
  
    if (!duda) {
      alert("La duda no puede quedar vacía.");
      return;
    }
  
    updateFile(fileId, (f: any) => {
      const nf = sclone(f);
  
      const th = (nf.observations || []).find((t: any) => t.id === threadId);
      if (!th) return nf;
  
      if (!Array.isArray(th.rows)) th.rows = [];
  
      th.rows.push({
        id: uuid(),
        nro,
        nombre,
        duda,
        sector,
        cc,
  
        answered: false,
        answerText: "",
        answeredByUsername: "",
        answeredByUserId: "",
        answeredAt: "",
  
        processed: false,
        processedAt: "",
        processedByUsername: "",
        processedByUserId: "",
      });
  
      // Si agregás una fila nueva, el archivo debería volver a "observado"
      // porque ahora hay una duda pendiente de respuesta.
      nf.status = "observado";
  
      return addHistoryEntry(
        nf,
        "Fila agregada a duda",
        `Hilo ${threadId} • ${nro ? `Funcionario ${nro}` : "sin nro"}`
      );
    });
  
    // limpiar inputs para ese hilo
    setAddRowInputs((s: any) => ({
      ...s,
      [threadId]: blankAddRowFn(),
    }));
  
    // opcional: cerrar el panel de agregar fila
    setSelectedThreadId(null);
  
    publishEvent({
      type: "observation_row_added",
      title: "Fila agregada",
      message: `${me?.username || "sistema"} agregó una fila a un hilo de dudas`,
      fileId,
      periodId: (files.find((x: any) => x.id === fileId)?.periodId),
    });
  
    pushToast({
      title: "Fila agregada",
      message: "Se agregó la fila al hilo correctamente.",
    });
  }

  function deleteThread(fileId: string, threadId: string) {
    // Seguridad: solo Admin
    if (me?.role !== "admin") {
      alert("Acción no permitida. Solo Administrador puede eliminar hilos.");
      return;
    }
  
    const f = files.find((x: any) => x.id === fileId);
    const th = (f?.observations || []).find((t: any) => t.id === threadId);
  
    if (!f || !th) {
      alert("No se encontró el hilo a eliminar.");
      return;
    }
  
    const tipo = th?.tipo === "arreglo" ? "arreglo" : "hilo";
    const ok = confirm(`¿Eliminar este ${tipo}? Quedará trazado en historial.`);
    if (!ok) return;
  
    updateFile(fileId, (curr: any) => {
      const nf = sclone(curr);
  
      const target = (nf.observations || []).find((t: any) => t.id === threadId);
      if (!target) return nf;
  
      // Soft-delete (trazable)
      target.deleted = true;
      target.deletedAt = nowISO();
      target.deletedByUsername = me?.username || "admin";
      target.deletedByUserId = me?.id || "";
  
      // Recalcular estado (si al borrar ya no quedan pendientes)
      const pending = hasPendingDoubts(nf);
      nf.status = pending ? "observado" : "duda_respondida";
  
      return addHistoryEntry(
        nf,
        "Hilo eliminado",
        `Admin ${me?.username || "admin"} eliminó un ${tipo} • ${formatDate(nowISO())}`
      );
    });
  
    publishEvent({
      type: "thread_deleted",
      title: "Hilo eliminado",
      message: `${me?.username || "admin"} eliminó un ${tipo}`,
      fileId,
      periodId: (files.find((x: any) => x.id === fileId)?.periodId),
    });
  
    pushToast({
      title: "Hilo eliminado",
      message: "Se marcó como eliminado (queda trazado en historial).",
    });
  }

  function openFileDoubt(f: any) {
    if (!(me?.role === "sueldos" || me?.role === "admin")) {
      alert("Solo Sueldos puede crear dudas.");
      return;
    }
    setFileDoubtDialog({ open: true, fileId: f.id, text: "", imageDataUrl: "" });
  }

  function confirmFileDoubt() {
    const { fileId, text, imageDataUrl } = fileDoubtDialog;
    if (!fileId) return;
    const t = (text || "").trim();
    if (!t) { alert("Escribí la duda del archivo."); return; }
    updateFile(fileId, (f) => {
      const thread = {
        id: uuid(),
        createdAt: nowISO(),
        byUsername: me?.username || "sueldos",
        byUserId: me?.id || "",
        rows: [{
          id: uuid(),
          nro: "", nombre: "", duda: t, sector: "", cc: "",
          imageDataUrl: imageDataUrl || "",
          answered: false,
          answerText: "",
          answeredByUsername: "",
          answeredByUserId: "",
          answeredAt: "",
          processed: false,
          processedAt: "",
          processedByUsername: "",
          processedByUserId: "",
        }],
      };
      let nf = { ...f, observations: [thread, ...(f.observations || [])] };
      nf = addHistoryEntry(nf, "Duda de archivo", "Se registró una duda general del archivo");
      nf.status = "observado";
      return nf;
    });
    publishEvent({
      type: "observation_added",
      title: "Duda de archivo",
      message: `${me?.username || "sistema"} registró una duda general del archivo`,
      fileId: fileId!,
      periodId: (files.find(x => x.id === fileId)?.periodId) || selectedPeriodId,
    });
    setFileDoubtDialog({ open: false, fileId: null, text: "", imageDataUrl: "" });
  }

  function cancelFileDoubt() { setFileDoubtDialog({ open: false, fileId: null, text: "", imageDataUrl: "" }); }

function openAdjustForFile(f: any) {
  if (!(me?.role === "rrhh" || me?.role === "admin")) {
    alert("Solo RRHH puede registrar arreglos.");
    return;
  }
  setAdjustDialog({ open: true, fileId: f.id, rows: [blankAdjRow()] });
}

function confirmAdjust() {
  const { fileId, rows } = adjustDialog;
  if (!fileId) return;

  const ccRegex = /^\d{1,10}\/(\d|[1-9]\d|100)\.00-$/;

    // Normalizamos y filtramos filas con datos
  const clean = rows
    .map(r => ({ ...r, id: r.id || uuid() }))
    .filter(r => {
      const hasAny =
        (r.nro?.trim()) ||
        (r.nombre?.trim()) ||
        (r.cargo?.trim()) ||
        (r.codigo?.trim()) ||
        (r.codDesc?.trim()) ||
        (r.dhc?.trim()) ||          // Días/Horas/Cantidades
        (r.actividad?.trim()) ||
        (r.cc?.trim()) ||            // 👈 ahora también centro de costo
        (r.nota?.trim());

      // Fila completamente vacía → la ignoramos
      if (!hasAny) return false;

      // Campos mínimos obligatorios
      if (!r.nro?.trim() || !r.nombre?.trim() || !r.accion) {
        alert("Cada fila debe tener Nro, Nombre y Acción.");
        throw new Error("Fila incompleta");
      }

      // ✅ Validación de centro de costo
      const ccValue = (r.cc || "").trim();
      if (!ccRegex.test(ccValue)) {
        alert(
          `El centro de costo "${ccValue || "(vacío)"}" no es válido.\nEjemplo válido: 101/100.00-`
        );
        throw new Error("Centro de costo inválido");
      }

      return true;
    });

  if (clean.length === 0) {
    alert("Agregá al menos una fila de arreglo.");
    return;
  }

  updateFile(fileId, (f) => {
    // Hilo de arreglos (queda en observations)
    const thread: AjusteThread = {
      id: uuid(),
      createdAt: nowISO(),
      byUsername: me?.username || "información",
      byUserId: me?.id || "",
      tipo: "arreglo",
      rows: clean.map(r => ({
        ...r,
        cc: (r.cc || "").trim(),   // 👈 guardamos el CC normalizado
        answered: false,
        answerText: "",
        answeredByUsername: "",
        answeredByUserId: "",
        answeredAt: ""
      }))
    };

    // Texto DETALLADO para historial (una línea por fila)
    const detalle = clean.map((r, idx) => {
      const partes = [
        `#${idx + 1}`,
        (r.accion || "").toUpperCase(),
        r.nro ? `Nro ${r.nro}` : null,
        r.nombre ? `${r.nombre}` : null,
        r.cargo ? `Cargo: ${r.cargo}` : null,
        r.codigo ? `Código: ${r.codigo}` : null,
        r.codDesc ? `(${r.codDesc})` : null,
        r.dhc ? `D/H/C: ${r.dhc}` : null,
        r.actividad ? `Actividad: ${r.actividad}` : null,
        r.nota ? `Nota: ${r.nota}` : null,
      ].filter(Boolean).join(" · ");
      return `- ${partes}`;
    }).join("\n");

    let nf = { ...f, observations: [thread, ...(f.observations || [])] };

    // Entrada de historial con detalle humano
    nf = addHistoryEntry(
      nf,
      "Arreglos solicitados",
      `RRHH (${me?.username || "información"}) registró ${clean.length} arreglo(s):\n${detalle}`
    );

    // Queda observado hasta que Sueldos aplique/conteste
    nf.status = "observado";
    return nf;
  });

  // Notificación (resumen compacto por fila)
  publishEvent({
    type: "observation_added",
    title: "Arreglos solicitados",
    message:
      `${me?.username || "sistema"} registró ${rows.length} arreglo(s): ` +
      clean.map(r => {
        const cod = r.codigo ? ` cod ${r.codigo}` : "";
        const des = r.codDesc ? ` (${r.codDesc})` : "";
        const dhc = r.dhc ? ` dhc ${r.dhc}` : "";
        const act = r.actividad ? ` act ${r.actividad}` : "";
        return `${(r.accion || "").toUpperCase()} ${r.nro || "-"} ${r.nombre || "-"}${cod}${des}${dhc}${act}`;
      }).join(" | "),
    fileId,
    periodId: (files.find(x => x.id === fileId)?.periodId) || selectedPeriodId,
  });

  setAdjustDialog({ open: false, fileId: null, rows: [blankAdjRow()] });
}

function cancelAdjust() {
  setAdjustDialog({ open: false, fileId: null, rows: [blankAdjRow()] });
}

function answerAdjust(fileId: string, threadId: string, rowId: string, texto: string) {
  const t = (texto || "").trim();

  updateFile(fileId, (f) => {
    const nf = sclone(f);
    const th = nf.observations?.find((t: any) => t.id === threadId);
    if (!th || th.tipo !== "arreglo") return nf;

    const row = th.rows.find((r: AjusteFila) => r.id === rowId);
    if (!row) return nf;

    row.answered = true;
    row.answerText = t;
    row.answeredByUsername = me?.username || "sueldos";
    row.answeredByUserId = me?.id || "";
    row.answeredAt = nowISO();

    // Si no quedan dudas/arreglos pendientes → duda_respondida
    const pending = hasPendingDoubts(nf);
    nf.status = pending ? "observado" : "duda_respondida";

    // Historial: registra qué fila se aplicó
    return addHistoryEntry(
      nf,
      "Arreglo aplicado",
      `Fila ${row.nro || row.nombre || rowId}${row.codigo ? ` · Código ${row.codigo}` : ""}${
        row.codDesc ? ` (${row.codDesc})` : ""
      }${row.dhc ? ` · D/H/C ${row.dhc}` : ""}${row.actividad ? ` · Actividad ${row.actividad}` : ""}${
        row.answerText ? ` · Nota: ${row.answerText}` : ""
      }`
    );
  });

  publishEvent({
    type: "observation_answered",
    title: "Arreglo aplicado",
    message: `${me?.username || "sistema"} aplicó un arreglo`,
    fileId,
    periodId: (files.find(x => x.id === fileId)?.periodId),
  });
}

  // Responde un thread de arreglo completo (desde el botón "Responder arreglo")
  function answerAdjustThread(fileId: string, threadId: string, texto: string) {
    const t = (texto || "").trim();

    updateFile(fileId, (f) => {
      const nf = sclone(f);
      const th = nf.observations?.find((o: any) => o.id === threadId);
      if (!th || th.tipo !== "arreglo") return nf;

      const now = nowISO();
      // Marcar el thread como respondido
      th.answered = true;
      th.answerText = t;
      th.answeredByUsername = me?.username || "sueldos";
      th.answeredByUserId = me?.id || "";
      th.answeredAt = now;

      // También marcar todas las rows como respondidas
      for (const row of (th.rows || [])) {
        if (!row.answered) {
          row.answered = true;
          row.answerText = t;
          row.answeredByUsername = me?.username || "sueldos";
          row.answeredByUserId = me?.id || "";
          row.answeredAt = now;
        }
      }

      const pending = hasPendingDoubts(nf);
      nf.status = pending ? "observado" : "duda_respondida";

      return addHistoryEntry(nf, "Arreglo respondido", `Sueldos respondió el arreglo${t ? `: "${t}"` : ""}`);
    });

    publishEvent({
      type: "observation_answered",
      title: "Arreglo respondido",
      message: `${me?.username || "sistema"} respondió un arreglo`,
      fileId,
      periodId: (files.find(x => x.id === fileId)?.periodId),
    });
  }

  return {
    // state
    observeDialog, setObserveDialog,
    replyDialog, setReplyDialog,
    replyInputs, setReplyInputs,
    fileDoubtDialog, setFileDoubtDialog,
    adjustDialog, setAdjustDialog,
    adjustReplyInputs, setAdjustReplyInputs,
    selectedThreadId, setSelectedThreadId,
    addRowInputs, setAddRowInputs,
    blankObsRow: blankObsRowLocal,
    blankAdjRow,
    blankAddRow: blankAddRowFn,
    // functions
    openReplyDialog, closeReplyDialog,
    setAdjCell, addAdjRow, removeAdjRow,
    setObsCell, addObsRow, removeObsRow,
    confirmObserve, cancelObserve,
    answerObservation, markObservationProcessed,
    addRowToThread, deleteThread,
    openFileDoubt, confirmFileDoubt, cancelFileDoubt,
    openAdjustForFile, confirmAdjust, cancelAdjust, answerAdjust, answerAdjustThread,
  };
}
