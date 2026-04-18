// @ts-nocheck
import React, { useState, useRef } from 'react';
import type { ReclamosConfig } from '../types/reclamo.types';

interface Props {
  config: ReclamosConfig;
  onAgregarItem: (campo: string, valor: string) => void;
  onEditarItem: (campo: string, idx: number, valor: string) => void;
  onEliminarItem: (campo: string, idx: number) => void;
  onSetEmailSueldos: (email: string) => void;
  onSetWhatsappActivo: (activo: boolean) => void;
  onSetLogoDataUrl: (v: string) => void;
  onSetNotificarLiquidado: (activo: boolean) => void;
}

const CAMPOS: { key: string; label: string }[] = [
  { key: 'cargos', label: 'Cargos' },
  { key: 'centrosCosto', label: 'Centros de costo' },
  { key: 'liquidaciones', label: 'Liquidaciones' },
  { key: 'causales', label: 'Causales' },
  { key: 'tiposReclamo', label: 'Tipos de reclamo' },
];

function descargarCsvCampo(label: string, items: string[]) {
  const content = [label, ...items].join('\n');
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${label.toLowerCase().replace(/\s+/g, '_')}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function ListaEditable({ label, items, onAgregar, onEditar, onEliminar }: {
  label: string;
  items: string[];
  onAgregar: (v: string) => void;
  onEditar: (idx: number, v: string) => void;
  onEliminar: (idx: number) => void;
}) {
  const [nuevo, setNuevo] = useState('');
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editVal, setEditVal] = useState('');
  const importRef = useRef<HTMLInputElement>(null);

  function handleImportCsv(e: any) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = (ev.target?.result as string) || '';
      const lines = text.split(/\r?\n/).map((l: string) => l.trim()).filter(Boolean);
      // Primera línea = encabezado, se omite
      lines.slice(1).forEach((item: string) => { if (item) onAgregar(item); });
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4">
      {/* Encabezado con acciones CSV */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-neutral-300">{label}</h4>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => descargarCsvCampo(label, items)}
            style={{ padding: '3px 8px' }}
            className="rounded-lg border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-[11px] text-neutral-400 hover:text-neutral-200 transition-colors"
            title={`Descargar formato CSV de ${label}`}
          >
            ⬇ Formato
          </button>
          <button
            type="button"
            onClick={() => importRef.current?.click()}
            style={{ padding: '3px 8px' }}
            className="rounded-lg border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-[11px] text-neutral-400 hover:text-neutral-200 transition-colors"
            title={`Importar ${label} desde CSV`}
          >
            ⬆ Importar
          </button>
          <input
            ref={importRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleImportCsv}
          />
        </div>
      </div>

      {/* Lista de ítems */}
      <div className="space-y-1 mb-3 max-h-48 overflow-y-auto">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            {editIdx === i ? (
              <>
                <input
                  className="flex-1 rounded-lg border border-neutral-600 bg-neutral-800 px-2 py-1 text-sm text-neutral-100 focus:outline-none"
                  value={editVal}
                  onChange={e => setEditVal(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { onEditar(i, editVal); setEditIdx(null); }
                    if (e.key === 'Escape') setEditIdx(null);
                  }}
                  autoFocus
                />
                <button type="button" onClick={() => { onEditar(i, editVal); setEditIdx(null); }} style={{ padding: '2px 8px' }} className="rounded-lg bg-blue-600 hover:bg-blue-500 text-xs text-white">OK</button>
                <button type="button" onClick={() => setEditIdx(null)} style={{ padding: '2px 8px' }} className="rounded-lg bg-neutral-800 text-xs text-neutral-400">✕</button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm text-neutral-300 truncate">{item}</span>
                <button type="button" onClick={() => { setEditIdx(i); setEditVal(item); }} style={{ padding: '2px 6px' }} className="rounded text-xs text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800">✏️</button>
                <button type="button" onClick={() => onEliminar(i)} style={{ padding: '2px 6px' }} className="rounded text-xs text-neutral-500 hover:text-rose-400 hover:bg-rose-900/30">✕</button>
              </>
            )}
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-xs text-neutral-600">Sin ítems. Importá un CSV o agregá manualmente.</p>
        )}
      </div>

      {/* Agregar ítem */}
      <div className="flex gap-2">
        <input
          className="flex-1 rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm text-neutral-100 focus:outline-none focus:border-neutral-500 placeholder-neutral-600"
          placeholder="Nuevo ítem..."
          value={nuevo}
          onChange={e => setNuevo(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && nuevo.trim()) { onAgregar(nuevo.trim()); setNuevo(''); } }}
        />
        <button
          type="button"
          onClick={() => { if (nuevo.trim()) { onAgregar(nuevo.trim()); setNuevo(''); } }}
          style={{ padding: '6px 14px' }}
          className="rounded-xl bg-blue-600/80 hover:bg-blue-600 text-sm text-white"
        >
          +
        </button>
      </div>
    </div>
  );
}

function sampleEmailFuncionario(logoDataUrl?: string) {
  const logoHtml = logoDataUrl
    ? `<div style="margin-bottom:10px"><img src="${logoDataUrl}" alt="Logo" style="max-height:52px;max-width:180px;object-fit:contain" /></div>`
    : '';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/></head>
<body style="font-family:Arial,sans-serif;color:#222;max-width:600px;margin:auto;padding:24px;background:#f9f9f9">
<div style="background:#262626;color:#e2e8f0;padding:18px 24px;border-radius:10px 10px 0 0">
  ${logoHtml}
  <h2 style="margin:0;font-size:17px;font-weight:600">Tu reclamo fue registrado</h2>
</div>
<div style="background:#fff;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 10px 10px;padding:24px">
  <p style="font-size:14px">Estimado/a <strong>García, Juan</strong>,</p>
  <p style="color:#444">Tu reclamo ha sido registrado exitosamente el <strong>01/01/2026</strong> y fue enviado al área de <strong>Sueldos</strong> para su procesamiento.</p>
  <table style="width:100%;border-collapse:collapse;margin:14px 0;font-size:13px">
    <tr><td style="padding:7px 10px;background:#f7f7f7;width:38%;font-weight:600;border-bottom:1px solid #eee">Nro. de ticket</td><td style="padding:7px 10px;border-bottom:1px solid #eee;font-family:monospace">RC-20260101-1234</td></tr>
    <tr><td style="padding:7px 10px;background:#f7f7f7;font-weight:600;border-bottom:1px solid #eee">Liquidación</td><td style="padding:7px 10px;border-bottom:1px solid #eee">Enero 2026</td></tr>
    <tr><td style="padding:7px 10px;background:#f7f7f7;font-weight:600;border-bottom:1px solid #eee">Tipo de reclamo</td><td style="padding:7px 10px;border-bottom:1px solid #eee">Reclamo de descuento</td></tr>
    <tr><td style="padding:7px 10px;background:#f7f7f7;font-weight:600;border-bottom:1px solid #eee">Causal</td><td style="padding:7px 10px;border-bottom:1px solid #eee">Descuento incorrecto</td></tr>
    <tr><td style="padding:7px 10px;background:#f7f7f7;font-weight:600;border-bottom:1px solid #eee">Descripción</td><td style="padding:7px 10px;border-bottom:1px solid #eee">El descuento aplicado en la liquidación no corresponde al convenio vigente.</td></tr>
    <tr><td style="padding:7px 10px;background:#f7f7f7;font-weight:600;border-bottom:1px solid #eee">Fecha de emisión</td><td style="padding:7px 10px;border-bottom:1px solid #eee">01/01/2026</td></tr>
  </table>
  <p style="color:#666;font-size:13px">Te avisaremos cuando haya novedades sobre tu reclamo.</p>
</div>
<p style="color:#aaa;font-size:11px;margin-top:14px;text-align:center">Este es un mensaje automático del sistema Dataflow. No responder a este correo.</p>
</body></html>`;
}

function sampleEmailSueldos(emailSueldos: string, logoDataUrl?: string) {
  const logoHtml = logoDataUrl
    ? `<div style="margin-bottom:8px"><img src="${logoDataUrl}" alt="Logo" style="max-height:40px;max-width:140px;object-fit:contain" /></div>`
    : '';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/></head>
<body style="font-family:'Courier New',monospace;color:#1a1a1a;max-width:680px;margin:auto;padding:20px;background:#f4f4f4">
<div style="background:#2d2d2d;color:#f0f0f0;padding:12px 20px;border-radius:6px 6px 0 0;display:flex;align-items:center;gap:12px">
  ${logoHtml}
  <div>
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;opacity:0.6;font-family:Arial,sans-serif">RESPALDO SISTEMA DATAFLOW</div>
    <div style="font-size:15px;font-weight:700;font-family:Arial,sans-serif">Nuevo reclamo: RC-20260101-1234</div>
  </div>
</div>
<div style="background:#fff;border:1px solid #ccc;border-top:3px solid #2d2d2d;padding:20px">
  <p style="font-family:Arial,sans-serif;font-size:13px;color:#333;margin-bottom:16px">Se generó un nuevo reclamo en el sistema Dataflow el <strong>01/01/2026</strong>. Este es el registro completo para archivos de Sueldos.</p>
  <table style="width:100%;border-collapse:collapse;font-size:12px;font-family:Arial,sans-serif;border:1px solid #ccc">
    <tr style="background:#2d2d2d;color:#fff"><td colspan="2" style="padding:8px 12px;font-weight:700;letter-spacing:0.5px">DATOS DEL RECLAMO</td></tr>
    <tr><td style="padding:6px 10px;background:#f0f0f0;width:35%;font-weight:600;border-bottom:1px solid #ddd">Ticket</td><td style="padding:6px 10px;border-bottom:1px solid #ddd;font-family:monospace;font-weight:700">RC-20260101-1234</td></tr>
    <tr><td style="padding:6px 10px;background:#f0f0f0;font-weight:600;border-bottom:1px solid #ddd">Nro. Funcionario</td><td style="padding:6px 10px;border-bottom:1px solid #ddd">4567</td></tr>
    <tr><td style="padding:6px 10px;background:#f0f0f0;font-weight:600;border-bottom:1px solid #ddd">Nombre</td><td style="padding:6px 10px;border-bottom:1px solid #ddd">García, Juan</td></tr>
    <tr><td style="padding:6px 10px;background:#f0f0f0;font-weight:600;border-bottom:1px solid #ddd">Email funcionario</td><td style="padding:6px 10px;border-bottom:1px solid #ddd">jgarcia@circulocatolico.com.uy</td></tr>
    <tr><td style="padding:6px 10px;background:#f0f0f0;font-weight:600;border-bottom:1px solid #ddd">Cargo</td><td style="padding:6px 10px;border-bottom:1px solid #ddd">Auxiliar Administrativo</td></tr>
    <tr><td style="padding:6px 10px;background:#f0f0f0;font-weight:600;border-bottom:1px solid #ddd">Centro de costo</td><td style="padding:6px 10px;border-bottom:1px solid #ddd">CC-002 Recursos Humanos</td></tr>
    <tr><td style="padding:6px 10px;background:#f0f0f0;font-weight:600;border-bottom:1px solid #ddd">Liquidación origen</td><td style="padding:6px 10px;border-bottom:1px solid #ddd">Enero 2026</td></tr>
    <tr><td style="padding:6px 10px;background:#fffbe6;font-weight:600;border-bottom:1px solid #ddd">Para liquidación</td><td style="padding:6px 10px;border-bottom:1px solid #ddd;font-weight:700">Febrero 2026</td></tr>
    <tr><td style="padding:6px 10px;background:#f0f0f0;font-weight:600;border-bottom:1px solid #ddd">Tipo de reclamo</td><td style="padding:6px 10px;border-bottom:1px solid #ddd">Reclamo de descuento</td></tr>
    <tr><td style="padding:6px 10px;background:#f0f0f0;font-weight:600;border-bottom:1px solid #ddd">Causal</td><td style="padding:6px 10px;border-bottom:1px solid #ddd">Descuento incorrecto</td></tr>
    <tr><td style="padding:6px 10px;background:#f0f0f0;font-weight:600;border-bottom:1px solid #ddd">Estado inicial</td><td style="padding:6px 10px;border-bottom:1px solid #ddd"><strong>Emitido</strong></td></tr>
    <tr><td style="padding:6px 10px;background:#f0f0f0;font-weight:600;border-bottom:1px solid #ddd">Fecha emisión</td><td style="padding:6px 10px;border-bottom:1px solid #ddd">01/01/2026</td></tr>
    <tr><td style="padding:6px 10px;background:#f0f0f0;font-weight:600;border-bottom:1px solid #ddd">Emisor (RRHH)</td><td style="padding:6px 10px;border-bottom:1px solid #ddd">Martínez, Ana</td></tr>
    <tr style="background:#fffbe6"><td style="padding:6px 10px;font-weight:600;border-bottom:1px solid #ddd;vertical-align:top">Descripción</td><td style="padding:6px 10px;border-bottom:1px solid #ddd">El descuento aplicado en la liquidación no corresponde al convenio vigente.</td></tr>
  </table>
</div>
<p style="color:#999;font-size:10px;margin-top:10px;font-family:Arial,sans-serif">Mensaje automático generado por Dataflow · Solo para uso interno · No responder &nbsp;·&nbsp; Destino: <strong>${emailSueldos || 'reclamos@circulocatolico.com.uy'}</strong></p>
</body></html>`;
}

export function ReclamosConfig({ config, onAgregarItem, onEditarItem, onEliminarItem, onSetEmailSueldos, onSetWhatsappActivo, onSetLogoDataUrl, onSetNotificarLiquidado }: Props) {
  const [emailLocal, setEmailLocal] = useState(config.emailSueldos);
  const [emailGuardado, setEmailGuardado] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTab, setPreviewTab] = useState<'funcionario' | 'sueldos'>('funcionario');
  const logoInputRef = useRef<HTMLInputElement>(null);

  function handleGuardarEmail() {
    onSetEmailSueldos(emailLocal);
    setEmailGuardado(true);
    setTimeout(() => setEmailGuardado(false), 2000);
  }

  function handleLogoChange(e: any) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Solo imágenes (JPG, PNG, SVG, WEBP).'); return; }
    if (file.size > 2 * 1024 * 1024) { alert('El logo no puede superar 2 MB.'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => onSetLogoDataUrl(ev.target?.result as string || '');
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  return (
    <div className="space-y-6">
      <h3 className="text-base font-semibold text-neutral-200">Configuración de reclamos</h3>

      {/* Listas editables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CAMPOS.map(({ key, label }) => (
          <ListaEditable
            key={key}
            label={label}
            items={(config[key] as string[]) || []}
            onAgregar={v => onAgregarItem(key, v)}
            onEditar={(idx, v) => onEditarItem(key, idx, v)}
            onEliminar={idx => onEliminarItem(key, idx)}
          />
        ))}
      </div>

      {/* Notificaciones */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 space-y-5">
        <h4 className="text-sm font-semibold text-neutral-300">Notificaciones</h4>

        {/* Email destino */}
        <div className="space-y-2">
          <label className="block text-xs text-neutral-400">Email destino (Sueldos)</label>
          <div className="flex gap-2">
            <input
              type="email"
              className="flex-1 rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-neutral-500 placeholder-neutral-600"
              value={emailLocal}
              onChange={e => setEmailLocal(e.target.value)}
              placeholder="sueldos@empresa.com.uy"
            />
            <button
              type="button"
              onClick={handleGuardarEmail}
              style={{ padding: '8px 14px' }}
              className={`rounded-xl text-sm font-medium transition-colors ${emailGuardado ? 'bg-green-600 text-white' : 'bg-blue-600/80 hover:bg-blue-600 text-white'}`}
            >
              {emailGuardado ? '✓ Guardado' : 'Guardar'}
            </button>
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              style={{ padding: '8px 14px' }}
              className="rounded-xl border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-sm text-neutral-300 transition-colors"
              title="Ver cómo se ve el email generado"
            >
              Vista previa
            </button>
          </div>
          <p className="text-xs text-neutral-600">
            A esta dirección se envía una copia de cada nuevo reclamo. Las notificaciones son <span className="text-neutral-500">simuladas</span> — podés ver el historial en el detalle de cada reclamo.
          </p>
        </div>

        {/* Notificar al funcionario cuando pasa a Liquidado */}
        <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
          <div>
            <p className="text-sm text-neutral-300">Notificar al funcionario al liquidar</p>
            <p className="text-xs text-neutral-500 mt-0.5 max-w-xs">
              Cuando un reclamo pasa a <span className="text-green-400 font-medium">Liquidado</span> (individual o en lote),
              se envía un email al funcionario indicando que fue liquidado y en qué liquidación se acredita.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onSetNotificarLiquidado(!config.notificarLiquidado)}
            style={{
              padding: 0,
              width: '3rem',
              height: '1.5rem',
              position: 'relative',
              borderRadius: '9999px',
              border: 'none',
              flexShrink: 0,
              background: config.notificarLiquidado ? '#22c55e' : '#404040',
              transition: 'background 0.2s ease',
              cursor: 'pointer',
            }}
            aria-label="Toggle notificar liquidado"
          >
            <span
              style={{
                position: 'absolute',
                top: '2px',
                left: config.notificarLiquidado ? 'calc(100% - 22px)' : '2px',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: 'white',
                boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
                transition: 'left 0.2s ease',
                pointerEvents: 'none',
              }}
            />
          </button>
        </div>

        {/* WhatsApp toggle */}
        <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
          <div>
            <p className="text-sm text-neutral-300">WhatsApp activo</p>
            <p className="text-xs text-neutral-600">Solo visual — sin integración real</p>
          </div>
          <button
            type="button"
            onClick={() => onSetWhatsappActivo(!config.whatsappActivo)}
            style={{
              padding: 0,
              width: '3rem',
              height: '1.5rem',
              position: 'relative',
              borderRadius: '9999px',
              border: 'none',
              flexShrink: 0,
              background: config.whatsappActivo ? '#22c55e' : '#404040',
              transition: 'background 0.2s ease',
              cursor: 'pointer',
            }}
            aria-label="Toggle WhatsApp"
          >
            <span
              style={{
                position: 'absolute',
                top: '2px',
                left: config.whatsappActivo ? 'calc(100% - 22px)' : '2px',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: 'white',
                boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
                transition: 'left 0.2s ease',
                pointerEvents: 'none',
              }}
            />
          </button>
        </div>
      </div>

      {/* Logo institucional */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 space-y-3">
        <div>
          <h4 className="text-sm font-semibold text-neutral-300">Logo institucional</h4>
          <p className="text-xs text-neutral-500 mt-0.5">Se incluirá en el encabezado de los emails generados automáticamente.</p>
        </div>
        {config.logoDataUrl ? (
          <div className="flex items-center gap-4">
            <img
              src={config.logoDataUrl}
              alt="Logo"
              className="max-h-12 max-w-[160px] object-contain rounded-lg border border-neutral-700 bg-neutral-950 p-1.5"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                style={{ padding: '6px 12px' }}
                className="rounded-xl border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-300 transition-colors"
              >
                Cambiar
              </button>
              <button
                type="button"
                onClick={() => onSetLogoDataUrl('')}
                style={{ padding: '6px 12px' }}
                className="rounded-xl border border-neutral-800 hover:border-rose-900/50 bg-neutral-800 hover:bg-rose-950/40 text-xs text-neutral-400 hover:text-rose-400 transition-colors"
              >
                Quitar
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => logoInputRef.current?.click()}
            style={{ padding: '10px 16px' }}
            className="flex items-center gap-2 rounded-xl border border-dashed border-neutral-700 hover:border-neutral-500 bg-neutral-800/50 hover:bg-neutral-800 text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 20M2 6a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
            </svg>
            Subir logo (JPG, PNG, SVG · máx. 2 MB)
          </button>
        )}
        <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
      </div>

      {/* Modal vista previa email */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-5 pt-5 pb-4 border-b border-neutral-800 flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold text-neutral-100">Vista previa de emails</h3>
                <p className="text-xs text-neutral-500 mt-0.5">Ejemplos de los dos formatos generados automáticamente por el sistema.</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                style={{ padding: '6px 12px' }}
                className="rounded-xl border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-sm text-neutral-400 hover:text-neutral-200 transition-colors shrink-0"
              >
                ✕ Cerrar
              </button>
            </div>
            {/* Tabs */}
            <div className="flex gap-1 px-5 pt-4 pb-0">
              <button
                type="button"
                onClick={() => setPreviewTab('funcionario')}
                style={{ padding: '6px 14px' }}
                className={`rounded-lg text-sm font-medium transition-colors ${previewTab === 'funcionario' ? 'bg-neutral-700 text-neutral-100' : 'text-neutral-500 hover:text-neutral-200'}`}
              >
                📩 Al funcionario
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('sueldos')}
                style={{ padding: '6px 14px' }}
                className={`rounded-lg text-sm font-medium transition-colors ${previewTab === 'sueldos' ? 'bg-neutral-700 text-neutral-100' : 'text-neutral-500 hover:text-neutral-200'}`}
              >
                🗂️ Respaldo a Sueldos
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <p className="text-xs text-neutral-600 mb-2">
                {previewTab === 'funcionario'
                  ? 'Email amigable de confirmación — se envía al funcionario al registrar el reclamo.'
                  : `Email operacional de respaldo — se envía una única vez a ${emailLocal || 'reclamos@circulocatolico.com.uy'}.`}
              </p>
              <iframe
                key={previewTab}
                srcDoc={previewTab === 'funcionario'
                  ? sampleEmailFuncionario(config.logoDataUrl)
                  : sampleEmailSueldos(emailLocal, config.logoDataUrl)}
                className="w-full rounded-xl border border-neutral-700"
                style={{ height: '480px', background: 'white' }}
                sandbox="allow-same-origin"
                title="Vista previa de email"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
