// @ts-nocheck
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import type { Reclamo, EstadoReclamo } from '../types/reclamo.types';

interface Props {
  reclamos: Reclamo[];
  isSueldos: boolean;
  onVer: (r: Reclamo) => void;
  onCambiarEstado: (r: Reclamo, estado: EstadoReclamo, nota: string) => void;
}

const COLUMNAS: { estado: EstadoReclamo; label: string; color: string; bg: string; border: string }[] = [
  { estado: 'Emitido',                    label: 'Emitido',           color: 'text-blue-300',  bg: 'bg-blue-500/10',  border: 'border-blue-500/30' },
  { estado: 'En proceso',                 label: 'En proceso',        color: 'text-amber-300', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  { estado: 'Liquidado',                  label: 'Liquidado',         color: 'text-green-300', bg: 'bg-green-500/10', border: 'border-green-500/30' },
  { estado: 'Rechazado/Duda de reclamo',  label: 'Rechazado/Duda',   color: 'text-rose-300',  bg: 'bg-rose-500/10',  border: 'border-rose-500/30' },
];

const ESTADOS_SUELDOS: EstadoReclamo[] = ['En proceso', 'Liquidado', 'Rechazado/Duda de reclamo'];

const CAUSALES_RECHAZO = [
  'Fuera de plazo — el período ya fue cerrado',
  'Error en liquidación ya corregido en período siguiente',
  'Documentación insuficiente o incorrecta',
  'Reclamo duplicado — ya existe un ticket abierto',
  'No corresponde al área de Sueldos',
  'Monto reclamado no coincide con la liquidación',
];

function diasSinMovimiento(r: Reclamo): number {
  const last = r.historialEstados.length > 0
    ? r.historialEstados[r.historialEstados.length - 1].fecha
    : r.fechaEmision;
  return Math.floor((Date.now() - new Date(last).getTime()) / 86_400_000);
}

interface CambioPopupProps {
  reclamo: Reclamo;
  isSueldos: boolean;
  onConfirmar: (estado: EstadoReclamo, nota: string) => void;
  onCancelar: () => void;
}

function CambioPopup({ reclamo, isSueldos, onConfirmar, onCancelar }: CambioPopupProps) {
  const estados = isSueldos ? ESTADOS_SUELDOS : ['Emitido', 'En proceso', 'Procesado/Liquidado', 'Rechazado'] as EstadoReclamo[];
  const [estado, setEstado] = useState<EstadoReclamo>(estados[0]);
  const [nota, setNota] = useState('');

  function aplicarPlantilla(causal: string) {
    setNota(prev => prev ? `${prev}\n${causal}` : causal);
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="reclamo-modal w-full max-w-sm rounded-2xl border border-neutral-700 bg-neutral-900 shadow-2xl p-6 space-y-4">
        <div>
          <h3 className="text-base font-bold text-neutral-100">Cambiar estado</h3>
          <p className="text-xs text-neutral-500 mt-0.5">{reclamo.ticket} — {reclamo.nombreFuncionario}</p>
        </div>
        <div>
          <label className="block text-xs text-neutral-400 mb-1">Nuevo estado</label>
          <select className="w-full rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 focus:outline-none"
            value={estado} onChange={e => setEstado(e.target.value as EstadoReclamo)}>
            {estados.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        {estado === 'Rechazado/Duda de reclamo' && (
          <div>
            <p className="text-xs text-neutral-500 mb-1.5">Motivos frecuentes:</p>
            <div className="flex flex-wrap gap-1.5">
              {CAUSALES_RECHAZO.map(c => (
                <button key={c} type="button" onClick={() => aplicarPlantilla(c)}
                  style={{ padding: '3px 8px' }}
                  className="rounded-lg border border-rose-900/40 bg-rose-900/20 text-[11px] text-rose-300 hover:bg-rose-900/40 transition-colors text-left">
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}
        <div>
          <label className="block text-xs text-neutral-400 mb-1">{estado === 'Rechazado/Duda de reclamo' ? 'Motivo del rechazo / duda' : 'Nota (opcional)'}</label>
          <textarea className="w-full rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 focus:outline-none min-h-[64px] resize-none"
            value={nota} onChange={e => setNota(e.target.value)}
            placeholder={estado === 'Rechazado/Duda de reclamo' ? 'Explicar el motivo o duda...' : 'Aclaración...'} />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancelar} style={{ padding: '6px 14px' }}
            className="rounded-xl bg-neutral-800 hover:bg-neutral-700 text-sm text-neutral-300">Cancelar</button>
          <button type="button" onClick={() => onConfirmar(estado, nota)} style={{ padding: '6px 14px' }}
            className={`rounded-xl text-sm text-white font-medium ${estado === 'Rechazado/Duda de reclamo' ? 'bg-rose-700 hover:bg-rose-600' : 'bg-blue-600 hover:bg-blue-500'}`}>
            Confirmar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function KanbanReclamos({ reclamos, isSueldos, onVer, onCambiarEstado }: Props) {
  const [cambioTarget, setCambioTarget] = useState<Reclamo | null>(null);

  const activos = reclamos.filter(r => !r.eliminado);

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex gap-4 min-w-[700px]">
        {COLUMNAS.map(col => {
          const cards = activos.filter(r => r.estado === col.estado);
          return (
            <div key={col.estado} className="flex-1 min-w-[160px] space-y-2">
              {/* Header columna */}
              <div className={`flex items-center justify-between px-3 py-2 rounded-xl border ${col.border} ${col.bg}`}>
                <span className={`text-xs font-semibold uppercase tracking-wide ${col.color}`}>{col.label}</span>
                <span className={`text-sm font-bold tabular-nums ${col.color}`}>{cards.length}</span>
              </div>

              {/* Cards */}
              <div className="space-y-2">
                {cards.length === 0 && (
                  <div className="rounded-xl border border-neutral-800 border-dashed px-3 py-4 text-center text-xs text-neutral-700">
                    Sin reclamos
                  </div>
                )}
                {cards.map(r => {
                  const dias = diasSinMovimiento(r);
                  const edadColor = dias >= 30 ? 'text-rose-400' : dias >= 7 ? 'text-amber-400' : 'text-emerald-400';
                  return (
                    <div
                      key={r.id}
                      className="rounded-xl border border-neutral-800 bg-neutral-900/80 p-3 space-y-2 hover:border-neutral-600 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="font-mono text-[11px] text-neutral-400">{r.ticket}</span>
                        <span className={`text-[10px] font-medium ${edadColor}`} title={`${dias} días sin movimiento`}>{dias}d</span>
                      </div>
                      <p className="text-sm text-neutral-200 leading-snug truncate" title={r.nombreFuncionario}>{r.nombreFuncionario}</p>
                      <p className="text-[11px] text-neutral-500 truncate">{r.tipoReclamo}</p>
                      <div className="flex gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => onVer(r)}
                          style={{ padding: '3px 8px' }}
                          className="flex-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-[11px] text-neutral-300 transition-colors"
                        >
                          Ver
                        </button>
                        {isSueldos && (
                          <button
                            type="button"
                            onClick={() => setCambioTarget(r)}
                            style={{ padding: '3px 8px' }}
                            className="flex-1 rounded-lg bg-neutral-800 hover:bg-blue-900/60 text-[11px] text-neutral-300 hover:text-blue-300 transition-colors"
                          >
                            Estado
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {cambioTarget && (
        <CambioPopup
          reclamo={cambioTarget}
          isSueldos={isSueldos}
          onConfirmar={(estado, nota) => { onCambiarEstado(cambioTarget, estado, nota); setCambioTarget(null); }}
          onCancelar={() => setCambioTarget(null)}
        />
      )}
    </div>
  );
}
