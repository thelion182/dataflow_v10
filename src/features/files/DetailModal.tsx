// @ts-nocheck
import React, { useState } from "react";
import AutoGrowTextarea from "../../components/AutoGrowTextarea";
import { prettyBytes } from "../../lib/bytes";
import { formatDate } from "../../lib/time";
import { typeBadge, userNameOr } from "../shared/uiHelpers";
export function DetailModal({ detailOpen, setDetailOpen, selectedFile, setSelected, setSelectedThreadId, selectedThreadId, periodNameById, prettyBytes, formatDate, userNameOr, meRole, me, setNote, openReplyDialog, addRowToThread, addRowInputs, setAddRowInputs, blankAddRow, markObservationProcessed, deleteThread, adjustReplyInputs, setAdjustReplyInputs, answerAdjust, answerAdjustThread, replyInputs, setReplyInputs, answerObservation }: any) {
  const [expandedArreglos, setExpandedArreglos] = useState<Set<string>>(new Set());
  function toggleArreglo(id: string) {
    setExpandedArreglos(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  return (
    <>
      {/* MODAL: Detalle */}
      {detailOpen && selectedFile && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-5xl max-h-[85vh] overflow-y-auto rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
            <div className="flex items-start justify-between gap-4 sticky top-0 bg-neutral-900 pb-2">
              <div>
                <h3 className="font-semibold">Detalle • {selectedFile.name}</h3>
                <p className="text-xs text-neutral-400">
                  {prettyBytes(selectedFile.size)} • {typeBadge(selectedFile.type)} • v
                  {selectedFile.version} •{" "}
                  {periodNameById[selectedFile.periodId] || "—"}
                  {(selectedFile.byUsername || selectedFile.uploaderName) && (
                    <> • Subido por {selectedFile.byUsername || selectedFile.uploaderName}</>
                  )}
                </p>
              </div>
              <button
                onClick={() => {
                  setDetailOpen(false);
                  setSelected(null);
                  setSelectedThreadId(null); // dejar todo prolijo para la próxima apertura
                }}
                className="text-neutral-400 hover:text-neutral-200"
              >
                Cerrar
              </button>
            </div>

            <div className="grid md:grid-cols-3 gap-4 mt-4">
              <div className="md:col-span-2 space-y-6">
                {/* ===== Trazabilidad ===== */}
                <section>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <span className="inline-flex items-center justify-center rounded-xl border border-neutral-700 bg-neutral-900 h-6 w-6">
                      <svg
                        className="h-4 w-4 text-neutral-300"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M14 3H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V9z" />
                        <polyline points="14 3 14 9 20 9" />
                      </svg>
                    </span>
                    Trazabilidad
                  </h4>
                  <ul className="space-y-2">
                    {(selectedFile.history || []).map((h: any, i: number) => (
                      <li key={i} className="text-sm flex items-start gap-3">
                        <svg
                          className="mt-0.5 h-4 w-4 text-neutral-400 flex-shrink-0"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <rect
                            x="1.5"
                            y="1.5"
                            width="21"
                            height="21"
                            rx="5"
                            className="fill-neutral-900 stroke-neutral-700"
                          />
                          <path d="M14 3H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V9z" />
                          <polyline points="14 3 14 9 20 9" />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <div className="text-neutral-200">
                            {h.action}{" "}
                            <span className="text-neutral-500">— {formatDate(h.t)}</span>
                          </div>
                          {(h.action === "Arreglos solicitados" || h.action === "Arreglo respondido") && h.details ? (
                            <div className={`mt-1.5 rounded-xl border px-3 py-2 text-xs whitespace-pre-wrap ${
                              h.action === "Arreglos solicitados"
                                ? "bg-amber-950/30 border-amber-800/40 text-amber-200/80"
                                : "bg-emerald-950/30 border-emerald-800/40 text-emerald-200/80"
                            }`}>
                              {h.details}
                            </div>
                          ) : (
                            <div className="text-xs text-neutral-500">
                              Por: {userNameOr(h.byUsername)}{" "}
                              {h.details ? `• ${h.details}` : ""}
                            </div>
                          )}
                          {(h.action === "Arreglos solicitados" || h.action === "Arreglo respondido") && (
                            <div className="text-xs text-neutral-500 mt-0.5">Por: {userNameOr(h.byUsername)}</div>
                          )}
                        </div>
                      </li>
                    ))}
                    {(!selectedFile.history || selectedFile.history.length === 0) && (
                      <li className="text-neutral-500 text-sm">Sin eventos aún.</li>
                    )}
                  </ul>
                </section>
              </div>

              {/* Notas del archivo */}
              <div className="space-y-3">
                <label className="block text-sm text-neutral-300">Notas</label>
                <textarea
                  defaultValue={selectedFile.notes}
                  onBlur={(e) => setNote(selectedFile.id, e.target.value)}
                  placeholder="Observaciones visibles para ambos equipos…"
                  className="w-full min-h-[120px] px-3 py-2 rounded-xl bg-neutral-800 outline-none"
                />
                <div className="text-xs text-neutral-500">
                  Guardado al salir del campo.
                </div>
              </div>

              <div className="md:col-span-3">
                {/* ===== Dudas / Observado / Arreglos Información (unificado) ===== */}
                <section>
                  <h4 className="font-medium mb-2">
                    Dudas / Observado / Arreglos Información
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-neutral-400 mb-3">
                    <span className="px-2 py-0.5 rounded-lg border bg-amber-500/15 text-amber-300 border-amber-600/40">
                      Duda (Sueldos)
                    </span>
                    <span className="px-2 py-0.5 rounded-lg border bg-sky-500/15 text-sky-300 border-sky-600/40">
                      Arreglo (RRHH)
                    </span>
                    <span className="px-2 py-0.5 rounded-lg border bg-emerald-500/15 text-emerald-300 border-emerald-600/40">
                      Resuelto
                    </span>
                  </div>

                  {(!selectedFile.observations || selectedFile.observations.length === 0) ? (
                    <div className="text-sm text-neutral-500">
                      Sin dudas/observaciones.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(selectedFile.observations || [])
  .map((th: any) => {
    const esEliminado = !!th?.deleted;
    return (
                        <div key={th.id}>
                          {/* ── ARREGLO: botón colapsable ── */}
                          {th.tipo === "arreglo" ? (() => {
                            const rows = th.rows || [];
                            const allProcessed = rows.length > 0 && rows.every((r: any) => r.processed);
                            const allAnswered  = rows.length > 0 && rows.every((r: any) => r.answered);
                            const isOpen = expandedArreglos.has(th.id);
                            const statusBadge = esEliminado
                              ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-500 border border-neutral-700">anulado</span>
                              : allProcessed
                              ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-900/50 border border-emerald-700/40 text-emerald-300">✓ procesado</span>
                              : allAnswered
                              ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-900/50 border border-sky-700/40 text-sky-300">respondido · pend. procesar</span>
                              : <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/50 border border-amber-700/40 text-amber-300">pendiente</span>;
                            return (
                              <div className={`rounded-xl border transition-all ${esEliminado ? 'border-neutral-800/40 opacity-50' : isOpen ? 'border-orange-700/50 bg-orange-950/10' : 'border-orange-800/30 bg-orange-950/5'}`}>
                                {/* Cabecera — siempre visible */}
                                <button
                                  type="button"
                                  onClick={() => !esEliminado && toggleArreglo(th.id)}
                                  className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
                                  disabled={esEliminado}
                                >
                                  <span className="text-orange-400 text-sm">🔧</span>
                                  <span className="font-medium text-orange-300 text-sm">Arreglo solicitado</span>
                                  <span className="text-[11px] text-neutral-500">{rows.length} fila{rows.length !== 1 ? 's' : ''}</span>
                                  {statusBadge}
                                  <span className="text-[11px] text-neutral-600 ml-1">{formatDate(th.createdAt)} · {userNameOr(th.createdByUsername || th.byUsername)}</span>
                                  {esEliminado && <span className="text-[10px] text-neutral-600 ml-1">Anulado por {th.deletedByUsername || 'admin'}</span>}
                                  <span className="ml-auto text-neutral-500 text-xs">{isOpen ? '▲ Cerrar' : '▼ Ver detalle'}</span>
                                  {meRole === "admin" && !esEliminado && (
                                    <span
                                      role="button"
                                      onClick={e => { e.stopPropagation(); deleteThread(selectedFile.id, th.id); }}
                                      className="ml-1 px-2 py-0.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-[10px] text-neutral-400"
                                    >Eliminar</span>
                                  )}
                                </button>

                                {/* Detalle expandido */}
                                {isOpen && (
                                  <div className="px-3 pb-3 space-y-2 border-t border-orange-800/20">
                                    {/* Tabla de filas */}
                                    <div className="rounded-lg border border-orange-800/30 bg-orange-950/15 overflow-x-auto mt-2">
                                      <table className="w-full text-xs">
                                        <thead>
                                          <tr className="border-b border-orange-800/20 text-[10px] text-orange-400/60 uppercase tracking-wide">
                                            <th className="text-left px-2.5 py-1.5 font-medium w-14">Nº</th>
                                            <th className="text-left px-2.5 py-1.5 font-medium">Nombre / Cargo</th>
                                            <th className="text-left px-2.5 py-1.5 font-medium w-20">Acción</th>
                                            <th className="text-left px-2.5 py-1.5 font-medium">Detalle</th>
                                            <th className="text-left px-2.5 py-1.5 font-medium w-28">CC</th>
                                            <th className="text-left px-2.5 py-1.5 font-medium w-28">Estado</th>
                                            {(meRole === "sueldos" || meRole === "admin") && (
                                              <th className="text-left px-2.5 py-1.5 font-medium w-24">Acción</th>
                                            )}
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {rows.map((row: any) => {
                                            const accionColor = row.accion === 'alta' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-700/30' : row.accion === 'baja' ? 'bg-red-500/15 text-red-300 border-red-700/30' : 'bg-sky-500/15 text-sky-300 border-sky-700/30';
                                            const accionLabel = row.accion === 'alta' ? 'Alta' : row.accion === 'baja' ? 'Baja' : 'Modificar';
                                            let detalle: string[] = [];
                                            if (row.accion === 'modificar') {
                                              if (row.modCampo) detalle.push(row.modCampo);
                                              if (row.modDe || row.modA) detalle.push(`${row.modDe || '?'} → ${row.modA || '?'}`);
                                            } else {
                                              if (row.codigo) detalle.push(row.codigo);
                                              if (row.codDesc) detalle.push(row.codDesc);
                                              if (row.dhc) detalle.push(`D/H/C: ${row.dhc}`);
                                              if (row.actividad) detalle.push(`Act: ${row.actividad}`);
                                            }
                                            if (row.nota) detalle.push(`Nota: ${row.nota}`);
                                            return (
                                              <tr key={row.id} className="border-b border-orange-800/10 last:border-0 hover:bg-orange-900/10">
                                                <td className="px-2.5 py-2 font-mono text-neutral-300 align-top">{row.nro || '—'}</td>
                                                <td className="px-2.5 py-2 align-top">
                                                  <div className="text-neutral-200 font-medium">{row.nombre || '—'}</div>
                                                  {row.cargo && <div className="text-[10px] text-neutral-500 mt-0.5">{row.cargo}</div>}
                                                </td>
                                                <td className="px-2.5 py-2 align-top">
                                                  <span className={`inline-block px-1.5 py-0.5 rounded border text-[10px] font-medium ${accionColor}`}>{accionLabel}</span>
                                                </td>
                                                <td className="px-2.5 py-2 align-top text-neutral-400 text-[11px] leading-relaxed">
                                                  {detalle.length > 0 ? detalle.map((d, i) => <span key={i} className="block">{d}</span>) : '—'}
                                                </td>
                                                <td className="px-2.5 py-2 align-top text-neutral-400">{row.cc || '—'}</td>
                                                <td className="px-2.5 py-2 align-top">
                                                  {row.processed
                                                    ? <span className="text-[10px] text-emerald-400">✓ procesado<br/><span className="text-neutral-600">{userNameOr(row.processedByUsername)}</span></span>
                                                    : row.answered
                                                    ? <span className="text-[10px] text-sky-400">respondido<br/><span className="text-neutral-600">{userNameOr(row.answeredByUsername)}</span></span>
                                                    : <span className="text-[10px] text-amber-400">pendiente</span>
                                                  }
                                                </td>
                                                {(meRole === "sueldos" || meRole === "admin") && (
                                                  <td className="px-2.5 py-2 align-top">
                                                    {!row.processed && (
                                                      <button
                                                        onClick={() => markObservationProcessed(selectedFile.id, th.id, row.id)}
                                                        className="px-2 py-1 rounded-lg bg-emerald-800/50 hover:bg-emerald-700/60 border border-emerald-700/40 text-emerald-300 text-[10px] font-medium"
                                                      >
                                                        ✓ Procesar
                                                      </button>
                                                    )}
                                                  </td>
                                                )}
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>

                                    {/* Nota de Sueldos existente */}
                                    {th.answerText && (
                                      <div className="flex items-start gap-2 px-2.5 py-2 rounded-lg border border-emerald-800/30 bg-emerald-950/15">
                                        <span className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wide mt-0.5 shrink-0">Nota Sueldos</span>
                                        <span className="text-xs text-neutral-300 flex-1">{th.answerText}</span>
                                        <span className="text-[10px] text-neutral-600 shrink-0">{userNameOr(th.answeredByUsername)} · {formatDate(th.answeredAt)}</span>
                                      </div>
                                    )}

                                    {/* Confirmar + nota opcional (Sueldos) */}
                                    {!th.answered && (meRole === "sueldos" || meRole === "admin") && (
                                      <div className="flex items-end gap-2 pt-1">
                                        <AutoGrowTextarea
                                          value={(adjustReplyInputs[th.id] || "")}
                                          onChange={(v) => setAdjustReplyInputs((s: any) => ({ ...s, [th.id]: v }))}
                                          placeholder="Nota de Sueldos (opcional)…"
                                          className="flex-1 px-3 py-2 rounded-xl bg-neutral-800 outline-none text-sm min-h-[38px]"
                                        />
                                        <button
                                          onClick={() => {
                                            answerAdjustThread(selectedFile.id, th.id, adjustReplyInputs[th.id] || "");
                                            setAdjustReplyInputs((s: any) => ({ ...s, [th.id]: "" }));
                                          }}
                                          className="px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-sm text-white shrink-0"
                                        >
                                          Confirmar respuesta
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })() : (
                          /* ── DUDA: card normal ── */
                          <div
                          className={`rounded-xl border p-3 transition-all ${
                            esEliminado
                              ? 'border-neutral-800/40 bg-neutral-900/20 opacity-45'
                              : 'border-neutral-800 bg-neutral-900/40'
                          }`}
                          style={esEliminado ? { filter: 'grayscale(0.6)' } : undefined}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="text-sm flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span className={`font-medium ${esEliminado ? 'line-through text-neutral-500' : 'text-neutral-200'}`}>
                                💬 Duda
                              </span>
                              <span className="text-neutral-500 text-xs">{formatDate(th.createdAt)} · {userNameOr(th.createdByUsername || th.byUsername)}</span>
                              {esEliminado && (
                                <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-neutral-600 border border-neutral-700 rounded px-1">
                                  Anulado · {th.deletedByUsername || 'admin'} · {formatDate(th.deletedAt)}
                                </span>
                              )}
                            </div>
                            {!esEliminado && (
                              <div className="flex items-center gap-2">
                                {meRole === "sueldos" && (
                                  <button onClick={() => { setSelectedThreadId(th.id); setAddRowInputs((s: any) => ({ ...s, [th.id]: s?.[th.id] || blankAddRow() })); }} className="px-2 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs">
                                    + Agregar fila
                                  </button>
                                )}
                                {meRole === "admin" && (
                                  <button onClick={() => deleteThread(selectedFile.id, th.id)} className="px-2 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs text-neutral-300">
                                    Eliminar hilo
                                  </button>
                                )}
                              </div>
                            )}
                          </div>

                          {th.tipo !== "arreglo" && (
                            <div className="mt-3 overflow-x-auto">
                              <table className="min-w-full text-sm">
                                <thead>
                                  <tr className="text-neutral-400">
                                    <th className="text-left px-2 py-1">Nro Funcionario</th>
                                    <th className="text-left px-2 py-1">Nombre</th>
                                    <th className="text-left px-2 py-1">Duda</th>
                                    <th className="text-left px-2 py-1">Sector</th>
                                    <th className="text-left px-2 py-1">Centro de Costo</th>
                                    <th className="text-left px-2 py-1">Respuesta</th>
                                    <th className="text-left px-2 py-1">Procesamiento</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(th.rows || []).map((r: any) => {
                                    const key = `${th.id}:${r.id}`;
                                    return (
                                      <tr key={r.id} className="border-t border-neutral-800">
                                        <td className="px-2 py-2 align-top text-neutral-200">{r.nro}</td>
                                        <td className="px-2 py-2 align-top text-neutral-200">{r.nombre}</td>
                                        <td className="px-2 py-2 align-top text-neutral-200 whitespace-pre-wrap">
                                          {r.duda}
                                          {r.imageDataUrl && (
                                            <img src={r.imageDataUrl} alt="adjunto" className="mt-2 max-w-[200px] max-h-[150px] rounded-lg border border-neutral-700 cursor-pointer" onClick={() => window.open(r.imageDataUrl, '_blank')} />
                                          )}
                                        </td>
                                        <td className="px-2 py-2 align-top text-neutral-200">{r.sector}</td>
                                        <td className="px-2 py-2 align-top text-neutral-200">{r.cc}</td>

                                        <td className="px-2 py-2 align-top">
                                          {r.answered ? (
                                            <div>
                                              <div className="text-neutral-100 whitespace-pre-wrap">
                                                {r.answerText}
                                              </div>
                                              <div className="text-xs text-neutral-500 mt-1">
                                                Por: {userNameOr(r.answeredByUsername)} • {formatDate(r.answeredAt)}
                                              </div>
                                            </div>
                                          ) : meRole !== "sueldos" ? (
                                            <div className="flex items-center gap-2">
                                              <span className="text-neutral-500 text-sm">Pendiente</span>
                                              <button
                                                onClick={() => openReplyDialog(selectedFile.id, th.id, r.id)}
                                                className="px-2 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs h-[36px]"
                                              >
                                                Responder
                                              </button>
                                            </div>
                                          ) : (
                                            <span className="text-neutral-500 text-sm">
                                              Pendiente de respuesta
                                            </span>
                                          )}
                                        </td>

                                        <td className="px-2 py-2 align-top">
                                          {r.processed ? (
                                            <div>
                                              <span className="inline-flex items-center gap-2 px-2 py-0.5 rounded-lg text-xs bg-sky-500/20 text-sky-300 border border-sky-500/30">
                                                Procesada
                                              </span>
                                              <div className="text-xs text-neutral-500 mt-0.5">
                                                Por: {userNameOr(r.processedByUsername)} • {formatDate(r.processedAt)}
                                              </div>
                                            </div>
                                          ) : r.answered ? (
                                            (meRole === "sueldos" || meRole === "admin") ? (
                                              <button
                                                onClick={() => markObservationProcessed(selectedFile.id, th.id, r.id)}
                                                className="px-2 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs"
                                              >
                                                Marcar procesada
                                              </button>
                                            ) : (
                                              <span className="text-neutral-500 text-sm">Esperando Sueldos</span>
                                            )
                                          ) : (
                                            <span className="text-neutral-500 text-sm">Aún sin respuesta</span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>

                              {(meRole === "sueldos") && selectedThreadId === th.id && (
                                <div className="mt-3 rounded-xl border border-neutral-800 bg-neutral-950/30 p-3">
                                  <div className="grid md:grid-cols-5 gap-2">
                                    <input
                                      value={(addRowInputs[th.id]?.nro || "")}
                                      onChange={(e) => setAddRowInputs((s: any) => ({
                                        ...s,
                                        [th.id]: { ...(s[th.id] || {}), nro: e.target.value }
                                      }))}
                                      placeholder="Nro"
                                      className="px-3 py-2 rounded-xl bg-neutral-800 outline-none text-sm"
                                    />
                                    <input
                                      value={(addRowInputs[th.id]?.nombre || "")}
                                      onChange={(e) => setAddRowInputs((s: any) => ({
                                        ...s,
                                        [th.id]: { ...(s[th.id] || {}), nombre: e.target.value }
                                      }))}
                                      placeholder="Nombre"
                                      className="px-3 py-2 rounded-xl bg-neutral-800 outline-none text-sm"
                                    />
                                    <input
                                      value={(addRowInputs[th.id]?.duda || "")}
                                      onChange={(e) => setAddRowInputs((s: any) => ({
                                        ...s,
                                        [th.id]: { ...(s[th.id] || {}), duda: e.target.value }
                                      }))}
                                      placeholder="Duda"
                                      className="px-3 py-2 rounded-xl bg-neutral-800 outline-none text-sm md:col-span-2"
                                    />
                                    <input
                                      value={(addRowInputs[th.id]?.sector || "")}
                                      onChange={(e) => setAddRowInputs((s: any) => ({
                                        ...s,
                                        [th.id]: { ...(s[th.id] || {}), sector: e.target.value }
                                      }))}
                                      placeholder="Sector"
                                      className="px-3 py-2 rounded-xl bg-neutral-800 outline-none text-sm"
                                    />
                                    <input
                                      value={(addRowInputs[th.id]?.cc || "")}
                                      onChange={(e) => setAddRowInputs((s: any) => ({
                                        ...s,
                                        [th.id]: { ...(s[th.id] || {}), cc: e.target.value }
                                      }))}
                                      placeholder="Centro de costo"
                                      className="px-3 py-2 rounded-xl bg-neutral-800 outline-none text-sm"
                                    />
                                  </div>

                                  <div className="mt-2 flex justify-end gap-2">
                                    <button
                                      onClick={() => setSelectedThreadId(null)}
                                      className="px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-sm"
                                    >
                                      Cancelar
                                    </button>
                                    <button
                                      onClick={() => addRowToThread(selectedFile.id, th.id)}
                                      className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-sm"
                                    >
                                      Agregar
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                          )}
                        </div>
                      );
  })}
                    </div>
                  )}
                </section>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
