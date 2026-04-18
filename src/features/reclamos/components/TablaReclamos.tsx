// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import type { Reclamo, EstadoReclamo } from '../types/reclamo.types';
import type { FiltrosReclamo } from '../hooks/useReclamos';

interface Props {
  filtrados: Reclamo[];
  filtros: FiltrosReclamo;
  setFiltros: (f: FiltrosReclamo) => void;
  tiposReclamo: string[];
  liquidaciones: string[];
  meRole: string;
  onNuevo: () => void;
  onVer: (r: Reclamo) => void;
  onEliminar: (r: Reclamo) => void;
  onEliminarLote: (ids: string[]) => void;
  onCambiarEstado: (r: Reclamo, estado: EstadoReclamo, nota: string) => void;
  onExportarCSV: () => void;
}

// Días desde el último movimiento de estado
function diasSinMovimiento(r: Reclamo): number {
  const last = r.historialEstados.length > 0
    ? r.historialEstados[r.historialEstados.length - 1].fecha
    : (r.fechaEmision || r.createdAt || new Date().toISOString());
  return Math.floor((Date.now() - new Date(last).getTime()) / 86_400_000);
}

function AntiguedadBadge({ r }: { r: Reclamo }) {
  const activos = ['Emitido', 'En proceso'];
  if (!activos.includes(r.estado)) return null;
  const dias = diasSinMovimiento(r);
  const color = dias >= 30
    ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
    : dias >= 7
    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
  return (
    <span className={`ml-1.5 px-1.5 py-0.5 rounded border text-[10px] font-medium ${color}`} title={`${dias} días sin movimiento`}>
      {dias}d
    </span>
  );
}

const ESTADO_COLOR: Record<string, string> = {
  Emitido: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  'En proceso': 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  'Liquidado': 'bg-green-500/20 text-green-300 border-green-500/40',
  'Rechazado/Duda de reclamo': 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  Eliminado: 'bg-neutral-500/20 text-neutral-400 border-neutral-500/40',
};
const ESTADOS = ['Emitido', 'En proceso', 'Liquidado', 'Rechazado/Duda de reclamo', 'Eliminado'];
const IN = "rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm text-neutral-100 focus:outline-none focus:border-neutral-500";

// Determina si este rol puede eliminar este reclamo
function canEliminar(r: Reclamo, meRole: string): boolean {
  if (r.eliminado) return false;
  if (meRole === 'rrhh') return r.estado === 'Emitido';
  if (meRole === 'admin' || meRole === 'superadmin') return true;
  return false;
}

// rrhh puede re-emitir solo si el reclamo está Rechazado/Duda
function canReEmitir(r: Reclamo, meRole: string): boolean {
  if (r.eliminado) return false;
  return meRole === 'rrhh' && r.estado === 'Rechazado/Duda de reclamo';
}

export function TablaReclamos({
  filtrados, filtros, setFiltros, tiposReclamo, liquidaciones, meRole,
  onNuevo, onVer, onEliminar, onEliminarLote, onCambiarEstado, onExportarCSV,
}: Props) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [confirmReEmitirId, setConfirmReEmitirId] = useState<string | null>(null);
  const [filtrosOpen, setFiltrosOpen] = useState(false);
  const [mostrarEliminados, setMostrarEliminados] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelHeight, setPanelHeight] = useState(0);
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [confirmLote, setConfirmLote] = useState(false);

  useEffect(() => {
    if (panelRef.current) {
      setPanelHeight(panelRef.current.scrollHeight);
    }
  }, [filtrosOpen, tiposReclamo, liquidaciones]);

  function update(k: string, v: any) {
    if (k === 'mostrarEliminados') {
      setMostrarEliminados(v);
      // CRÍTICO: sincronizar con el hook para que filtrados incluya eliminados
      setFiltros({ ...filtros, mostrarEliminados: v });
      return;
    }
    setFiltros({ ...filtros, [k]: v });
    setSeleccionados(new Set());
  }

  // filtrados visibles aplicando eliminados local
  const visibles = mostrarEliminados ? filtrados : filtrados.filter(r => !r.eliminado);

  // Solo se pueden seleccionar reclamos que este rol puede eliminar
  const visiblesEliminables = visibles.filter(r => canEliminar(r, meRole));
  const todosSeleccionados = visiblesEliminables.length > 0 && visiblesEliminables.every(r => seleccionados.has(r.id));
  const algunoSeleccionado = visiblesEliminables.some(r => seleccionados.has(r.id));
  const cantSeleccionados = visiblesEliminables.filter(r => seleccionados.has(r.id)).length;

  function toggleSeleccion(id: string) {
    setSeleccionados(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleTodos() {
    if (todosSeleccionados) setSeleccionados(new Set());
    else setSeleccionados(new Set(visiblesEliminables.map(r => r.id)));
  }

  // cuenta de filtros activos para el badge
  const filtrosActivos = [
    filtros.busqueda, filtros.estado, filtros.tipo,
    filtros.liquidacion, filtros.paraLiquidacion,
    filtros.desde, filtros.hasta, mostrarEliminados,
  ].filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* ── Barra principal ── */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {/* Búsqueda siempre visible */}
          <input
            className={IN}
            placeholder="Buscar ticket, nombre, nro..."
            value={filtros.busqueda}
            onChange={e => update('busqueda', e.target.value)}
          />

          {/* Botón filtros */}
          <button
            type="button"
            onClick={() => setFiltrosOpen(o => !o)}
            style={{ padding: '6px 12px', position: 'relative' }}
            className={`rounded-xl border text-sm font-medium transition-all flex items-center gap-2 ${
              filtrosOpen
                ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
                : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-neutral-200 hover:border-neutral-500'
            }`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" d="M2 4h12M4 8h8M6 12h4" />
            </svg>
            Filtros
            {filtrosActivos > 0 && (
              <span
                className="flex items-center justify-center text-[9px] font-bold rounded-full"
                style={{ background: '#3b82f6', color: '#fff', width: 16, height: 16, lineHeight: 1 }}
              >
                {filtrosActivos}
              </span>
            )}
            <svg
              className="w-3 h-3 transition-transform duration-300"
              style={{ transform: filtrosOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
              viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.8"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M1 1l4 4 4-4" />
            </svg>
          </button>

          {/* Ver eliminados */}
          <label className="flex items-center gap-1.5 text-sm text-neutral-500 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={mostrarEliminados}
              onChange={e => update('mostrarEliminados', e.target.checked)}
              className="rounded"
              style={{ accentColor: '#3b82f6' }}
            />
            Ver eliminados
          </label>
        </div>

        <div className="flex gap-4">
          <button
            type="button"
            onClick={onExportarCSV}
            style={{ padding: '6px 12px' }}
            className="rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-sm text-neutral-300"
          >
            📊 CSV
          </button>
          <button
            type="button"
            onClick={onNuevo}
            className="nuevo-reclamo-btn rounded-xl text-sm text-white font-semibold transition-all"
            style={{ padding: '9px 22px', background: '#2563eb', boxShadow: '0 2px 8px #1d4ed833' }}
          >
            + Nuevo reclamo
          </button>
        </div>
      </div>

      {/* ── Panel de filtros colapsable ── */}
      <div
        style={{
          maxHeight: filtrosOpen ? `${panelHeight + 32}px` : '0px',
          opacity: filtrosOpen ? 1 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease',
        }}
      >
        <div
          ref={panelRef}
          className="rounded-2xl border border-blue-500/20 bg-neutral-900/80 p-4"
          style={{ background: 'linear-gradient(135deg, #0d1117 0%, #0a0f1a 100%)', borderColor: '#3b82f622' }}
        >
          <div className="flex flex-wrap gap-2 items-center">
            <select className={IN} value={filtros.estado} onChange={e => update('estado', e.target.value)}>
              <option value="">Todos los estados</option>
              {ESTADOS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className={IN} value={filtros.tipo} onChange={e => update('tipo', e.target.value)}>
              <option value="">Todos los tipos</option>
              {tiposReclamo.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select className={IN} value={filtros.liquidacion} onChange={e => update('liquidacion', e.target.value)}>
              <option value="">Liquidación origen</option>
              {liquidaciones.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <select className={IN} value={filtros.paraLiquidacion} onChange={e => update('paraLiquidacion', e.target.value)}>
              <option value="">Para liquidación</option>
              {liquidaciones.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <input type="date" className={IN} value={filtros.desde} onChange={e => update('desde', e.target.value)} title="Desde" />
            <input type="date" className={IN} value={filtros.hasta} onChange={e => update('hasta', e.target.value)} title="Hasta" />
            {filtrosActivos > 0 && (
              <button
                type="button"
                onClick={() => {
                  setFiltros({ ...filtros, estado: '', tipo: '', liquidacion: '', paraLiquidacion: '', desde: '', hasta: '', busqueda: '', mostrarEliminados: false });
                  setMostrarEliminados(false);
                }}
                style={{ padding: '6px 10px' }}
                className="rounded-xl border border-rose-900/40 text-xs text-rose-400 hover:bg-rose-900/20 transition-colors"
              >
                ✕ Limpiar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Barra acción en lote */}
      {cantSeleccionados > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10">
          <span className="text-sm font-medium text-rose-300">
            {cantSeleccionados} seleccionado{cantSeleccionados !== 1 ? 's' : ''}
          </span>
          <div className="flex-1" />
          {confirmLote ? (
            <>
              <span className="text-xs text-rose-400">¿Eliminar los {cantSeleccionados} reclamos?</span>
              <button type="button"
                onClick={() => { onEliminarLote([...seleccionados]); setSeleccionados(new Set()); setConfirmLote(false); }}
                style={{ padding: '5px 14px' }}
                className="rounded-xl bg-rose-700 hover:bg-rose-600 text-sm text-white font-medium transition-colors">
                Confirmar
              </button>
              <button type="button" onClick={() => setConfirmLote(false)}
                style={{ padding: '5px 10px' }}
                className="rounded-xl border border-neutral-700 bg-neutral-800 text-xs text-neutral-400 hover:text-neutral-200">
                No
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => setConfirmLote(true)}
                style={{ padding: '5px 14px' }}
                className="rounded-xl bg-rose-900/60 hover:bg-rose-900 text-sm text-rose-200 font-medium transition-colors">
                Eliminar seleccionados
              </button>
              <button type="button" onClick={() => setSeleccionados(new Set())}
                style={{ padding: '5px 10px' }}
                className="rounded-xl border border-neutral-700 bg-neutral-800 text-xs text-neutral-400 hover:text-neutral-200">
                ✕
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Tabla ── */}
      <div className="overflow-x-auto rounded-2xl border border-neutral-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-800 bg-neutral-900/80">
              <th className="px-3 py-2.5 w-8">
                <input type="checkbox" checked={todosSeleccionados}
                  ref={el => { if (el) el.indeterminate = algunoSeleccionado && !todosSeleccionados; }}
                  onChange={toggleTodos}
                  className="rounded cursor-pointer"
                  style={{ accentColor: '#3b82f6', width: '14px', height: '14px' }}
                  title="Seleccionar todos"
                />
              </th>
              <th className="text-left px-4 py-2.5 text-xs text-neutral-500 font-medium uppercase tracking-wide">Ticket</th>
              <th className="text-left px-4 py-2.5 text-xs text-neutral-500 font-medium uppercase tracking-wide">Nro. Func.</th>
              <th className="text-left px-4 py-2.5 text-xs text-neutral-500 font-medium uppercase tracking-wide">Nombre</th>
              <th className="text-left px-4 py-2.5 text-xs text-neutral-500 font-medium uppercase tracking-wide">Tipo</th>
              <th className="text-left px-4 py-2.5 text-xs text-neutral-500 font-medium uppercase tracking-wide">Estado</th>
              <th className="text-left px-4 py-2.5 text-xs text-neutral-500 font-medium uppercase tracking-wide">Fecha</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {visibles.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-neutral-500">Sin resultados.</td></tr>
            )}
            {visibles.map(r => (
              <tr key={r.id} className={`border-b border-neutral-800/50 transition-colors ${seleccionados.has(r.id) ? 'bg-blue-500/5' : 'hover:bg-neutral-800/30'} ${r.eliminado ? 'opacity-50' : ''}`}>
                <td className="px-3 py-2.5">
                  {canEliminar(r, meRole) && (
                    <input type="checkbox" checked={seleccionados.has(r.id)}
                      onChange={() => toggleSeleccion(r.id)}
                      className="rounded cursor-pointer"
                      style={{ accentColor: '#3b82f6', width: '14px', height: '14px' }}
                    />
                  )}
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-neutral-300">{r.ticket}</td>
                <td className="px-4 py-2.5 text-neutral-400">{r.nroFuncionario}</td>
                <td className="px-4 py-2.5 text-neutral-200">{r.nombreFuncionario}</td>
                <td className="px-4 py-2.5 text-neutral-400 text-xs">{r.tipoReclamo}</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center">
                    <span className={`px-2 py-0.5 rounded-lg border text-xs font-medium ${ESTADO_COLOR[r.estado] || ''}`}>{r.estado}</span>
                    <AntiguedadBadge r={r} />
                  </div>
                </td>
                <td className="px-4 py-2.5 text-neutral-500 text-xs">{(r.fechaEmision || r.createdAt || '').slice(0, 10).split('-').reverse().join('/')}</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => onVer(r)} className="px-2 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-300">Ver</button>

                    {/* Botón Re-emitir: solo rrhh cuando está Rechazado/Duda */}
                    {canReEmitir(r, meRole) && (
                      confirmReEmitirId === r.id ? (
                        <div className="flex gap-1">
                          <button onClick={() => { onCambiarEstado(r, 'Emitido', 'Re-emitido por RRHH'); setConfirmReEmitirId(null); }}
                            className="px-2 py-1 rounded-lg bg-blue-700/80 hover:bg-blue-600 text-xs text-blue-100">Confirmar</button>
                          <button onClick={() => setConfirmReEmitirId(null)}
                            className="px-2 py-1 rounded-lg bg-neutral-800 text-xs text-neutral-400">No</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmReEmitirId(r.id)}
                          className="px-2 py-1 rounded-lg bg-neutral-800 hover:bg-blue-900/50 text-xs text-neutral-400 hover:text-blue-300">
                          Re-emitir
                        </button>
                      )
                    )}

                    {/* Botón Eliminar: solo si este rol puede eliminar este reclamo */}
                    {canEliminar(r, meRole) && (
                      confirmId === r.id ? (
                        <div className="flex gap-1">
                          <button onClick={() => { onEliminar(r); setConfirmId(null); }} className="px-2 py-1 rounded-lg bg-rose-900/60 hover:bg-rose-900 text-xs text-rose-200">Confirmar</button>
                          <button onClick={() => setConfirmId(null)} className="px-2 py-1 rounded-lg bg-neutral-800 text-xs text-neutral-400">No</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmId(r.id)} className="px-2 py-1 rounded-lg bg-neutral-800 hover:bg-rose-900/50 text-xs text-neutral-400 hover:text-rose-300">Eliminar</button>
                      )
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-neutral-600">{visibles.length} reclamo{visibles.length !== 1 ? 's' : ''}</p>
    </div>
  );
}
