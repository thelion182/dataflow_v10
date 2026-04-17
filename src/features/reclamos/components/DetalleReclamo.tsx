// @ts-nocheck
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import type { Reclamo, NotaInterna } from '../types/reclamo.types';
import { uuid } from '../../../lib/ids';

interface Props {
  reclamo: Reclamo;
  meId: string;
  meNombre: string;
  onAgregarNota: (reclamoId: string, nota: NotaInterna) => void;
  onClose: () => void;
}

const ESTADO_COLOR: Record<string, string> = {
  Emitido: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  'En proceso': 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  'Liquidado': 'bg-green-500/20 text-green-300 border-green-500/40',
  'Rechazado/Duda de reclamo': 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  Eliminado: 'bg-neutral-500/20 text-neutral-400 border-neutral-500/40',
};

function EstadoBadge({ estado }: { estado: string }) {
  return (
    <span className={`px-2 py-0.5 rounded-lg border text-xs font-medium ${ESTADO_COLOR[estado] || 'bg-neutral-700 text-neutral-300'}`}>
      {estado}
    </span>
  );
}

function formatFechaHora(iso: string) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    const fecha = iso.slice(0, 10).split('-').reverse().join('/');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${fecha} ${hh}:${mm}`;
  } catch {
    return iso.slice(0, 10).split('-').reverse().join('/');
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function iconoMime(tipo: string): string {
  if (tipo.startsWith('image/')) return '🖼️';
  if (tipo === 'application/pdf') return '📄';
  if (tipo.includes('word') || tipo.includes('document')) return '📝';
  if (tipo.includes('excel') || tipo.includes('spreadsheet') || tipo.includes('sheet')) return '📊';
  if (tipo === 'text/csv') return '📊';
  return '📎';
}

export function DetalleReclamo({ reclamo, meId, meNombre, onAgregarNota, onClose }: Props) {
  const [notifExpandida, setNotifExpandida] = useState<number | null>(null);
  const [nuevaNota, setNuevaNota] = useState('');
  const [guardandoNota, setGuardandoNota] = useState(false);

  function handleGuardarNota() {
    const texto = nuevaNota.trim();
    if (!texto) return;
    const nota: NotaInterna = {
      id: uuid(),
      texto,
      autorId: meId,
      autorNombre: meNombre,
      fecha: new Date().toISOString(),
    };
    onAgregarNota(reclamo.id, nota);
    setNuevaNota('');
  }

  const adjuntos = reclamo.adjuntos || [];

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="reclamo-modal w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-neutral-700 bg-neutral-900 shadow-2xl">
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
          <div>
            <p className="text-xs text-neutral-500 uppercase tracking-wide">Detalle de reclamo</p>
            <h2 className="text-lg font-bold text-neutral-100">{reclamo.ticket}</h2>
          </div>
          <div className="flex items-center gap-3">
            <EstadoBadge estado={reclamo.estado} />
            <button type="button" onClick={onClose} style={{ padding: '6px 10px' }} className="rounded-xl hover:bg-neutral-800 text-neutral-400 hover:text-white">✕</button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {/* Datos del funcionario */}
          <section>
            <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wide mb-3">Datos del funcionario</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div><span className="text-neutral-500">Nro. Funcionario:</span> <span className="text-neutral-200">{reclamo.nroFuncionario}</span></div>
              <div><span className="text-neutral-500">Nombre:</span> <span className="text-neutral-200">{reclamo.nombreFuncionario}</span></div>
              <div><span className="text-neutral-500">Email:</span> <span className="text-neutral-200">{reclamo.emailFuncionario || '—'}</span></div>
              <div><span className="text-neutral-500">Cargo:</span> <span className="text-neutral-200">{reclamo.cargo || '—'}</span></div>
              <div><span className="text-neutral-500">Centro de costo:</span> <span className="text-neutral-200">{reclamo.centroCosto || '—'}</span></div>
              <div><span className="text-neutral-500">Liquidación origen:</span> <span className="text-neutral-200">{reclamo.liquidacion || '—'}</span></div>
              {reclamo.paraLiquidacion && (
                <div className="col-span-2">
                  <span className="text-neutral-500">Para liquidación:</span>{' '}
                  <span className="text-amber-300 font-medium">{reclamo.paraLiquidacion}</span>
                </div>
              )}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wide mb-3">Reclamo</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm mb-3">
              <div><span className="text-neutral-500">Tipo:</span> <span className="text-neutral-200">{reclamo.tipoReclamo || '—'}</span></div>
              <div><span className="text-neutral-500">Causal:</span> <span className="text-neutral-200">{reclamo.causal || '—'}</span></div>
              <div><span className="text-neutral-500">Emisor:</span> <span className="text-neutral-200">{reclamo.emisorNombre}</span></div>
              <div><span className="text-neutral-500">Fecha emisión:</span> <span className="text-neutral-200">{formatFechaHora(reclamo.fechaEmision)}</span></div>
            </div>
            <p className="text-sm text-neutral-400 mb-1">Descripción:</p>
            <p className="text-sm text-neutral-200 bg-neutral-800/60 rounded-xl p-3 whitespace-pre-wrap">{reclamo.descripcion}</p>
          </section>

          {/* Adjuntos */}
          {adjuntos.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wide mb-3">
                Adjuntos <span className="text-neutral-600 font-normal normal-case tracking-normal text-xs">({adjuntos.length})</span>
              </h3>
              <div className="space-y-1.5">
                {adjuntos.map(a => (
                  <div key={a.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-neutral-800 bg-neutral-800/40">
                    <span className="text-lg shrink-0">{iconoMime(a.tipo)}</span>
                    <span className="flex-1 text-sm text-neutral-200 truncate min-w-0">{a.nombre}</span>
                    <span className="text-xs text-neutral-500 shrink-0">{formatBytes(a.tamaño)}</span>
                    <a
                      href={a.datos}
                      download={a.nombre}
                      style={{ padding: '4px 10px' }}
                      className="rounded-lg bg-neutral-700 hover:bg-neutral-600 text-xs text-neutral-200 transition-colors shrink-0"
                    >
                      Descargar
                    </a>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Historial de estados */}
          <section>
            <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wide mb-3">Historial de estados</h3>
            <div className="space-y-2">
              {reclamo.historialEstados.map((h, i) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-neutral-500 shrink-0 mt-1.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <EstadoBadge estado={h.estado} />
                      <span className="text-neutral-500 text-xs">{formatFechaHora(h.fecha)}</span>
                      <span className="text-neutral-400">{h.usuarioNombre}</span>
                    </div>
                    {h.nota && <p className="text-neutral-500 mt-0.5 text-xs">{h.nota}</p>}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Notas internas */}
          <section>
            <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wide mb-3 flex items-center gap-2">
              Notas internas
              <span className="text-[10px] font-normal text-neutral-600 normal-case tracking-normal border border-neutral-700 rounded px-1.5 py-0.5">Solo visible para RRHH y Sueldos</span>
            </h3>
            <div className="space-y-2 mb-3">
              {(reclamo.notasInternas || []).length === 0 && (
                <p className="text-xs text-neutral-600 italic">Sin notas internas aún.</p>
              )}
              {(reclamo.notasInternas || []).map((n) => (
                <div key={n.id} className="rounded-xl border border-neutral-800 bg-neutral-800/40 px-4 py-3">
                  <p className="text-sm text-neutral-200 whitespace-pre-wrap">{n.texto}</p>
                  <p className="text-[11px] text-neutral-500 mt-1.5">
                    <span className="font-medium text-neutral-400">{n.autorNombre}</span>
                    {' · '}{formatFechaHora(n.fecha)}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex gap-2 items-end">
              <textarea
                className="flex-1 rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-neutral-500 min-h-[60px] resize-none placeholder-neutral-600"
                placeholder="Agregar nota interna..."
                value={nuevaNota}
                onChange={e => setNuevaNota(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleGuardarNota(); }}
              />
              <button
                type="button"
                onClick={handleGuardarNota}
                disabled={!nuevaNota.trim()}
                style={{ padding: '8px 14px' }}
                className="rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm text-white font-medium shrink-0"
              >
                Agregar
              </button>
            </div>
            <p className="text-[10px] text-neutral-700 mt-1">Ctrl+Enter para guardar</p>
          </section>

          {/* Notificaciones */}
          {reclamo.notificaciones.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wide mb-3">
                Notificaciones ({reclamo.notificaciones.length})
              </h3>
              <div className="space-y-2">
                {reclamo.notificaciones.map((n, i) => (
                  <div key={i} className="rounded-xl border border-neutral-800 bg-neutral-800/40 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setNotifExpandida(notifExpandida === i ? null : i)}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-neutral-800/60"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="text-neutral-400 shrink-0">{n.tipo === 'email' ? '✉️' : '💬'}</span>
                        <span className="text-neutral-300 truncate">{n.asunto}</span>
                      </span>
                      <span className="text-neutral-500 text-xs shrink-0 ml-3 tabular-nums">
                        {formatFechaHora(n.fecha)} {notifExpandida === i ? '▲' : '▼'}
                      </span>
                    </button>
                    {notifExpandida === i && (
                      <div className="px-4 pb-3 border-t border-neutral-800">
                        <p className="text-xs text-neutral-500 mb-2 pt-2">Para: <span className="text-neutral-400">{n.destinatario}</span></p>
                        <div
                          className="text-xs bg-white text-black rounded-lg overflow-hidden max-h-64 overflow-y-auto"
                          dangerouslySetInnerHTML={{ __html: n.cuerpo }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="px-6 py-4 border-t border-neutral-800 flex justify-end">
          <button type="button" onClick={onClose} style={{ padding: '8px 16px' }} className="rounded-xl bg-neutral-800 hover:bg-neutral-700 text-sm text-neutral-200">
            Cerrar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
