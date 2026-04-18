// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { cls } from '../../lib/cls';

interface ObsRow {
  id: string;
  nro?: string;
  nombre?: string;
  duda?: string;
  nota?: string;
  sector?: string;
  cc?: string;
  answered?: boolean;
  processed?: boolean;
  _tipo?: string;   // 'duda' | 'arreglo'
  _fileId?: string;
  _fileName?: string;
  _threadId?: string;
}

interface Props {
  files: any[];                  // archivos del período
  meId: string;
  meNombre: string;
  onProcess: (rows: { fileId: string; threadId: string; rowId: string }[], byId: string, byName: string) => Promise<void>;
  onClose: () => void;
}

export function ProcesarDudasModal({ files, meId, meNombre, onProcess, onClose }: Props) {
  const [nroDesde, setNroDesde] = useState('');
  const [nroHasta, setNroHasta] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<'respondidas' | 'arreglos'>('respondidas');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [processed, setProcessed] = useState(0);

  // Recolectar todas las filas procesables de todos los archivos
  const allRows = useMemo<ObsRow[]>(() => {
    const rows: ObsRow[] = [];
    for (const file of files) {
      const obs = file.observations || [];
      for (const thread of obs) {
        if (thread.deleted) continue;
        for (const row of (thread.rows || [])) {
          // Sueldos solo puede procesar:
          // - dudas respondidas (answered=true, processed=false)
          // - arreglos respondidos (tipo=arreglo, answered=true, processed=false)
          if (!row.answered || row.processed) continue;
          const tipo = thread.tipo || 'duda';
          rows.push({
            ...row,
            _tipo: tipo,
            _fileId: file.id,
            _fileName: file.name,
            _threadId: thread.id,
          });
        }
      }
    }
    return rows;
  }, [files]);

  // Filtrar según parámetros
  const filtered = useMemo<ObsRow[]>(() => {
    return allRows.filter(r => {
      // Tipo
      if (tipoFiltro === 'respondidas' && r._tipo !== 'duda') return false;
      if (tipoFiltro === 'arreglos' && r._tipo !== 'arreglo') return false;

      // Rango de nro funcionario
      const nro = parseInt(r.nro || '0', 10);
      if (nroDesde && !isNaN(parseInt(nroDesde))) {
        if (nro < parseInt(nroDesde)) return false;
      }
      if (nroHasta && !isNaN(parseInt(nroHasta))) {
        if (nro > parseInt(nroHasta)) return false;
      }
      return true;
    });
  }, [allRows, tipoFiltro, nroDesde, nroHasta]);

  function toggleAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(r => r.id)));
    }
  }

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const selectedRows = useMemo(() => filtered.filter(r => selected.has(r.id)), [filtered, selected]);

  async function handleConfirm() {
    setLoading(true);
    const toProcess = selectedRows.map(r => ({
      fileId: r._fileId,
      threadId: r._threadId,
      rowId: r.id,
    }));
    await onProcess(toProcess, meId, meNombre);
    setProcessed(toProcess.length);
    setLoading(false);
    setDone(true);
  }

  if (done) {
    return createPortal(
      <div className="fixed inset-0 z-[200] flex items-center justify-center">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
        <div className="relative z-10 w-full max-w-md bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl p-8 text-center space-y-4">
          <div className="text-5xl">✅</div>
          <h2 className="text-xl font-bold text-emerald-400">Procesamiento completado</h2>
          <p className="text-neutral-300">{processed} {processed === 1 ? 'registro procesado' : 'registros procesados'} correctamente.</p>
          <p className="text-xs text-neutral-500">Registrado por: {meNombre}</p>
          <button onClick={onClose} className="mt-2 px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium">
            Cerrar
          </button>
        </div>
      </div>,
      document.body
    );
  }

  if (confirming) {
    return createPortal(
      <div className="fixed inset-0 z-[200] flex items-center justify-center">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !loading && setConfirming(false)} />
        <div className="relative z-10 w-full max-w-md bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-neutral-100">Confirmar procesamiento</h2>
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 space-y-1">
            <p className="text-sm text-amber-300 font-medium">
              Se van a procesar <span className="font-bold">{selectedRows.length}</span> {selectedRows.length === 1 ? 'registro' : 'registros'}.
            </p>
            <p className="text-xs text-amber-400/70">Esta acción queda registrada con tu usuario. No se puede deshacer.</p>
          </div>
          {/* Preview */}
          <div className="max-h-48 overflow-y-auto space-y-1">
            {selectedRows.slice(0, 20).map(r => (
              <div key={r.id} className="flex items-center gap-2 text-xs px-3 py-1.5 bg-neutral-800 rounded-lg">
                <span className="text-neutral-400 font-mono w-12 flex-shrink-0">#{r.nro || '—'}</span>
                <span className="text-neutral-200 truncate">{r.nombre || r.duda || r.nota || '—'}</span>
                <span className={cls('ml-auto px-1.5 py-0.5 rounded text-[10px] flex-shrink-0',
                  r._tipo === 'arreglo' ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'
                )}>{r._tipo}</span>
              </div>
            ))}
            {selectedRows.length > 20 && (
              <p className="text-xs text-neutral-500 text-center">... y {selectedRows.length - 20} más</p>
            )}
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setConfirming(false)}
              disabled={loading}
              className="flex-1 py-2 rounded-xl bg-neutral-800 text-neutral-300 hover:bg-neutral-700 text-sm disabled:opacity-50"
            >
              Volver
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <><span className="animate-spin">⏳</span> Procesando...</>
              ) : 'Confirmar procesamiento'}
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
          <div>
            <h2 className="text-lg font-semibold text-neutral-100">Procesar dudas y arreglos</h2>
            <p className="text-xs text-neutral-500 mt-0.5">Solo se muestran registros respondidos pendientes de procesar</p>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-200 text-2xl leading-none">×</button>
        </div>

        {/* Filtros */}
        <div className="px-6 py-4 border-b border-neutral-800 flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-neutral-400">Tipo</label>
            <div className="flex gap-1">
              {(['respondidas', 'arreglos'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => { setTipoFiltro(t); setSelected(new Set()); }}
                  className={cls(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                    tipoFiltro === t ? 'bg-neutral-600 text-neutral-100' : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200'
                  )}
                >
                  {t === 'respondidas' ? '💬 Dudas respondidas' : '🔧 Arreglos respondidos'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-neutral-400">Nº funcionario desde</label>
            <input
              value={nroDesde}
              onChange={e => { setNroDesde(e.target.value); setSelected(new Set()); }}
              placeholder="0"
              className="w-24 px-3 py-1.5 rounded-lg bg-neutral-800 text-neutral-200 text-sm outline-none"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-neutral-400">hasta</label>
            <input
              value={nroHasta}
              onChange={e => { setNroHasta(e.target.value); setSelected(new Set()); }}
              placeholder="9999"
              className="w-24 px-3 py-1.5 rounded-lg bg-neutral-800 text-neutral-200 text-sm outline-none"
            />
          </div>
          <div className="ml-auto flex items-end">
            <span className="text-sm text-neutral-400">
              <span className="text-neutral-200 font-semibold">{filtered.length}</span> registros encontrados
            </span>
          </div>
        </div>

        {/* Tabla */}
        <div className="flex-1 overflow-y-auto px-6 py-3">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-neutral-500">
              No hay registros que coincidan con los filtros.
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-neutral-400 border-b border-neutral-800">
                  <th className="py-2 pr-3 text-left w-8">
                    <input
                      type="checkbox"
                      checked={selected.size === filtered.length && filtered.length > 0}
                      onChange={toggleAll}
                      className="accent-emerald-500"
                    />
                  </th>
                  <th className="py-2 pr-3 text-left">Nº</th>
                  <th className="py-2 pr-3 text-left">Nombre</th>
                  <th className="py-2 pr-3 text-left">Sector / CC</th>
                  <th className="py-2 pr-3 text-left">Duda / Nota</th>
                  <th className="py-2 pr-3 text-left">Archivo</th>
                  <th className="py-2 text-left">Tipo</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr
                    key={r.id}
                    onClick={() => toggle(r.id)}
                    className={cls(
                      'border-b border-neutral-800/50 cursor-pointer hover:bg-neutral-800/40 transition-colors',
                      selected.has(r.id) && 'bg-emerald-500/10'
                    )}
                  >
                    <td className="py-2 pr-3">
                      <input
                        type="checkbox"
                        checked={selected.has(r.id)}
                        onChange={() => toggle(r.id)}
                        onClick={e => e.stopPropagation()}
                        className="accent-emerald-500"
                      />
                    </td>
                    <td className="py-2 pr-3 font-mono text-neutral-300">{r.nro || '—'}</td>
                    <td className="py-2 pr-3 text-neutral-200 max-w-[120px] truncate">{r.nombre || '—'}</td>
                    <td className="py-2 pr-3 text-neutral-400 max-w-[100px] truncate">{r.sector || r.cc || '—'}</td>
                    <td className="py-2 pr-3 text-neutral-300 max-w-[160px] truncate">{r.duda || r.nota || '—'}</td>
                    <td className="py-2 pr-3 text-neutral-500 max-w-[100px] truncate" title={r._fileName}>{r._fileName}</td>
                    <td className="py-2">
                      <span className={cls('px-1.5 py-0.5 rounded text-[10px]',
                        r._tipo === 'arreglo' ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'
                      )}>
                        {r._tipo}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-800">
          <span className="text-sm text-neutral-400">
            {selected.size > 0 ? (
              <span className="text-emerald-400 font-medium">{selected.size} seleccionados</span>
            ) : 'Ninguno seleccionado'}
          </span>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 hover:bg-neutral-700 text-sm">
              Cancelar
            </button>
            <button
              disabled={selected.size === 0}
              onClick={() => setConfirming(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Procesar seleccionados ({selected.size})
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
