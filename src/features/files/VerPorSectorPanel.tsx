// @ts-nocheck
import React, { useMemo, useState } from 'react';
import { cls } from '../../lib/cls';
import { prettyBytes } from '../../lib/bytes';
import { pendingDudasCount, answeredDudasCount, pendingArreglosCount, answeredArreglosCount, respondidaNoProcessadaCount } from '../observations/observationHelpers';

interface Props {
  files: any[];
  sectors: any[];
  sites: any[];
  onClose: () => void;
}

function effectiveStatus(file: any): { label: string; color: string } {
  const obs = (file?.observations || []).filter((t: any) => !t?.deleted);
  if (!obs.length) {
    const st = file.status || 'cargado';
    if (st === 'descargado') return { label: 'Descargado', color: 'text-blue-400' };
    if (st === 'procesado') return { label: 'Procesado', color: 'text-emerald-400' };
    return { label: 'Cargado', color: 'text-neutral-400' };
  }
  const allRows = obs.flatMap((t: any) => t.rows || []);
  const pending  = allRows.filter((r: any) => !r.answered).length;
  const unproc   = allRows.filter((r: any) => r.answered && !r.processed).length;
  if (pending > 0)  return { label: 'Con dudas', color: 'text-amber-400' };
  if (unproc > 0)   return { label: 'Pend. procesar', color: 'text-orange-400' };
  return { label: 'Procesado', color: 'text-emerald-400' };
}

export function VerPorSectorPanel({ files, sectors, sites, onClose }: Props) {
  const [expandedSite, setExpandedSite] = useState<Set<string>>(new Set());
  const [expandedSector, setExpandedSector] = useState<Set<string>>(new Set());

  function toggleSite(code: string) {
    setExpandedSite(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code); else next.add(code);
      return next;
    });
  }
  function toggleSector(name: string) {
    setExpandedSector(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  }

  // Agrupar archivos por sede → sector
  const grouped = useMemo(() => {
    const bySite: Record<string, { siteCode: string; siteName: string; sectors: Record<string, any[]> }> = {};

    for (const f of files) {
      if (f.eliminated) continue;
      const siteCode = f.siteCode || '_sin_sede';
      const sectorName = f.sectorName || f.sector || '_sin_sector';

      if (!bySite[siteCode]) {
        const siteInfo = sites.find(s => s.code === siteCode);
        bySite[siteCode] = {
          siteCode,
          siteName: siteInfo?.name || (siteCode === '_sin_sede' ? 'Sin sede' : siteCode),
          sectors: {},
        };
      }
      if (!bySite[siteCode].sectors[sectorName]) {
        bySite[siteCode].sectors[sectorName] = [];
      }
      bySite[siteCode].sectors[sectorName].push(f);
    }
    return Object.values(bySite);
  }, [files, sites]);

  function sectorStats(sectorFiles: any[]) {
    const total = sectorFiles.length;
    const dudas = sectorFiles.reduce((n, f) => n + pendingDudasCount(f), 0);
    const resp  = sectorFiles.reduce((n, f) => n + answeredDudasCount(f), 0);
    const sinProc = sectorFiles.reduce((n, f) => n + respondidaNoProcessadaCount(f), 0);
    const arregl = sectorFiles.reduce((n, f) => n + pendingArreglosCount(f), 0);
    return { total, dudas, resp, sinProc, arregl };
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-4xl bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
          <div>
            <h2 className="text-lg font-semibold text-neutral-100">Ver por Sector</h2>
            <p className="text-xs text-neutral-500 mt-0.5">Vista agrupada por sede y sector</p>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-200 text-2xl leading-none">×</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {grouped.length === 0 ? (
            <div className="py-12 text-center text-neutral-500">No hay archivos en este período.</div>
          ) : grouped.map(site => {
            const siteDudas = Object.values(site.sectors).flat().reduce((n, f) => n + pendingDudasCount(f), 0);
            const siteFiles = Object.values(site.sectors).flat().length;
            const expanded = expandedSite.has(site.siteCode);

            return (
              <div key={site.siteCode} className="border border-neutral-700 rounded-xl overflow-hidden">
                {/* Sede header */}
                <button
                  onClick={() => toggleSite(site.siteCode)}
                  className="w-full flex items-center justify-between px-5 py-3 bg-neutral-800 hover:bg-neutral-750 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base">{expanded ? '▼' : '▶'}</span>
                    <span className="font-semibold text-neutral-100">🏢 {site.siteName}</span>
                    <span className="text-xs text-neutral-500">{siteFiles} {siteFiles === 1 ? 'archivo' : 'archivos'}</span>
                    {siteDudas > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-medium">
                        {siteDudas} dudas pend.
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-neutral-500">{Object.keys(site.sectors).length} sectores</span>
                </button>

                {expanded && (
                  <div className="divide-y divide-neutral-800">
                    {Object.entries(site.sectors).map(([sectorName, sectorFiles]) => {
                      const stats = sectorStats(sectorFiles);
                      const sExpanded = expandedSector.has(`${site.siteCode}::${sectorName}`);
                      const sKey = `${site.siteCode}::${sectorName}`;
                      const hasIssues = stats.dudas > 0 || stats.sinProc > 0 || stats.arregl > 0;

                      return (
                        <div key={sectorName}>
                          {/* Sector row */}
                          <button
                            onClick={() => toggleSector(sKey)}
                            className="w-full flex items-center justify-between px-5 py-2.5 bg-neutral-900/80 hover:bg-neutral-800/40 transition-colors"
                          >
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm">{sExpanded ? '▼' : '▶'}</span>
                              <span className="text-sm font-medium text-neutral-200">
                                {sectorName === '_sin_sector' ? 'Sin sector' : sectorName}
                              </span>
                              <span className="text-xs text-neutral-500">{stats.total} archivos</span>
                              {stats.dudas > 0 && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px]">
                                  {stats.dudas} dudas pend.
                                </span>
                              )}
                              {stats.sinProc > 0 && (
                                <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 text-[10px]">
                                  {stats.sinProc} sin procesar
                                </span>
                              )}
                              {stats.arregl > 0 && (
                                <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px]">
                                  {stats.arregl} arreglos pend.
                                </span>
                              )}
                              {!hasIssues && (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px]">
                                  ✓ Al día
                                </span>
                              )}
                            </div>
                          </button>

                          {/* Sector files */}
                          {sExpanded && (
                            <div className="pl-8 pr-5 py-2 space-y-1 bg-neutral-950/30">
                              {sectorFiles.map(f => {
                                const es = effectiveStatus(f);
                                const ext = (f.name || '').split('.').pop()?.toUpperCase() || 'FILE';
                                return (
                                  <div key={f.id} className="flex items-center gap-3 py-1.5 text-xs border-b border-neutral-800/40 last:border-0">
                                    <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 font-mono text-[10px] flex-shrink-0">
                                      {ext}
                                    </span>
                                    <span className="text-neutral-300 flex-1 truncate" title={f.name}>{f.name}</span>
                                    <span className="text-neutral-500 flex-shrink-0">{prettyBytes(f.size)}</span>
                                    <span className={cls('flex-shrink-0', es.color)}>{es.label}</span>
                                    {pendingDudasCount(f) > 0 && (
                                      <span className="text-amber-400 flex-shrink-0">{pendingDudasCount(f)} duda(s)</span>
                                    )}
                                    {respondidaNoProcessadaCount(f) > 0 && (
                                      <span className="text-orange-400 flex-shrink-0">{respondidaNoProcessadaCount(f)} sin proc.</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="px-6 py-3 border-t border-neutral-800 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 hover:bg-neutral-700 text-sm">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
