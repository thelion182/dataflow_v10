// @ts-nocheck
import React, { useMemo, useState, useRef } from 'react';
import type { Reclamo } from '../types/reclamo.types';

interface Props {
  reclamos: Reclamo[];
}

const ESTADOS = ['Emitido', 'En proceso', 'Procesado/Liquidado', 'Rechazado'];

const ESTADO_COLOR: Record<string, string> = {
  'Emitido': '#60a5fa',
  'En proceso': '#fbbf24',
  'Procesado/Liquidado': '#34d399',
  'Rechazado': '#f87171',
  'Eliminado': '#525252',
};

const MESES: Record<string, number> = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, setiembre: 9, septiembre: 9, octubre: 10,
  noviembre: 11, diciembre: 12,
};

const MESES_CORTOS = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];

// Convierte "Enero 2025" → { year: 2025, month: 1, sort: "2025-01" }
function parseLiquidacion(liq: string): { year: number; month: number; sort: string } | null {
  if (!liq) return null;
  const parts = liq.trim().toLowerCase().split(/\s+/);
  if (parts.length < 2) return null;
  const month = MESES[parts[0]];
  const year = parseInt(parts[parts.length - 1], 10);
  if (!month || isNaN(year)) return null;
  return { year, month, sort: `${year}-${String(month).padStart(2, '0')}` };
}

// "Enero 2025" → "Ene '25"
function labelCorto(liq: string): string {
  const p = parseLiquidacion(liq);
  if (!p) return liq;
  return `${MESES_CORTOS[p.month]} '${String(p.year).slice(2)}`;
}

// Agrega N meses a un { year, month }
function addMonths(year: number, month: number, n: number): { year: number; month: number } {
  const total = month - 1 + n;
  return { year: year + Math.floor(total / 12), month: (total % 12) + 1 };
}

// Sort key YYYY-MM para hoy
function hoySort(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// Sort key N meses atrás desde hoy
function sortHaceNMeses(n: number): string {
  const now = new Date();
  const r = addMonths(now.getFullYear(), now.getMonth() + 1, -n);
  return `${r.year}-${String(r.month).padStart(2, '0')}`;
}

const RANGOS = [
  { label: '1 mes', meses: 1 },
  { label: '2 meses', meses: 2 },
  { label: '3 meses', meses: 3 },
  { label: '6 meses', meses: 6 },
  { label: '12 meses', meses: 12 },
  { label: 'Todo', meses: 0 },
];

// ── Gráfico SVG ──────────────────────────────────────────────────────────────
function GraficoLinea({ datos, altura = 160 }: { datos: { label: string; value: number; liq: string }[]; altura?: number }) {
  if (datos.length === 0) {
    return <p className="text-xs text-neutral-600 py-6 text-center">Sin datos en el rango seleccionado.</p>;
  }
  if (datos.length === 1) {
    const d = datos[0];
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-1">
        <span className="text-4xl font-bold text-blue-400">{d.value}</span>
        <span className="text-xs text-neutral-500">{d.liq}</span>
        <span className="text-xs text-neutral-600">Solo un período — agregá más para ver la línea de tiempo.</span>
      </div>
    );
  }

  const W = 600;
  const H = altura;
  const PADL = 40;
  const PADR = 16;
  const PADT = 20;
  const PADB = 36;
  const chartW = W - PADL - PADR;
  const chartH = H - PADT - PADB;
  const maxVal = Math.max(...datos.map(d => d.value), 1);
  const step = chartW / (datos.length - 1);

  const pts = datos.map((d, i) => ({
    x: PADL + i * step,
    y: PADT + chartH - (d.value / maxVal) * chartH,
    ...d,
  }));

  const polyline = pts.map(p => `${p.x},${p.y}`).join(' ');
  const areaPath = [
    `M ${pts[0].x} ${PADT + chartH}`,
    ...pts.map(p => `L ${p.x} ${p.y}`),
    `L ${pts[pts.length - 1].x} ${PADT + chartH}`,
    'Z',
  ].join(' ');

  // Ticks del eje Y: 0, maxVal/2, maxVal
  const yTicks = [0, 0.5, 1].map(t => ({
    y: PADT + chartH - t * chartH,
    val: Math.round(t * maxVal),
  }));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: `${altura}px` }}>
      <defs>
        <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.01" />
        </linearGradient>
      </defs>

      {/* Grid Y */}
      {yTicks.map(t => (
        <g key={t.val}>
          <line x1={PADL} y1={t.y} x2={W - PADR} y2={t.y} stroke="#262626" strokeWidth="1" />
          <text x={PADL - 5} y={t.y + 4} textAnchor="end" fontSize="9" fill="#525252">{t.val}</text>
        </g>
      ))}

      {/* Área + línea */}
      <path d={areaPath} fill="url(#rg)" />
      <polyline points={polyline} fill="none" stroke="#60a5fa" strokeWidth="2"
        strokeLinejoin="round" strokeLinecap="round" />

      {/* Puntos + etiquetas */}
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill="#60a5fa" stroke="#171717" strokeWidth="1.5" />
          {/* valor encima del punto */}
          <text x={p.x} y={p.y - 9} textAnchor="middle" fontSize="9" fill="#e5e5e5" fontWeight="600">
            {p.value}
          </text>
          {/* label mes abajo */}
          <text
            x={p.x}
            y={PADT + chartH + 14}
            textAnchor="middle"
            fontSize="9"
            fill="#737373"
            style={{ userSelect: 'none' }}
          >
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────
export function ReportesReclamos({ reclamos }: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [mostrarEliminados, setMostrarEliminados] = useState(true);
  const [rangoMeses, setRangoMeses] = useState(6); // 0 = todo

  // ── Liquidaciones únicas ordenadas cronológicamente ──────────────────────
  const liquidacionesOrdenadas = useMemo(() => {
    const set = new Set<string>();
    for (const r of reclamos) { if (r.liquidacion) set.add(r.liquidacion); }
    return Array.from(set).sort((a, b) => {
      const pa = parseLiquidacion(a);
      const pb = parseLiquidacion(b);
      if (!pa || !pb) return a.localeCompare(b);
      return pa.sort.localeCompare(pb.sort);
    });
  }, [reclamos]);

  // ── Rango de fechas activo ────────────────────────────────────────────────
  const sortDesde = rangoMeses === 0 ? '' : sortHaceNMeses(rangoMeses);
  const sortHasta = hoySort();

  const liquidacionesEnRango = useMemo(() => {
    if (rangoMeses === 0) return liquidacionesOrdenadas;
    return liquidacionesOrdenadas.filter(liq => {
      const p = parseLiquidacion(liq);
      if (!p) return false;
      return p.sort >= sortDesde && p.sort <= sortHasta;
    });
  }, [liquidacionesOrdenadas, rangoMeses, sortDesde, sortHasta]);

  // ── Base filtrada (por estado + eliminados) ───────────────────────────────
  const base = useMemo(() => {
    let r = reclamos;
    if (!mostrarEliminados) r = r.filter(x => !x.eliminado);
    if (filtroEstado === 'Eliminado') return reclamos.filter(x => x.eliminado);
    if (filtroEstado) return r.filter(x => x.estado === filtroEstado && !x.eliminado);
    return r;
  }, [reclamos, filtroEstado, mostrarEliminados]);

  // ── Conteos globales (siempre sobre todos) ────────────────────────────────
  const totalGeneral = reclamos.length;
  const porEstado = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of reclamos) {
      const key = r.eliminado ? 'Eliminado' : r.estado;
      map[key] = (map[key] || 0) + 1;
    }
    return map;
  }, [reclamos]);

  // ── Por tipo ──────────────────────────────────────────────────────────────
  const porTipo = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of base) { map[r.tipoReclamo] = (map[r.tipoReclamo] || 0) + 1; }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [base]);

  // ── Datos del gráfico (rango aplicado, todos incluidos eliminados) ─────────
  const datosPorLiquidacion = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of reclamos) {
      if (!r.liquidacion) continue;
      map[r.liquidacion] = (map[r.liquidacion] || 0) + 1;
    }
    return liquidacionesEnRango.map(liq => ({
      label: labelCorto(liq),
      liq,
      value: map[liq] || 0,
    }));
  }, [reclamos, liquidacionesEnRango]);

  // ── Tabla resumen por período (rango aplicado) ────────────────────────────
  const tablaPeriodos = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    for (const r of reclamos) {
      const liq = r.liquidacion || '(sin período)';
      if (!map[liq]) map[liq] = {};
      const key = r.eliminado ? 'Eliminado' : r.estado;
      map[liq][key] = (map[liq][key] || 0) + 1;
    }
    return liquidacionesEnRango.map(liq => {
      const est = map[liq] || {};
      const total = Object.values(est).reduce((a, b) => a + b, 0);
      return { liq, est, total };
    });
  }, [reclamos, liquidacionesEnRango]);

  // ── Exportar CSV ──────────────────────────────────────────────────────────
  function exportarCSV() {
    const cols = ['Período', 'Total', 'Emitido', 'En proceso', 'Procesado/Liquidado', 'Rechazado', 'Eliminado'];
    const rows = tablaPeriodos.map(({ liq, est, total }) => [
      liq, total,
      est['Emitido'] || 0, est['En proceso'] || 0,
      est['Procesado/Liquidado'] || 0, est['Rechazado'] || 0, est['Eliminado'] || 0,
    ]);
    const csv = [cols, ...rows].map(row => row.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-reclamos-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  // ── Imprimir ──────────────────────────────────────────────────────────────
  function imprimir() {
    const el = printRef.current;
    if (!el) return;
    const html = el.innerHTML;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/>
      <title>Reporte de Reclamos — Dataflow</title>
      <style>
        body { font-family: Arial, sans-serif; color: #111; background: #fff; padding: 24px; }
        h3 { font-size: 18px; margin-bottom: 8px; }
        h4 { font-size: 12px; text-transform: uppercase; letter-spacing: .05em; color: #555; margin: 16px 0 6px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th { background: #f0f0f0; text-align: left; padding: 6px 8px; border: 1px solid #ddd; font-size: 11px; }
        td { padding: 5px 8px; border: 1px solid #eee; }
        .cards { display: flex; gap: 12px; margin-bottom: 16px; }
        .card { flex: 1; border: 1px solid #ddd; border-radius: 8px; padding: 12px; text-align: center; }
        .card .num { font-size: 28px; font-weight: 700; }
        .card .lbl { font-size: 11px; color: #777; }
        svg { width: 100%; max-height: 180px; }
        @media print { body { padding: 0; } }
      </style>
    </head><body>
      <h3>Reporte de Reclamos — Dataflow</h3>
      <p style="font-size:11px;color:#777;margin-bottom:16px">
        Generado el ${new Date().toLocaleDateString('es-UY', { day:'2-digit', month:'long', year:'numeric' })}
        · Rango: ${rangoMeses === 0 ? 'Histórico completo' : `Últimos ${rangoMeses} meses`}
      </p>
      ${html}
    </body></html>`);
    w.document.close();
    setTimeout(() => { w.print(); }, 400);
  }

  return (
    <div className="space-y-6">

      {/* ── Encabezado + controles ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold text-neutral-200">Reportes de reclamos</h3>

          {/* Filtro estado */}
          <select
            value={filtroEstado}
            onChange={e => setFiltroEstado(e.target.value)}
            className="rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm text-neutral-200 focus:outline-none"
          >
            <option value="">Todos los estados</option>
            {ESTADOS.map(s => <option key={s} value={s}>{s}</option>)}
            <option value="Eliminado">Eliminado</option>
          </select>

          {/* Incluir eliminados */}
          <label className="flex items-center gap-1.5 text-sm text-neutral-400 cursor-pointer">
            <input type="checkbox" checked={mostrarEliminados}
              onChange={e => setMostrarEliminados(e.target.checked)}
              className="rounded" style={{ accentColor: '#3b82f6' }} />
            Incluir eliminados
          </label>
        </div>

        <div className="flex gap-2">
          <button type="button" onClick={exportarCSV}
            style={{ padding: '6px 12px' }}
            className="rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-sm text-neutral-300">
            📊 CSV
          </button>
          <button type="button" onClick={imprimir}
            style={{ padding: '6px 12px' }}
            className="rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-sm text-neutral-300">
            🖨️ Imprimir
          </button>
        </div>
      </div>

      {/* Contenido imprimible */}
      <div ref={printRef} className="space-y-6">

        {/* ── Tarjetas resumen ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { val: totalGeneral, label: 'Total histórico', color: 'text-neutral-100' },
            { val: porEstado['Emitido'] || 0, label: 'Pendientes', color: 'text-amber-400' },
            { val: porEstado['Procesado/Liquidado'] || 0, label: 'Liquidados', color: 'text-green-400' },
            { val: porEstado['Eliminado'] || 0, label: 'Eliminados', color: 'text-neutral-500' },
          ].map(({ val, label, color }) => (
            <div key={label} className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4 text-center">
              <p className={`text-3xl font-bold ${color}`}>{val}</p>
              <p className="text-xs text-neutral-500 mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* ── Selector de rango ── */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h4 className="text-sm font-semibold text-neutral-400 uppercase tracking-wide">
              Reclamos por período (liquidación)
            </h4>
            <div className="flex gap-1 flex-wrap">
              {RANGOS.map(r => (
                <button
                  key={r.meses}
                  type="button"
                  onClick={() => setRangoMeses(r.meses)}
                  style={{ padding: '3px 10px' }}
                  className={`rounded-lg text-xs font-medium transition-colors ${
                    rangoMeses === r.meses
                      ? 'bg-blue-600 text-white'
                      : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-400 border border-neutral-700'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <GraficoLinea datos={datosPorLiquidacion} altura={160} />
        </div>

        {/* ── Tabla por período ── */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 overflow-hidden">
          <div className="px-4 py-3 border-b border-neutral-800">
            <h4 className="text-sm font-semibold text-neutral-400 uppercase tracking-wide">
              Detalle por período
              {rangoMeses > 0 && <span className="ml-2 text-neutral-600 font-normal normal-case">· últimos {rangoMeses} meses</span>}
            </h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-800 bg-neutral-900/80">
                  <th className="text-left px-4 py-2 text-xs text-neutral-500 font-medium">Período</th>
                  <th className="text-right px-4 py-2 text-xs text-neutral-500 font-medium">Total</th>
                  {ESTADOS.map(e => (
                    <th key={e} className="text-right px-4 py-2 text-xs font-medium" style={{ color: ESTADO_COLOR[e] }}>
                      {e.split('/')[0]}
                    </th>
                  ))}
                  <th className="text-right px-4 py-2 text-xs text-neutral-600 font-medium">Elim.</th>
                </tr>
              </thead>
              <tbody>
                {tablaPeriodos.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-6 text-center text-neutral-600">Sin datos.</td></tr>
                )}
                {tablaPeriodos.map(({ liq, est, total }) => (
                  <tr key={liq} className="border-b border-neutral-800/50 hover:bg-neutral-800/20">
                    <td className="px-4 py-2 text-neutral-300 font-medium">{liq}</td>
                    <td className="px-4 py-2 text-right font-semibold text-neutral-100">{total}</td>
                    {ESTADOS.map(e => (
                      <td key={e} className="px-4 py-2 text-right text-neutral-400">
                        {est[e] || <span className="text-neutral-700">—</span>}
                      </td>
                    ))}
                    <td className="px-4 py-2 text-right text-neutral-600">{est['Eliminado'] || <span className="text-neutral-800">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Por estado + por tipo ── */}
        <div className="grid grid-cols-2 gap-6">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4">
            <h4 className="text-sm font-semibold text-neutral-400 uppercase tracking-wide mb-3">Por estado</h4>
            <div className="space-y-2">
              {[...ESTADOS, 'Eliminado'].map(e => (
                <div key={e} className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: ESTADO_COLOR[e] }} />
                  <span className="flex-1 text-neutral-400">{e}</span>
                  <span className="font-semibold text-neutral-200">{porEstado[e] || 0}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4">
            <h4 className="text-sm font-semibold text-neutral-400 uppercase tracking-wide mb-3">Por tipo (top)</h4>
            <div className="space-y-2">
              {porTipo.slice(0, 8).map(([tipo, cnt]) => {
                const pct = totalGeneral > 0 ? Math.round((cnt / totalGeneral) * 100) : 0;
                return (
                  <div key={tipo} className="space-y-0.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-neutral-400 truncate max-w-[160px]">{tipo}</span>
                      <span className="font-semibold text-neutral-200 ml-2">{cnt}</span>
                    </div>
                    <div className="h-1 rounded-full bg-neutral-800 overflow-hidden">
                      <div className="h-full rounded-full bg-blue-500/60" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              {porTipo.length === 0 && <p className="text-xs text-neutral-600">Sin datos.</p>}
            </div>
          </div>
        </div>

      </div>{/* fin printRef */}
    </div>
  );
}
