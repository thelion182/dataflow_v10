// @ts-nocheck
import React, { useState, useRef } from 'react';
import { cls } from '../../lib/cls';
import { uuid } from '../../lib/ids';

// ─────────────────────────────────────────────────────────────────────────────
// SectorsConfigModal
// Tres tabs: Sedes → Sectores → Combinaciones
// Solo admins pueden editar. El resto solo lee.
// ─────────────────────────────────────────────────────────────────────────────

type Tab = 'sedes' | 'sectores' | 'combinaciones';

export function SectorsConfigModal({
  open, onClose,
  sites, sectors, combinations,
  isAdmin, rrhhUsers,
  addSite, updateSite, deleteSite,
  addSector, updateSector, deleteSector,
  addCombination, updateCombination, deleteCombination,
  handleImportSitesCSV, downloadSitesTemplateCSV,
  handleImportCombinationsCSV, downloadCombinationsTemplateCSV,
}: any) {
  const [tab, setTab] = useState<Tab>('sedes');
  const [filterSite, setFilterSite] = useState('');
  const sitesImportRef   = useRef<HTMLInputElement>(null);
  const combosImportRef  = useRef<HTMLInputElement>(null);

  // ── nuevo sector inline ────────────────────────────────────────
  const [newSectorName, setNewSectorName] = useState('');

  // ── nueva combinación inline ───────────────────────────────────
  const [newCombo, setNewCombo] = useState({ siteCode: '', sectorName: '', subcategory: '', cc: '', ownerUserId: '', allowNoNews: true });

  // ── nueva sede inline ──────────────────────────────────────────
  const [newSite, setNewSite] = useState({ code: '', name: '' });

  if (!open) return null;

  const activeSites  = (sites || []).filter((s: any) => s.active !== false);
  const visibleCombos = (combinations || []).filter((c: any) =>
    !filterSite || c.siteCode === filterSite
  );

  function handleAddSite() {
    const code = newSite.code.trim().toUpperCase();
    const name = newSite.name.trim();
    if (!code || !name) { alert('Código y nombre son obligatorios.'); return; }
    addSite({ code, name, active: true });
    setNewSite({ code: '', name: '' });
  }

  function handleAddSector() {
    const n = newSectorName.trim();
    if (!n) return;
    addSector(n);
    setNewSectorName('');
  }

  function handleAddCombo() {
    const { siteCode, sectorName, subcategory, cc, ownerUserId, allowNoNews } = newCombo;
    if (!siteCode || !sectorName.trim()) { alert('Sede y sector son obligatorios.'); return; }
    const u = (rrhhUsers || []).find((x: any) => x.id === ownerUserId);
    addCombination({
      siteCode,
      sectorName: sectorName.trim(),
      subcategory: subcategory.trim() || null,
      cc: cc.trim() || null,
      ownerUserId: ownerUserId || null,
      ownerUsername: u ? (u.displayName || u.username) : null,
      allowNoNews,
      active: true,
    });
    setNewCombo({ siteCode: '', sectorName: '', subcategory: '', cc: '', ownerUserId: '', allowNoNews: true });
  }

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: 'sedes',        label: 'Sedes',        count: (sites || []).length },
    { key: 'sectores',     label: 'Sectores',     count: (sectors || []).length },
    { key: 'combinaciones',label: 'Combinaciones',count: (combinations || []).filter((c:any)=>c.active).length },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-5xl rounded-2xl border border-neutral-800 bg-neutral-900 shadow-2xl flex flex-col max-h-[90vh]">

        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-neutral-800">
          <div>
            <h3 className="font-semibold text-neutral-100 text-base">Configuración de clasificación</h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Definí las sedes, los sectores y las combinaciones válidas para clasificar archivos.
            </p>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-100 text-2xl leading-none mt-0.5">×</button>
        </div>

        {/* ── Tabs ───────────────────────────────────────────────── */}
        <div className="flex gap-1 px-6 pt-3 border-b border-neutral-800">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cls(
                'px-4 py-2 text-sm rounded-t-xl border-b-2 transition-colors font-medium',
                tab === t.key
                  ? 'border-blue-500 text-blue-400 bg-neutral-800/60'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/30'
              )}
            >
              {t.label}
              <span className={cls(
                'ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold',
                tab === t.key ? 'bg-blue-500/20 text-blue-300' : 'bg-neutral-800 text-neutral-500'
              )}>{t.count}</span>
            </button>
          ))}
        </div>

        {/* ── Contenido ──────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-4">

          {/* ═══════════ TAB: SEDES ═══════════ */}
          {tab === 'sedes' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-neutral-500">
                  El <strong className="text-neutral-300">código</strong> debe ir en MAYÚSCULAS y aparece en el nombre del archivo (ej: SC, SG, JPII).
                </p>
                {isAdmin && (
                  <div className="flex gap-2">
                    <button onClick={downloadSitesTemplateCSV} className="text-xs px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300">
                      ⬇ Plantilla CSV
                    </button>
                    <button onClick={() => sitesImportRef.current?.click()} className="text-xs px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300">
                      ⬆ Importar CSV
                    </button>
                    <input ref={sitesImportRef} type="file" accept=".csv" className="hidden"
                      onChange={(e) => { handleImportSitesCSV(e.target.files?.[0]); e.target.value=''; }} />
                  </div>
                )}
              </div>

              {/* Tabla de sedes */}
              <div className="rounded-xl border border-neutral-800 overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-neutral-800/60">
                    <tr className="text-[11px] text-neutral-500">
                      <th className="text-left px-4 py-2.5 font-normal w-24">Código</th>
                      <th className="text-left px-4 py-2.5 font-normal">Nombre</th>
                      <th className="text-left px-4 py-2.5 font-normal w-24">Estado</th>
                      {isAdmin && <th className="px-4 py-2.5 font-normal w-20 text-right">Acciones</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {(sites || []).length === 0 && (
                      <tr><td colSpan={4} className="px-4 py-6 text-center text-neutral-500">
                        Sin sedes. {isAdmin ? 'Creá la primera abajo.' : ''}
                      </td></tr>
                    )}
                    {(sites || []).map((s: any) => (
                      <tr key={s.id} className="border-t border-neutral-800/70 hover:bg-neutral-800/20">
                        <td className="px-4 py-2">
                          {isAdmin ? (
                            <input
                              className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1 text-xs text-neutral-100 font-mono uppercase"
                              value={s.code}
                              onChange={(e) => updateSite(s.id, { code: e.target.value.toUpperCase() })}
                              maxLength={10}
                            />
                          ) : (
                            <span className="font-mono font-semibold text-neutral-200">{s.code}</span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          {isAdmin ? (
                            <input
                              className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1 text-xs text-neutral-100"
                              value={s.name}
                              onChange={(e) => updateSite(s.id, { name: e.target.value })}
                            />
                          ) : (
                            <span className="text-neutral-200">{s.name}</span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          {isAdmin ? (
                            <label className="inline-flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" checked={!!s.active} onChange={(e) => updateSite(s.id, { active: e.target.checked })} className="rounded" />
                              <span className={s.active ? 'text-emerald-400' : 'text-neutral-500'}>
                                {s.active ? 'Activa' : 'Inactiva'}
                              </span>
                            </label>
                          ) : (
                            <span className={cls('px-2 py-0.5 rounded-full text-[10px]', s.active ? 'bg-emerald-900/40 text-emerald-400' : 'bg-neutral-800 text-neutral-500')}>
                              {s.active ? 'Activa' : 'Inactiva'}
                            </span>
                          )}
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-2 text-right">
                            <button onClick={() => deleteSite(s.id)} className="text-red-400 hover:text-red-300 text-[11px] px-2 py-1 rounded-lg hover:bg-red-950/40">Borrar</button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Formulario nueva sede */}
              {isAdmin && (
                <div className="flex gap-2 items-center pt-1">
                  <input
                    className="w-24 rounded-xl bg-neutral-800 border border-neutral-700 px-3 py-1.5 text-xs text-neutral-100 font-mono uppercase placeholder:text-neutral-600"
                    placeholder="CÓDIGO"
                    value={newSite.code}
                    maxLength={10}
                    onChange={(e) => setNewSite(v => ({ ...v, code: e.target.value.toUpperCase() }))}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSite()}
                  />
                  <input
                    className="flex-1 rounded-xl bg-neutral-800 border border-neutral-700 px-3 py-1.5 text-xs text-neutral-100 placeholder:text-neutral-600"
                    placeholder="Nombre de la sede (ej: Sanatorio Galicia)"
                    value={newSite.name}
                    onChange={(e) => setNewSite(v => ({ ...v, name: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSite()}
                  />
                  <button onClick={handleAddSite} className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium">
                    + Agregar sede
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ═══════════ TAB: SECTORES ═══════════ */}
          {tab === 'sectores' && (
            <div className="space-y-4">
              <p className="text-xs text-neutral-500">
                Los sectores son nombres reutilizables en múltiples sedes. La detección busca el nombre del sector en el nombre del archivo (sin tildes, sin importar mayúsculas).
              </p>

              <div className="rounded-xl border border-neutral-800 overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-neutral-800/60">
                    <tr className="text-[11px] text-neutral-500">
                      <th className="text-left px-4 py-2.5 font-normal">Nombre del sector</th>
                      <th className="text-left px-4 py-2.5 font-normal w-32">Estado</th>
                      {isAdmin && <th className="px-4 py-2.5 font-normal w-20 text-right">Acciones</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {(sectors || []).length === 0 && (
                      <tr><td colSpan={3} className="px-4 py-6 text-center text-neutral-500">
                        Sin sectores. {isAdmin ? 'Agregá el primero abajo.' : ''}
                      </td></tr>
                    )}
                    {(sectors || []).map((s: any) => (
                      <tr key={s.id} className="border-t border-neutral-800/70 hover:bg-neutral-800/20">
                        <td className="px-4 py-2">
                          {isAdmin ? (
                            <input
                              className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1 text-xs text-neutral-100"
                              value={s.name}
                              onChange={(e) => updateSector(s.id, { name: e.target.value })}
                            />
                          ) : (
                            <span className="text-neutral-200">{s.name}</span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          {isAdmin ? (
                            <label className="inline-flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" checked={!!s.active} onChange={(e) => updateSector(s.id, { active: e.target.checked })} />
                              <span className={s.active ? 'text-emerald-400' : 'text-neutral-500'}>{s.active ? 'Activo' : 'Inactivo'}</span>
                            </label>
                          ) : (
                            <span className={cls('px-2 py-0.5 rounded-full text-[10px]', s.active ? 'bg-emerald-900/40 text-emerald-400' : 'bg-neutral-800 text-neutral-500')}>
                              {s.active ? 'Activo' : 'Inactivo'}
                            </span>
                          )}
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-2 text-right">
                            <button onClick={() => deleteSector(s.id)} className="text-red-400 hover:text-red-300 text-[11px] px-2 py-1 rounded-lg hover:bg-red-950/40">Borrar</button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {isAdmin && (
                <div className="flex gap-2 items-center pt-1">
                  <input
                    className="flex-1 rounded-xl bg-neutral-800 border border-neutral-700 px-3 py-1.5 text-xs text-neutral-100 placeholder:text-neutral-600"
                    placeholder="Nombre del sector (ej: Farmacia, Block Quirúrgico)"
                    value={newSectorName}
                    onChange={(e) => setNewSectorName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSector()}
                  />
                  <button onClick={handleAddSector} className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium">
                    + Agregar sector
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ═══════════ TAB: COMBINACIONES ═══════════ */}
          {tab === 'combinaciones' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-xs text-neutral-500 flex-1">
                  Solo se aceptan archivos cuya combinación <strong className="text-neutral-300">sede + sector + subcategoría</strong> exista aquí.
                  La barra de progreso se basa en el total de combinaciones activas.
                </p>
                {isAdmin && (
                  <div className="flex gap-2">
                    <button onClick={downloadCombinationsTemplateCSV} className="text-xs px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300">
                      ⬇ Plantilla CSV
                    </button>
                    <button onClick={() => combosImportRef.current?.click()} className="text-xs px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300">
                      ⬆ Importar CSV
                    </button>
                    <input ref={combosImportRef} type="file" accept=".csv" className="hidden"
                      onChange={(e) => { handleImportCombinationsCSV(e); }} />
                  </div>
                )}
              </div>

              {/* Filtro por sede */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-500">Filtrar por sede:</span>
                <select
                  className="rounded-xl bg-neutral-800 border border-neutral-700 px-3 py-1 text-xs text-neutral-100"
                  value={filterSite}
                  onChange={(e) => setFilterSite(e.target.value)}
                >
                  <option value="">Todas las sedes</option>
                  {(sites || []).filter((s:any)=>s.active).map((s:any) => (
                    <option key={s.code} value={s.code}>{s.code} — {s.name}</option>
                  ))}
                </select>
                <span className="text-[11px] text-neutral-600">
                  {visibleCombos.filter((c:any)=>c.active).length} activas · {visibleCombos.length} total
                </span>
              </div>

              {/* Tabla */}
              <div className="rounded-xl border border-neutral-800 overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-neutral-800/60 sticky top-0">
                    <tr className="text-[11px] text-neutral-500">
                      <th className="text-left px-3 py-2.5 font-normal w-20">Sede</th>
                      <th className="text-left px-3 py-2.5 font-normal">Sector</th>
                      <th className="text-left px-3 py-2.5 font-normal">Subcategoría</th>
                      <th className="text-left px-3 py-2.5 font-normal w-24">CC</th>
                      <th className="text-left px-3 py-2.5 font-normal w-28">Responsable</th>
                      <th className="text-left px-3 py-2.5 font-normal w-24">Sin nov.</th>
                      <th className="text-left px-3 py-2.5 font-normal w-20">Estado</th>
                      {isAdmin && <th className="px-3 py-2.5 font-normal w-20 text-right">Acciones</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleCombos.length === 0 && (
                      <tr><td colSpan={8} className="px-4 py-8 text-center text-neutral-500">
                        Sin combinaciones. {isAdmin ? 'Creá la primera abajo.' : ''}
                      </td></tr>
                    )}
                    {visibleCombos.map((c: any) => (
                      <tr key={c.id} className="border-t border-neutral-800/70 hover:bg-neutral-800/20">
                        <td className="px-3 py-2">
                          {isAdmin ? (
                            <select
                              className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1 text-xs text-neutral-100 font-mono"
                              value={c.siteCode}
                              onChange={(e) => updateCombination(c.id, { siteCode: e.target.value })}
                            >
                              {(sites||[]).filter((s:any)=>s.active).map((s:any) => (
                                <option key={s.code} value={s.code}>{s.code}</option>
                              ))}
                            </select>
                          ) : (
                            <span className="font-mono font-semibold text-neutral-300">{c.siteCode}</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {isAdmin ? (
                            <input
                              className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1 text-xs text-neutral-100"
                              value={c.sectorName}
                              onChange={(e) => updateCombination(c.id, { sectorName: e.target.value })}
                            />
                          ) : (
                            <span className="text-neutral-200">{c.sectorName}</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {isAdmin ? (
                            <input
                              className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1 text-xs text-neutral-400 placeholder:text-neutral-700"
                              value={c.subcategory || ''}
                              placeholder="vacío"
                              onChange={(e) => updateCombination(c.id, { subcategory: e.target.value || null })}
                            />
                          ) : (
                            <span className="text-neutral-500 italic">{c.subcategory || '—'}</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {isAdmin ? (
                            <input
                              className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1 text-xs text-neutral-300 placeholder:text-neutral-700"
                              value={c.cc || ''}
                              placeholder="—"
                              onChange={(e) => updateCombination(c.id, { cc: e.target.value || null })}
                            />
                          ) : (
                            <span className="text-neutral-400 text-xs">{c.cc || '—'}</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {isAdmin ? (
                            <select
                              className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-1 text-xs text-neutral-100"
                              value={c.ownerUserId || ''}
                              onChange={(e) => {
                                const u = (rrhhUsers||[]).find((x:any)=>x.id===e.target.value);
                                updateCombination(c.id, { ownerUserId: e.target.value||null, ownerUsername: u?(u.displayName||u.username):null });
                              }}
                            >
                              <option value="">(Sin asignar)</option>
                              {(rrhhUsers||[]).map((u:any) => (
                                <option key={u.id} value={u.id}>{u.displayName||u.username}</option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-neutral-400">{c.ownerUsername || '—'}</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {isAdmin ? (
                            <label className="inline-flex items-center gap-1.5 cursor-pointer">
                              <input type="checkbox" checked={!!c.allowNoNews} onChange={(e) => updateCombination(c.id, { allowNoNews: e.target.checked })} />
                              <span className="text-[11px] text-neutral-400">Cuenta</span>
                            </label>
                          ) : (
                            <span className="text-[11px] text-neutral-500">{c.allowNoNews ? 'Cuenta' : 'No cuenta'}</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {isAdmin ? (
                            <label className="inline-flex items-center gap-1.5 cursor-pointer">
                              <input type="checkbox" checked={!!c.active} onChange={(e) => updateCombination(c.id, { active: e.target.checked })} />
                              <span className={c.active ? 'text-emerald-400 text-[11px]' : 'text-neutral-500 text-[11px]'}>
                                {c.active ? 'Activa' : 'Inactiva'}
                              </span>
                            </label>
                          ) : (
                            <span className={cls('px-2 py-0.5 rounded-full text-[10px]', c.active ? 'bg-emerald-900/40 text-emerald-400' : 'bg-neutral-800 text-neutral-500')}>
                              {c.active ? 'Activa' : 'Inactiva'}
                            </span>
                          )}
                        </td>
                        {isAdmin && (
                          <td className="px-3 py-2 text-right">
                            <button onClick={() => deleteCombination(c.id)} className="text-red-400 hover:text-red-300 text-[11px] px-2 py-1 rounded-lg hover:bg-red-950/40">Borrar</button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Formulario nueva combinación */}
              {isAdmin && (
                <div className="rounded-xl border border-neutral-700/60 bg-neutral-800/30 p-4 space-y-3">
                  <p className="text-[11px] text-neutral-500 font-medium">Nueva combinación</p>
                  <div className="flex gap-2 flex-wrap">
                    <select
                      className="rounded-xl bg-neutral-800 border border-neutral-700 px-3 py-1.5 text-xs text-neutral-100 font-mono"
                      value={newCombo.siteCode}
                      onChange={(e) => setNewCombo(v => ({ ...v, siteCode: e.target.value }))}
                    >
                      <option value="">Sede *</option>
                      {(sites||[]).filter((s:any)=>s.active).map((s:any) => (
                        <option key={s.code} value={s.code}>{s.code} — {s.name}</option>
                      ))}
                    </select>
                    <input
                      className="flex-1 min-w-32 rounded-xl bg-neutral-800 border border-neutral-700 px-3 py-1.5 text-xs text-neutral-100 placeholder:text-neutral-600"
                      placeholder="Sector *"
                      value={newCombo.sectorName}
                      onChange={(e) => setNewCombo(v => ({ ...v, sectorName: e.target.value }))}
                    />
                    <input
                      className="flex-1 min-w-28 rounded-xl bg-neutral-800 border border-neutral-700 px-3 py-1.5 text-xs text-neutral-400 placeholder:text-neutral-700"
                      placeholder="Subcategoría (vacío si no aplica)"
                      value={newCombo.subcategory}
                      onChange={(e) => setNewCombo(v => ({ ...v, subcategory: e.target.value }))}
                    />
                    <input
                      className="w-24 rounded-xl bg-neutral-800 border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 placeholder:text-neutral-700"
                      placeholder="CC (opcional)"
                      value={newCombo.cc}
                      onChange={(e) => setNewCombo(v => ({ ...v, cc: e.target.value }))}
                    />
                    <select
                      className="rounded-xl bg-neutral-800 border border-neutral-700 px-3 py-1.5 text-xs text-neutral-100"
                      value={newCombo.ownerUserId}
                      onChange={(e) => setNewCombo(v => ({ ...v, ownerUserId: e.target.value }))}
                    >
                      <option value="">Responsable (opcional)</option>
                      {(rrhhUsers||[]).map((u:any) => (
                        <option key={u.id} value={u.id}>{u.displayName||u.username}</option>
                      ))}
                    </select>
                    <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-800 border border-neutral-700 cursor-pointer text-xs text-neutral-400">
                      <input type="checkbox" checked={newCombo.allowNoNews} onChange={(e) => setNewCombo(v => ({ ...v, allowNoNews: e.target.checked }))} />
                      Sin nov. cuenta
                    </label>
                    <button onClick={handleAddCombo} className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium whitespace-nowrap">
                      + Agregar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* ── Footer ─────────────────────────────────────────────── */}
        <div className="px-6 py-3 border-t border-neutral-800 flex items-center justify-between">
          <span className="text-[11px] text-neutral-600">
            {(combinations||[]).filter((c:any)=>c.active).length} combinaciones activas · denominador de la barra de progreso
          </span>
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
