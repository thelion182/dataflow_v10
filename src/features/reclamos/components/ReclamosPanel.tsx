// @ts-nocheck
import React, { useState } from 'react';
import { useReclamos } from '../hooks/useReclamos';
import { useReclamosConfig } from '../hooks/useReclamosConfig';
import { useNotificaciones } from '../hooks/useNotificaciones';
import { uuid } from '../../../lib/ids';
import { logAudit } from '../../../lib/audit';
import { TablaReclamos } from './TablaReclamos';
import { TablaReclamosView } from './TablaReclamosView';
import { KanbanReclamos } from './KanbanReclamos';
import { FormularioReclamo } from './FormularioReclamo';
import { DetalleReclamo } from './DetalleReclamo';
import { ReportesReclamos } from './ReportesReclamos';
import { ReclamosConfig } from './ReclamosConfig';
import type { Reclamo, EstadoReclamo } from '../types/reclamo.types';

interface Props {
  meRole: string;
  meId: string;
  meNombre: string;
}

type Tab = 'rrhh' | 'sueldos' | 'reportes' | 'config';

function generarTicket(): string {
  const hoy = new Date();
  const fecha = hoy.toISOString().slice(0, 10).replace(/-/g, '');
  const sufijo = Math.floor(1000 + Math.random() * 9000);
  return `RC-${fecha}-${sufijo}`;
}

export function ReclamosPanel({ meRole, meId, meNombre }: Props) {
  const isRrhh = meRole === 'rrhh';
  const isSueldos = meRole === 'sueldos';
  const isAdminOrSuper = meRole === 'admin' || meRole === 'superadmin';

  const defaultTab: Tab = isRrhh ? 'rrhh' : isSueldos ? 'sueldos' : 'rrhh';
  const [tab, setTab] = useState<Tab>(defaultTab);

  const {
    reclamos, filtrados, filtros, setFiltros,
    crear, eliminar, eliminarLote, cambiarEstado, reload, exportarCSV, agregarNotaInterna,
  } = useReclamos({ meId });

  const {
    config,
    agregarItem, editarItem, eliminarItem,
    setEmailSueldos, setWhatsappActivo, setLogoDataUrl, setNotificarLiquidado,
  } = useReclamosConfig({ meId });

  const {
    generarNotificacionCreacion,
    generarNotificacionVistaEnSueldos,
    generarNotificacionCambioEstado,
  } = useNotificaciones();

  const [formularioOpen, setFormularioOpen] = useState(false);
  const [detalleReclamo, setDetalleReclamo] = useState<Reclamo | null>(null);
  const [vistaKanban, setVistaKanban] = useState(false);

  function handleGuardarReclamo(data: any) {
    const reclamo: Reclamo = {
      id: uuid(),
      ticket: generarTicket(),
      nroFuncionario: data.nroFuncionario,
      nombreFuncionario: data.nombreFuncionario,
      emailFuncionario: data.emailFuncionario,
      cargo: data.cargo,
      centroCosto: data.centroCosto,
      liquidacion: data.liquidacion,
      paraLiquidacion: data.paraLiquidacion || '',
      causal: data.causal,
      tipoReclamo: data.tipoReclamo,
      descripcion: data.descripcion,
      emisorId: data.emisorId,
      emisorNombre: data.emisorNombre,
      fechaEmision: new Date().toISOString(),
      estado: 'Emitido',
      historialEstados: [{
        estado: 'Emitido',
        fecha: new Date().toISOString(),
        usuarioId: data.emisorId,
        usuarioNombre: data.emisorNombre,
      }],
      notificaciones: [],
      adjuntos: data.adjuntos || [],
      eliminado: false,
    };
    crear(reclamo);
    logAudit({
      modulo: 'reclamos',
      accion: 'crear_reclamo',
      entidadId: reclamo.id,
      entidadRef: reclamo.ticket,
      detalles: `Funcionario: ${reclamo.nombreFuncionario} · Tipo: ${reclamo.tipoReclamo}`,
    });
    if (data.notificarEmail !== false) {
      generarNotificacionCreacion(reclamo);
    }
    reload();
    setFormularioOpen(false);
  }

  // Ver reclamo: si es Sueldos y el estado es "Emitido" → cambia a "En proceso" automáticamente
  async function handleVer(r: Reclamo) {
    setDetalleReclamo(r);
    if (isSueldos && r.estado === 'Emitido') {
      await cambiarEstado(r.id, 'En proceso', meId, meNombre, undefined, r.estado);
      generarNotificacionVistaEnSueldos(r);
      reload();
    }
  }

  async function handleCambiarEstado(r: Reclamo, estado: EstadoReclamo, nota: string) {
    const estadoAnterior = r.estado;
    await cambiarEstado(r.id, estado, meId, meNombre, nota || undefined, estadoAnterior);
    logAudit({
      modulo: 'reclamos',
      accion: 'cambiar_estado',
      entidadId: r.id,
      entidadRef: r.ticket,
      detalles: `${estadoAnterior} → ${estado}${nota ? ` · Nota: ${nota}` : ''}`,
    });
    const actualizado = { ...r, estado };
    generarNotificacionCambioEstado(actualizado, estadoAnterior, nota || undefined);
    reload();
  }

  // Cambio de estado en lote (desde TablaReclamosView)
  async function handleCambiarEstadoLote(ids: string[], estado: EstadoReclamo, nota: string) {
    for (const id of ids) {
      const r = reclamos.find(x => x.id === id);
      if (!r) continue;
      const estadoAnterior = r.estado;
      await cambiarEstado(id, estado, meId, meNombre, nota || undefined, estadoAnterior);
      logAudit({
        modulo: 'reclamos',
        accion: 'cambiar_estado',
        entidadId: r.id,
        entidadRef: r.ticket,
        detalles: `[Lote] ${estadoAnterior} → ${estado}${nota ? ` · Nota: ${nota}` : ''}`,
      });
      const actualizado = { ...r, estado };
      generarNotificacionCambioEstado(actualizado, estadoAnterior, nota || undefined);
    }
    reload();
  }

  const tabs: { key: Tab; label: string; visible: boolean }[] = [
    { key: 'rrhh', label: 'Información', visible: isRrhh || isAdminOrSuper },
    { key: 'sueldos', label: 'Sueldos', visible: isSueldos || isAdminOrSuper },
    { key: 'reportes', label: 'Reportes', visible: true },
    { key: 'config', label: 'Configuración', visible: isAdminOrSuper },
  ];

  const visibleTabs = tabs.filter(t => t.visible);

  // Contadores de estado (solo reclamos no eliminados)
  const activos = reclamos.filter(r => !r.eliminado);
  const cntEmitido = activos.filter(r => r.estado === 'Emitido').length;
  const cntEnProceso = activos.filter(r => r.estado === 'En proceso').length;
  const hoy = new Date();
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString();
  const cntEsteMes = activos.filter(r => (r.fechaEmision || r.createdAt || '') >= inicioMes).length;

  return (
    <div className="space-y-4">
      {/* Contadores rápidos */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-blue-500/25 bg-blue-500/10">
          <span className="text-[11px] text-blue-400 font-medium uppercase tracking-wide">Emitidos</span>
          <span className="text-base font-bold text-blue-300 tabular-nums">{cntEmitido}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-amber-500/25 bg-amber-500/10">
          <span className="text-[11px] text-amber-400 font-medium uppercase tracking-wide">En proceso</span>
          <span className="text-base font-bold text-amber-300 tabular-nums">{cntEnProceso}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-neutral-700 bg-neutral-800/60">
          <span className="text-[11px] text-neutral-400 font-medium uppercase tracking-wide">Este mes</span>
          <span className="text-base font-bold text-neutral-200 tabular-nums">{cntEsteMes}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-neutral-700 bg-neutral-800/60">
          <span className="text-[11px] text-neutral-400 font-medium uppercase tracking-wide">Total</span>
          <span className="text-base font-bold text-neutral-200 tabular-nums">{activos.length}</span>
        </div>
      </div>

      {/* Tabs + toggle vista */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        {visibleTabs.length > 1 && (
          <div className="flex gap-1 bg-neutral-800/60 p-1 rounded-xl w-fit">
            {visibleTabs.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  tab === t.key
                    ? 'bg-neutral-700 text-neutral-100'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
        {/* Toggle tabla/kanban (solo en tabs rrhh y sueldos) */}
        {(tab === 'rrhh' || tab === 'sueldos') && (
          <div className="flex items-center gap-1 bg-neutral-800/60 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setVistaKanban(false)}
              title="Vista tabla"
              style={{ padding: '5px 10px' }}
              className={`rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium ${!vistaKanban ? 'bg-neutral-700 text-neutral-100' : 'text-neutral-500 hover:text-neutral-300'}`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="1" y="3" width="14" height="2" rx="0.5" fill="currentColor" stroke="none" />
                <rect x="1" y="7" width="14" height="2" rx="0.5" fill="currentColor" stroke="none" />
                <rect x="1" y="11" width="14" height="2" rx="0.5" fill="currentColor" stroke="none" />
              </svg>
              Tabla
            </button>
            <button
              type="button"
              onClick={() => setVistaKanban(true)}
              title="Vista Kanban"
              style={{ padding: '5px 10px' }}
              className={`rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium ${vistaKanban ? 'bg-neutral-700 text-neutral-100' : 'text-neutral-500 hover:text-neutral-300'}`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="1" y="2" width="4" height="12" rx="1" />
                <rect x="6" y="2" width="4" height="8" rx="1" />
                <rect x="11" y="2" width="4" height="10" rx="1" />
              </svg>
              Kanban
            </button>
          </div>
        )}
      </div>

      {/* Vistas */}
      {tab === 'rrhh' && !vistaKanban && (
        <TablaReclamos
          filtrados={filtrados}
          filtros={filtros}
          setFiltros={setFiltros}
          tiposReclamo={config.tiposReclamo}
          liquidaciones={config.liquidaciones}
          meRole={meRole}
          onNuevo={() => setFormularioOpen(true)}
          onVer={handleVer}
          onEliminar={r => {
            eliminar(r.id, meId, meNombre);
            logAudit({ modulo: 'reclamos', accion: 'eliminar_reclamo', entidadId: r.id, entidadRef: r.ticket, detalles: `Funcionario: ${r.nombreFuncionario}` });
          }}
          onEliminarLote={ids => {
            ids.forEach(id => {
              const r = reclamos.find(x => x.id === id);
              logAudit({ modulo: 'reclamos', accion: 'eliminar_reclamo', entidadId: id, entidadRef: r?.ticket, detalles: `[Lote] Funcionario: ${r?.nombreFuncionario}` });
            });
            eliminarLote(ids, meId, meNombre);
          }}
          onCambiarEstado={handleCambiarEstado}
          onExportarCSV={exportarCSV}
        />
      )}

      {tab === 'rrhh' && vistaKanban && (
        <KanbanReclamos
          reclamos={filtrados}
          isSueldos={false}
          onVer={handleVer}
          onCambiarEstado={handleCambiarEstado}
        />
      )}

      {tab === 'sueldos' && !vistaKanban && (
        <TablaReclamosView
          filtrados={filtrados}
          filtros={filtros}
          setFiltros={setFiltros}
          tiposReclamo={config.tiposReclamo}
          liquidaciones={config.liquidaciones}
          isSueldos={isSueldos}
          onVer={handleVer}
          onCambiarEstado={handleCambiarEstado}
          onCambiarEstadoLote={handleCambiarEstadoLote}
          onExportarCSV={exportarCSV}
        />
      )}

      {tab === 'sueldos' && vistaKanban && (
        <KanbanReclamos
          reclamos={filtrados}
          isSueldos={isSueldos}
          onVer={handleVer}
          onCambiarEstado={handleCambiarEstado}
        />
      )}

      {tab === 'reportes' && (
        <ReportesReclamos reclamos={reclamos} />
      )}

      {tab === 'config' && (
        <ReclamosConfig
          config={config}
          onAgregarItem={agregarItem}
          onEditarItem={editarItem}
          onEliminarItem={eliminarItem}
          onSetEmailSueldos={setEmailSueldos}
          onSetWhatsappActivo={setWhatsappActivo}
          onSetLogoDataUrl={setLogoDataUrl}
          onSetNotificarLiquidado={setNotificarLiquidado}
        />
      )}

      {/* Modales */}
      {formularioOpen && (
        <FormularioReclamo
          config={config}
          emisorId={meId}
          emisorNombre={meNombre}
          onGuardar={handleGuardarReclamo}
          onCancelar={() => setFormularioOpen(false)}
        />
      )}

      {detalleReclamo && (
        <DetalleReclamo
          reclamo={reclamos.find(r => r.id === detalleReclamo.id) || detalleReclamo}
          meId={meId}
          meNombre={meNombre}
          onAgregarNota={(reclamoId, nota) => { agregarNotaInterna(reclamoId, nota); }}
          onClose={() => setDetalleReclamo(null)}
        />
      )}
    </div>
  );
}
