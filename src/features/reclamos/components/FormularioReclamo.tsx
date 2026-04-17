// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { ReclamosConfig, Adjunto } from '../types/reclamo.types';

const DRAFT_KEY = 'dataflow_reclamo_borrador';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

interface Props {
  config: ReclamosConfig;
  emisorId: string;
  emisorNombre: string;
  onGuardar: (data: any) => void;
  onCancelar: () => void;
}

const CAMPO = "w-full rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-neutral-500 placeholder-neutral-500";
const LABEL = "block text-xs text-neutral-400 mb-1";

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

export function FormularioReclamo({ config, emisorId, emisorNombre, onGuardar, onCancelar }: Props) {
  // Borrador: intenta recuperar de localStorage
  const initialForm = (() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  })();

  const [form, setForm] = useState(initialForm || {
    nroFuncionario: '',
    nombreFuncionario: '',
    emailFuncionario: '',
    cargo: config.cargos[0] || '',
    centroCosto: config.centrosCosto[0] || '',
    liquidacion: config.liquidaciones[0] || '',
    paraLiquidacion: '',
    causal: config.causales[0] || '',
    tipoReclamo: config.tiposReclamo[0] || '',
    descripcion: '',
  });
  const [notificarEmail, setNotificarEmail] = useState(true);
  const [adjuntos, setAdjuntos] = useState<Adjunto[]>([]);
  const [error, setError] = useState('');
  const [hayBorrador] = useState(!!initialForm);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-guardar borrador en cada cambio (sin adjuntos para no saturar localStorage)
  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
  }, [form]);

  function descartarBorrador() {
    localStorage.removeItem(DRAFT_KEY);
  }

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function handleArchivos(files: File[]) {
    setError('');
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        setError(`"${file.name}" supera 5 MB y no puede adjuntarse.`);
        continue;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        setAdjuntos(prev => [
          ...prev,
          {
            id: Math.random().toString(36).slice(2),
            nombre: file.name,
            tipo: file.type || 'application/octet-stream',
            tamaño: file.size,
            datos: e.target?.result as string,
          },
        ]);
      };
      reader.readAsDataURL(file);
    }
  }

  function quitarAdjunto(id: string) {
    setAdjuntos(prev => prev.filter(a => a.id !== id));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nroFuncionario.trim()) { setError('El Nro. de Funcionario es requerido.'); return; }
    if (!form.nombreFuncionario.trim()) { setError('El nombre es requerido.'); return; }
    if (notificarEmail && !form.emailFuncionario.trim()) { setError('El email es requerido para enviar notificación.'); return; }
    if (!form.descripcion.trim()) { setError('La descripción es requerida.'); return; }
    setError('');
    descartarBorrador();
    onGuardar({ ...form, emisorId, emisorNombre, notificarEmail, adjuntos });
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="reclamo-modal w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl border border-neutral-700 bg-neutral-900 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
          <div>
            <h2 className="text-lg font-bold text-neutral-100">Nuevo reclamo</h2>
            {hayBorrador && (
              <p className="text-[11px] text-amber-400 mt-0.5 flex items-center gap-1">
                <span>↩</span> Borrador recuperado automáticamente
                <button type="button"
                  onClick={() => { descartarBorrador(); setForm({ nroFuncionario: '', nombreFuncionario: '', emailFuncionario: '', cargo: config.cargos[0] || '', centroCosto: config.centrosCosto[0] || '', liquidacion: config.liquidaciones[0] || '', paraLiquidacion: '', causal: config.causales[0] || '', tipoReclamo: config.tiposReclamo[0] || '', descripcion: '' }); }}
                  className="ml-1 text-neutral-500 hover:text-rose-400 underline">
                  Descartar
                </button>
              </p>
            )}
          </div>
          <button type="button" onClick={() => { descartarBorrador(); onCancelar(); }} style={{ padding: '6px 10px' }} className="rounded-xl hover:bg-neutral-800 text-neutral-400 hover:text-white">✕</button>
        </div>

        <form id="form-reclamo" onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Nro. Funcionario *</label>
              <input className={CAMPO} value={form.nroFuncionario} onChange={e => set('nroFuncionario', e.target.value)} placeholder="Ej: 12345" />
            </div>
            <div>
              <label className={LABEL}>Nombre completo *</label>
              <input className={CAMPO} value={form.nombreFuncionario} onChange={e => set('nombreFuncionario', e.target.value)} placeholder="Nombre y apellido" />
            </div>

            {/* Email + toggle notificación */}
            <div className="col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className={LABEL} style={{ marginBottom: 0 }}>
                  Email del funcionario{notificarEmail ? ' *' : ''}
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={notificarEmail}
                    onChange={e => setNotificarEmail(e.target.checked)}
                    style={{ accentColor: '#3b82f6', width: '13px', height: '13px' }}
                  />
                  <span className="text-xs text-neutral-400">Notificar al funcionario</span>
                </label>
              </div>
              <input
                type="email"
                className={CAMPO + (!notificarEmail ? ' opacity-50' : '')}
                value={form.emailFuncionario}
                onChange={e => set('emailFuncionario', e.target.value)}
                placeholder={notificarEmail ? 'funcionario@empresa.com' : 'Sin notificación por email'}
                disabled={!notificarEmail}
              />
              {!notificarEmail && (
                <p className="text-xs text-neutral-600 mt-1">No se enviará email al funcionario. El reclamo se registra igual.</p>
              )}
            </div>

            <div>
              <label className={LABEL}>Cargo</label>
              <select className={CAMPO} value={form.cargo} onChange={e => set('cargo', e.target.value)}>
                <option value="">— Sin cargo —</option>
                {config.cargos.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Centro de costo</label>
              <select className={CAMPO} value={form.centroCosto} onChange={e => set('centroCosto', e.target.value)}>
                <option value="">— Sin CC —</option>
                {config.centrosCosto.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Liquidación origen</label>
              <select className={CAMPO} value={form.liquidacion} onChange={e => set('liquidacion', e.target.value)}>
                <option value="">— Sin período —</option>
                {config.liquidaciones.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Para liquidación <span className="text-neutral-600 font-normal">(se acredita en)</span></label>
              <input
                className={CAMPO}
                value={form.paraLiquidacion}
                onChange={e => set('paraLiquidacion', e.target.value)}
                placeholder="Ej.: Febrero 2026"
                list="para-liquidacion-opts"
              />
              <datalist id="para-liquidacion-opts">
                {config.liquidaciones.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div>
              <label className={LABEL}>Tipo de reclamo</label>
              <select className={CAMPO} value={form.tipoReclamo} onChange={e => set('tipoReclamo', e.target.value)}>
                <option value="">— Sin tipo —</option>
                {config.tiposReclamo.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className={LABEL}>Causal</label>
              <select className={CAMPO} value={form.causal} onChange={e => set('causal', e.target.value)}>
                <option value="">— Sin causal —</option>
                {config.causales.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className={LABEL}>Descripción *</label>
              <textarea
                className={CAMPO + ' min-h-[80px] resize-y'}
                value={form.descripcion}
                onChange={e => set('descripcion', e.target.value)}
                placeholder="Describir el reclamo en detalle..."
              />
            </div>

            {/* Adjuntos */}
            <div className="col-span-2">
              <label className={LABEL}>
                Adjuntos{' '}
                <span className="text-neutral-600 font-normal">(opcional — imágenes, PDF, Excel, Word · máx. 5 MB c/u)</span>
              </label>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,application/pdf,.xlsx,.xls,.docx,.doc,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
                className="hidden"
                onChange={e => handleArchivos(Array.from(e.target.files || []))}
                onClick={e => { (e.target as HTMLInputElement).value = ''; }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{ padding: '6px 12px' }}
                className="rounded-xl border border-dashed border-neutral-600 hover:border-neutral-400 bg-neutral-800/40 hover:bg-neutral-800 text-sm text-neutral-400 hover:text-neutral-200 transition-colors w-full text-center"
              >
                + Adjuntar archivos
              </button>

              {adjuntos.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {adjuntos.map(a => (
                    <div key={a.id} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-neutral-700 bg-neutral-800/60">
                      <span className="text-base shrink-0">{iconoMime(a.tipo)}</span>
                      <span className="flex-1 text-xs text-neutral-300 truncate min-w-0">{a.nombre}</span>
                      <span className="text-[11px] text-neutral-500 shrink-0">{formatBytes(a.tamaño)}</span>
                      <button
                        type="button"
                        onClick={() => quitarAdjunto(a.id)}
                        className="text-neutral-600 hover:text-rose-400 transition-colors shrink-0 text-xs"
                        title="Quitar adjunto"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="col-span-2">
              <label className={LABEL}>Emisor</label>
              <input className={CAMPO + ' opacity-60 cursor-not-allowed'} value={emisorNombre} readOnly />
            </div>
          </div>
          {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}
        </form>

        <div className="px-6 py-4 border-t border-neutral-800 flex justify-end gap-2">
          <button type="button" onClick={() => { descartarBorrador(); onCancelar(); }} style={{ padding: '8px 16px' }} className="rounded-xl bg-neutral-800 hover:bg-neutral-700 text-sm text-neutral-300">
            Cancelar
          </button>
          <button type="submit" form="form-reclamo" style={{ padding: '8px 16px' }} className="rounded-xl bg-blue-600 hover:bg-blue-500 text-sm text-white font-medium">
            Guardar reclamo
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
