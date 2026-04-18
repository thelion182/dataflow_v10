// @ts-nocheck
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Reclamo, EstadoReclamo } from '../types/reclamo.types';
import type { FiltrosReclamo } from '../hooks/useReclamos';

interface Props {
  filtrados: Reclamo[];
  filtros: FiltrosReclamo;
  setFiltros: (f: FiltrosReclamo) => void;
  tiposReclamo: string[];
  liquidaciones: string[];
  isSueldos: boolean;
  onVer: (r: Reclamo) => void;
  onCambiarEstado: (r: Reclamo, estado: EstadoReclamo, nota: string) => void;
  onCambiarEstadoLote: (ids: string[], estado: EstadoReclamo, nota: string) => void;
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
const ESTADOS_SUELDOS: EstadoReclamo[] = ['En proceso', 'Liquidado', 'Rechazado/Duda de reclamo'];
const ESTADOS_FILTRO = ['Emitido', 'En proceso', 'Liquidado', 'Rechazado/Duda de reclamo'];
const IN = "rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm text-neutral-100 focus:outline-none focus:border-neutral-500";

const CAUSALES_RECHAZO = [
  'Fuera de plazo — el período ya fue cerrado',
  'Error en liquidación ya corregido en período siguiente',
  'Documentación insuficiente o incorrecta',
  'Reclamo duplicado — ya existe un ticket abierto',
  'No corresponde al área de Sueldos',
  'Monto reclamado no coincide con la liquidación',
];

interface CambioEstadoPopupProps {
  titulo: string;
  subtitulo: string;
  onConfirmar: (estado: EstadoReclamo, nota: string) => void;
  onCancelar: () => void;
}

function CambioEstadoPopup({ titulo, subtitulo, onConfirmar, onCancelar }: CambioEstadoPopupProps) {
  const [estado, setEstado] = useState<EstadoReclamo>('En proceso');
  const [nota, setNota] = useState('');

  const esRechazo = estado === 'Rechazado/Duda de reclamo';

  function aplicarPlantilla(causal: string) {
    setNota(prev => prev ? `${prev}\n${causal}` : causal);
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="reclamo-modal w-full max-w-sm rounded-2xl border border-neutral-700 bg-neutral-900 shadow-2xl p-6 space-y-4">
        <div>
          <h3 className="text-base font-bold text-neutral-100">{titulo}</h3>
          <p className="text-xs text-neutral-500 mt-0.5">{subtitulo}</p>
        </div>
        <div>
          <label className="block text-xs text-neutral-400 mb-1">Nuevo estado</label>
          <select
            className="w-full rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 focus:outline-none"
            value={estado}
            onChange={e => setEstado(e.target.value as EstadoReclamo)}
          >
            {ESTADOS_SUELDOS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Plantillas de rechazo/duda */}
        {esRechazo && (
          <div>
            <p className="text-xs text-neutral-500 mb-1.5">Motivos frecuentes:</p>
            <div className="flex flex-wrap gap-1.5">
              {CAUSALES_RECHAZO.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => aplicarPlantilla(c)}
                  style={{ padding: '3px 8px' }}
                  className="rounded-lg border border-rose-900/40 bg-rose-900/20 text-[11px] text-rose-300 hover:bg-rose-900/40 transition-colors text-left"
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs text-neutral-400 mb-1">
            {esRechazo ? 'Motivo del rechazo / duda' : 'Nota (opcional)'}
          </label>
          <textarea
            className="w-full rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 focus:outline-none min-h-[64px] resize-none"
            value={nota}
            onChange={e => setNota(e.target.value)}
            placeholder={esRechazo ? 'Explicar el motivo del rechazo o duda...' : 'Aclaración para el funcionario...'}
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancelar}
            style={{ padding: '6px 14px' }}
            className="rounded-xl bg-neutral-800 hover:bg-neutral-700 text-sm text-neutral-300"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirmar(estado, nota)}
            style={{ padding: '6px 14px' }}
            className={`rounded-xl text-sm text-white font-medium ${esRechazo ? 'bg-rose-700 hover:bg-rose-600' : 'bg-blue-600 hover:bg-blue-500'}`}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function TablaReclamosView({
  filtrados, filtros, setFiltros, tiposReclamo, liquidaciones, isSueldos,
  onVer, onCambiarEstado, onCambiarEstadoLote, onExportarCSV,
}: Props) {
  const [cambioTarget, setCambioTarget] = useState<Reclamo | null>(null);
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [loteOpen, setLoteOpen] = useState(false);
  const [filtrosOpen, setFiltrosOpen] = useState(false);
  // Ver eliminados: empieza en false — se activa con el checkbox
  const [mostrarEliminados, setMostrarEliminados] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelHeight, setPanelHeight] = useState(0);

  useEffect(() => {
    if (panelRef.current) setPanelHeight(panelRef.current.scrollHeight);
  }, [filtrosOpen, tiposReclamo, liquidaciones]);

  const visible = useMemo(
    () => mostrarEliminados ? filtrados : filtrados.filter(r => !r.eliminado),
    [filtrados, mostrarEliminados]
  );

  function update(k: string, v: any) {
    setFiltros({ ...filtros, [k]: v });
    setSeleccionados(new Set());
  }

  function toggleMostrarEliminados(v: boolean) {
    setMostrarEliminados(v);
    // CRÍTICO: sincronizar con el hook para que filtrados incluya eliminados
    setFiltros({ ...filtros, mostrarEliminados: v });
    setSeleccionados(new Set());
  }

  const filtrosActivos = [
    filtros.busqueda, filtros.estado, filtros.tipo,
    filtros.liquidacion, filtros.paraLiquidacion,
    filtros.desde, filtros.hasta,
  ].filter(Boolean).length;

  function toggleSeleccion(id: string) {
    setSeleccionados(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const todosSeleccionados = visible.length > 0 && visible.every(r => seleccionados.has(r.id));
  const algunoSeleccionado = visible.some(r => seleccionados.has(r.id));

  function toggleTodos() {
    if (todosSeleccionados) {
      setSeleccionados(new Set());
    } else {
      setSeleccionados(new Set(visible.map(r => r.id)));
    }
  }

  const cantSeleccionados = visible.filter(r => seleccionados.has(r.id)).length;

  return (
    <div className="space-y-4">
      {/* ── Barra principal ── */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <input className={IN} placeholder="Buscar ticket, nombre, nro..." value={filtros.busqueda} onChange={e => update('busqueda', e.target.value)} />

          {/* Botón filtros */}
          <button
            type="button"
            onClick={() => setFiltrosOpen(o => !o)}
            style={{ padding: '6px 12px' }}
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
              <span className="flex items-center justify-center text-[9px] font-bold rounded-full"
                style={{ background: '#3b82f6', color: '#fff', width: 16, height: 16 }}>
                {filtrosActivos}
              </span>
            )}
            <svg className="w-3 h-3 transition-transform duration-300"
              style={{ transform: filtrosOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
              viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M1 1l4 4 4-4" />
            </svg>
          </button>

          {/* Ver eliminados */}
          <label className="flex items-center gap-1.5 text-sm text-neutral-500 cursor-pointer select-none">
            <input type="checkbox" checked={mostrarEliminados}
              onChange={e => toggleMostrarEliminados(e.target.checked)}
              className="rounded" style={{ accentColor: '#3b82f6' }} />
            Ver eliminados
          </label>
        </div>

        <button type="button" onClick={onExportarCSV}
          style={{ padding: '6px 12px' }}
          className="rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-sm text-neutral-300">
          📊 CSV
        </button>
      </div>

      {/* ── Panel de filtros colapsable ── */}
      <div style={{
        maxHeight: filtrosOpen ? `${panelHeight + 32}px` : '0px',
        opacity: filtrosOpen ? 1 : 0,
        overflow: 'hidden',
        transition: 'max-height 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease',
      }}>
        <div ref={panelRef} className="rounded-2xl p-4"
          style={{ background: 'linear-gradient(135deg, #0d1117 0%, #0a0f1a 100%)', border: '1px solid #3b82f622' }}>
          <div className="flex flex-wrap gap-2 items-center">
            <select className={IN} value={filtros.estado} onChange={e => update('estado', e.target.value)}>
              <option value="">Todos los estados</option>
              {ESTADOS_FILTRO.map(s => <option key={s} value={s}>{s}</option>)}
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
            <input type="date" className={IN} value={filtros.desde} onChange={e => update('desde', e.target.value)} />
            <input type="date" className={IN} value={filtros.hasta} onChange={e => update('hasta', e.target.value)} />
            {filtrosActivos > 0 && (
              <button type="button"
                onClick={() => { setFiltros({ ...filtros, estado: '', tipo: '', liquidacion: '', paraLiquidacion: '', desde: '', hasta: '', busqueda: '' }); setSeleccionados(new Set()); }}
                style={{ padding: '6px 10px' }}
                className="rounded-xl border border-rose-900/40 text-xs text-rose-400 hover:bg-rose-900/20 transition-colors">
                ✕ Limpiar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Barra de acción en lote */}
      {cantSeleccionados > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-blue-500/40 bg-blue-500/10">
          <span className="text-sm font-medium text-blue-300">
            {cantSeleccionados} seleccionado{cantSeleccionados !== 1 ? 's' : ''}
          </span>
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => setLoteOpen(true)}
            style={{ padding: '5px 14px' }}
            className="rounded-xl bg-blue-600 hover:bg-blue-500 text-sm text-white font-medium transition-colors"
          >
            Cambiar estado en lote
          </button>
          <button
            type="button"
            onClick={() => setSeleccionados(new Set())}
            style={{ padding: '5px 10px' }}
            className="rounded-xl border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {/* Tabla */}
      <div className="overflow-x-auto rounded-2xl border border-neutral-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-800 bg-neutral-900/80">
              <th className="px-3 py-2.5 w-8">
                <input
                  type="checkbox"
                  checked={todosSeleccionados}
                  ref={el => { if (el) el.indeterminate = algunoSeleccionado && !todosSeleccionados; }}
                  onChange={toggleTodos}
                  className="rounded border-neutral-600 bg-neutral-800 cursor-pointer"
                  title="Seleccionar todos"
                  style={{ accentColor: '#3b82f6', width: '14px', height: '14px' }}
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
            {visible.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-neutral-500">Sin resultados.</td></tr>
            )}
            {visible.map(r => {
              const esAnulado = r.eliminado;
              return (
                <tr
                  key={r.id}
                  className={`border-b transition-colors ${
                    esAnulado
                      ? 'border-neutral-800/30 bg-neutral-950/60 pointer-events-none select-none'
                      : seleccionados.has(r.id)
                        ? 'border-neutral-800/50 bg-blue-500/5'
                        : 'border-neutral-800/50 hover:bg-neutral-800/30'
                  }`}
                  style={esAnulado ? { opacity: 0.35, filter: 'grayscale(0.8)' } : undefined}
                >
                  <td className="px-3 py-2.5">
                    {!esAnulado && (
                      <input
                        type="checkbox"
                        checked={seleccionados.has(r.id)}
                        onChange={() => toggleSeleccion(r.id)}
                        className="rounded cursor-pointer"
                        style={{ accentColor: '#3b82f6', width: '14px', height: '14px' }}
                      />
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`font-mono text-xs ${esAnulado ? 'line-through text-neutral-600' : 'text-neutral-300'}`}>
                      {r.ticket}
                    </span>
                    {esAnulado && (
                      <span className="ml-2 text-[9px] font-bold tracking-widest text-neutral-600 uppercase border border-neutral-700 rounded px-1 py-0.5">ANULADO</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-neutral-600 text-xs">{r.nroFuncionario}</td>
                  <td className="px-4 py-2.5">
                    <span className={esAnulado ? 'line-through text-neutral-600' : 'text-neutral-200'}>
                      {r.nombreFuncionario}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-neutral-600 text-xs">{r.tipoReclamo}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center">
                      <span className={`px-2 py-0.5 rounded-lg border text-xs font-medium ${esAnulado ? 'bg-neutral-800/60 text-neutral-600 border-neutral-700/40' : ESTADO_COLOR[r.estado] || ''}`}>
                        {esAnulado ? 'Anulado' : r.estado}
                      </span>
                      {!esAnulado && <AntiguedadBadge r={r} />}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-neutral-600 text-xs">{(r.fechaEmision || r.createdAt || '').slice(0, 10).split('-').reverse().join('/')}</td>
                  <td className="px-4 py-2.5">
                    {!esAnulado && (
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          type="button"
                          onClick={() => onVer(r)}
                          style={{ padding: '4px 8px' }}
                          className="rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-300"
                        >
                          Ver
                        </button>
                        <button
                          type="button"
                          onClick={() => setCambioTarget(r)}
                          style={{ padding: '4px 8px' }}
                          className="rounded-lg bg-neutral-800 hover:bg-blue-900/60 text-xs text-neutral-300 hover:text-blue-300"
                        >
                          Estado
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-neutral-600">{visible.length} reclamo{visible.length !== 1 ? 's' : ''}</p>

      {/* Popup cambio individual */}
      {cambioTarget && (
        <CambioEstadoPopup
          titulo="Cambiar estado"
          subtitulo={`${cambioTarget.ticket} — ${cambioTarget.nombreFuncionario}`}
          onConfirmar={(estado, nota) => {
            onCambiarEstado(cambioTarget, estado, nota);
            setCambioTarget(null);
            setSeleccionados(prev => { const next = new Set(prev); next.delete(cambioTarget.id); return next; });
          }}
          onCancelar={() => setCambioTarget(null)}
        />
      )}

      {/* Popup cambio en lote */}
      {loteOpen && (
        <CambioEstadoPopup
          titulo={`Cambiar estado — ${cantSeleccionados} reclamo${cantSeleccionados !== 1 ? 's' : ''}`}
          subtitulo="Se aplicará el mismo estado y nota a todos los seleccionados."
          onConfirmar={(estado, nota) => {
            const ids = visible.filter(r => seleccionados.has(r.id)).map(r => r.id);
            onCambiarEstadoLote(ids, estado, nota);
            setSeleccionados(new Set());
            setLoteOpen(false);
          }}
          onCancelar={() => setLoteOpen(false)}
        />
      )}
    </div>
  );
}
