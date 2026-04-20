// @ts-nocheck
import React from "react";
import AutoGrowTextarea from "../../components/AutoGrowTextarea";
import { prettyBytes } from "../../lib/bytes";
import { formatDate } from "../../lib/time";
import { typeBadge, userNameOr } from "../shared/uiHelpers";
export function DetailModal({ detailOpen, setDetailOpen, selectedFile, setSelected, setSelectedThreadId, selectedThreadId, periodNameById, prettyBytes, formatDate, userNameOr, meRole, me, setNote, openReplyDialog, addRowToThread, addRowInputs, setAddRowInputs, blankAddRow, markObservationProcessed, deleteThread, adjustReplyInputs, setAdjustReplyInputs, answerAdjust, answerAdjustThread, replyInputs, setReplyInputs, answerObservation }: any) {
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
                        <div
                          key={th.id}
                          className={`rounded-xl border p-3 transition-all ${
                            esEliminado
                              ? 'border-neutral-800/40 bg-neutral-900/20 opacity-45'
                              : 'border-neutral-800 bg-neutral-900/40'
                          }`}
                          style={esEliminado ? { filter: 'grayscale(0.6)' } : undefined}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="text-sm">
                              <span className={`font-medium ${esEliminado ? 'line-through text-neutral-500' : 'text-neutral-200'}`}>
                                {th.tipo === "arreglo" ? "Arreglo (RRHH)" : "Duda (Sueldos)"}
                              </span>
                              <span className="text-neutral-500">
                                {" "}
                                • {formatDate(th.createdAt)}
                              </span>
                              <span className="text-neutral-600">
                                {" "}
                                • por {userNameOr(th.createdByUsername)}
                              </span>
                              {esEliminado && (
                                <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-neutral-600 border border-neutral-700 rounded px-1">
                                  Anulado · {th.deletedByUsername || 'admin'} · {formatDate(th.deletedAt)}
                                </span>
                              )}
                            </div>

                            {!esEliminado && th.tipo !== "arreglo" ? (
                              <div className="flex items-center gap-2">
                                {meRole === "sueldos" && (
                                  <button
                                  onClick={() => {
                                    setSelectedThreadId(th.id);
                                    setAddRowInputs((s: any) => ({
                                      ...s,
                                      [th.id]: s?.[th.id] || blankAddRow(),
                                    }));
                                  }}
                                  className="px-2 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs"
                                >
                                  + Agregar fila
                                </button>
                                )}

{meRole === "admin" && (
  <button
    onClick={() => deleteThread(selectedFile.id, th.id)}
    className="px-2 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs text-neutral-300"
    title="Solo Administrador"
  >
    Eliminar hilo
  </button>
)}

                              </div>
                            ) : !esEliminado ? (
                              <div className="flex items-center gap-2">
                                {meRole === "admin" && (
  <button
    onClick={() => deleteThread(selectedFile.id, th.id)}
    className="px-2 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs text-neutral-300"
    title="Solo Administrador"
  >
    Eliminar arreglo
  </button>
)}

                              </div>
                            ) : null}
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

                          {th.tipo === "arreglo" && (
                            <div className="mt-3 space-y-3">
                              {/* Encabezado */}
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-orange-400 bg-orange-900/40 border border-orange-700/40 px-2 py-0.5 rounded-full">
                                  Arreglo de Información
                                </span>
                                {(th.rows || []).every((r: any) => r.processed) ? (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-900/40 border border-emerald-700/40 text-emerald-300">Procesado</span>
                                ) : (th.rows || []).every((r: any) => r.answered) ? (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-900/40 border border-sky-700/40 text-sky-300">Respondido · pend. procesar</span>
                                ) : (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-900/40 border border-amber-700/40 text-amber-300">Pendiente</span>
                                )}
                                <span className="text-[10px] text-neutral-500 ml-auto">
                                  {userNameOr(th.byUsername || th.createdByUsername)} · {formatDate(th.createdAt)}
                                </span>
                              </div>

                              {/* Filas del arreglo */}
                              {(th.rows || []).length > 0 && (
                                <div className="rounded-xl border border-orange-700/30 bg-orange-950/20 overflow-hidden">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="border-b border-orange-700/20 text-orange-400/70">
                                        <th className="text-left px-3 py-2 font-medium">Nº</th>
                                        <th className="text-left px-3 py-2 font-medium">Nombre</th>
                                        <th className="text-left px-3 py-2 font-medium">Acción</th>
                                        <th className="text-left px-3 py-2 font-medium">Detalle</th>
                                        <th className="text-left px-3 py-2 font-medium">CC</th>
                                        <th className="text-left px-3 py-2 font-medium">Estado</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {(th.rows || []).map((row: any) => {
                                        const accionLabel = row.accion === 'alta' ? 'Alta' : row.accion === 'baja' ? 'Baja' : 'Modificar';
                                        const accionColor = row.accion === 'alta' ? 'text-emerald-400' : row.accion === 'baja' ? 'text-red-400' : 'text-sky-400';
                                        let detalle = '';
                                        if (row.accion === 'modificar') {
                                          detalle = [row.modCampo, row.modDe && row.modA ? `${row.modDe} → ${row.modA}` : ''].filter(Boolean).join(': ');
                                        } else {
                                          detalle = [row.codigo, row.codDesc, row.dhc && `D/H/C: ${row.dhc}`, row.actividad && `Act: ${row.actividad}`].filter(Boolean).join(' · ');
                                        }
                                        return (
                                          <tr key={row.id} className="border-b border-orange-700/10 last:border-0">
                                            <td className="px-3 py-2 font-mono text-neutral-300">{row.nro || '—'}</td>
                                            <td className="px-3 py-2 text-neutral-200 max-w-[120px] truncate" title={row.nombre}>{row.nombre || '—'}</td>
                                            <td className={`px-3 py-2 font-medium ${accionColor}`}>{accionLabel}</td>
                                            <td className="px-3 py-2 text-neutral-400 max-w-[180px]">
                                              <span className="block truncate" title={detalle || row.nota}>{detalle || row.nota || '—'}</span>
                                            </td>
                                            <td className="px-3 py-2 text-neutral-400">{row.cc || '—'}</td>
                                            <td className="px-3 py-2">
                                              {row.processed ? (
                                                <span className="text-emerald-400 text-[10px]">✓ procesado</span>
                                              ) : row.answered ? (
                                                <span className="text-sky-400 text-[10px]">respondido</span>
                                              ) : (
                                                <span className="text-amber-400 text-[10px]">pendiente</span>
                                              )}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}

                              {/* Respuesta de Sueldos (si existe) */}
                              {th.answered && th.answerText && (
                                <div className="rounded-xl border border-emerald-700/40 bg-emerald-950/25 p-3">
                                  <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 mb-1">Nota de Sueldos</div>
                                  <div className="text-sm text-neutral-100 whitespace-pre-wrap">{th.answerText}</div>
                                  <div className="text-[11px] text-neutral-500 mt-1">
                                    {userNameOr(th.answeredByUsername)} · {formatDate(th.answeredAt)}
                                  </div>
                                </div>
                              )}

                              {/* Caja de respuesta para Sueldos (si aún no respondió) */}
                              {!th.answered && (meRole === "sueldos" || meRole === "admin") && (
                                <div className="rounded-xl border border-neutral-800 bg-neutral-950/30 p-3">
                                  <label className="block text-xs text-neutral-400 mb-1">Nota de Sueldos (opcional)</label>
                                  <AutoGrowTextarea
                                    value={(adjustReplyInputs[th.id] || "")}
                                    onChange={(v) => setAdjustReplyInputs((s: any) => ({ ...s, [th.id]: v }))}
                                    placeholder="Agregar nota…"
                                    className="w-full px-3 py-2 rounded-xl bg-neutral-800 outline-none min-h-[60px]"
                                  />
                                  <div className="mt-2 flex justify-end">
                                    <button
                                      onClick={() => {
                                        const texto = adjustReplyInputs[th.id] || "";
                                        answerAdjustThread(selectedFile.id, th.id, texto);
                                        setAdjustReplyInputs((s: any) => ({ ...s, [th.id]: "" }));
                                      }}
                                      className="px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-sm text-white"
                                    >
                                      Confirmar respuesta
                                    </button>
                                  </div>
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
