// @ts-nocheck
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { db } from '../../../services/db';
import type { Reclamo, EstadoReclamo } from '../types/reclamo.types';

export interface FiltrosReclamo {
  estado: string;        // '' = todos
  tipo: string;          // '' = todos
  desde: string;         // ISO date o ''
  hasta: string;         // ISO date o ''
  busqueda: string;      // nombre / ticket / nroFuncionario
  mostrarEliminados: boolean;
  liquidacion: string;   // '' = todas
  paraLiquidacion: string; // '' = todas
}

const FILTROS_VACÍOS: FiltrosReclamo = {
  estado: '',
  tipo: '',
  desde: '',
  hasta: '',
  busqueda: '',
  mostrarEliminados: false,
  liquidacion: '',
  paraLiquidacion: '',
};

export function useReclamos({ meId }: { meId?: string } = {}) {
  const skipSave = useRef(true);
  const [reclamos, setReclamos] = useState<Reclamo[]>(() => {
    const r = db.reclamos.getAll();
    if (Array.isArray(r)) { skipSave.current = false; return r; }
    return [];
  });
  const [filtros, setFiltros] = useState<FiltrosReclamo>(FILTROS_VACÍOS);

  // Carga async para modo API (cuando el usuario se loguea)
  useEffect(() => {
    if (!meId) return;
    const r = db.reclamos.getAll();
    if (r && typeof (r as any).then === 'function') {
      (r as any).then((arr: any) => { if (Array.isArray(arr)) { skipSave.current = false; setReclamos(arr); } }).catch(() => {});
    }
  }, [meId]);

  function reload() {
    const r = db.reclamos.getAll();
    if (r && typeof (r as any).then === 'function') {
      (r as any).then((arr: any) => { if (Array.isArray(arr)) setReclamos(arr); }).catch(() => {});
    } else if (Array.isArray(r)) {
      setReclamos(r);
    }
  }

  // Recarga automática cuando llega un evento SSE de reclamos
  useEffect(() => {
    const handler = () => reload();
    window.addEventListener('dataflow:reclamos:refresh', handler);
    return () => window.removeEventListener('dataflow:reclamos:refresh', handler);
  }, []);

  const crear = useCallback(async (data: Reclamo) => {
    await db.reclamos.create(data);
    reload();
  }, []);

  const actualizar = useCallback(async (id: string, changes: Partial<Reclamo>) => {
    await db.reclamos.update(id, changes);
    reload();
  }, []);

  const eliminar = useCallback(
    async (id: string, usuarioId: string, usuarioNombre: string, nota?: string) => {
      await db.reclamos.softDelete(id, usuarioId, usuarioNombre, nota);
      reload();
    },
    []
  );

  const eliminarLote = useCallback(
    async (ids: string[], usuarioId: string, usuarioNombre: string) => {
      for (const id of ids) {
        await db.reclamos.softDelete(id, usuarioId, usuarioNombre);
      }
      reload();
    },
    []
  );

  const cambiarEstado = useCallback(
    async (
      id: string,
      estado: EstadoReclamo,
      usuarioId: string,
      usuarioNombre: string,
      nota?: string
    ) => {
      await db.reclamos.updateEstado(id, estado, usuarioId, usuarioNombre, nota);
      reload();
    },
    []
  );

  const agregarNotificacion = useCallback(async (id: string, notif: any) => {
    await db.reclamos.addNotificacion(id, notif);
    reload();
  }, []);

  const agregarNotaInterna = useCallback(async (id: string, nota: any) => {
    await db.reclamos.addNotaInterna(id, nota);
    reload();
  }, []);

  const filtrados = useMemo(() => {
    return reclamos.filter((r) => {
      if (!filtros.mostrarEliminados && r.eliminado) return false;
      if (filtros.estado && r.estado !== filtros.estado) return false;
      if (filtros.tipo && r.tipoReclamo !== filtros.tipo) return false;
      if (filtros.liquidacion && r.liquidacion !== filtros.liquidacion) return false;
      if (filtros.paraLiquidacion && (r as any).paraLiquidacion !== filtros.paraLiquidacion) return false;
      const fe = r.fechaEmision || r.createdAt || '';
      if (filtros.desde && fe < filtros.desde) return false;
      if (filtros.hasta && fe > filtros.hasta + 'T23:59:59') return false;
      if (filtros.busqueda) {
        const q = filtros.busqueda.toLowerCase();
        if (
          !r.ticket.toLowerCase().includes(q) &&
          !r.nombreFuncionario.toLowerCase().includes(q) &&
          !r.nroFuncionario.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [reclamos, filtros]);

  function exportarCSV() {
    const cols = [
      'Ticket','Nro Funcionario','Nombre','Cargo','Centro Costo',
      'Liquidacion','Tipo','Causal','Estado','Fecha Emision','Emisor',
    ];
    const rows = filtrados.map((r) => [
      r.ticket, r.nroFuncionario, r.nombreFuncionario, r.cargo,
      r.centroCosto, r.liquidacion, r.tipoReclamo, r.causal,
      r.estado, (r.fechaEmision || r.createdAt || '').slice(0, 10), r.emisorNombre,
    ]);
    const csv = [cols, ...rows]
      .map((row) => row.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reclamos-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return {
    reclamos,
    filtrados,
    filtros,
    setFiltros,
    reload,
    crear,
    actualizar,
    eliminar,
    eliminarLote,
    cambiarEstado,
    agregarNotificacion,
    agregarNotaInterna,
    exportarCSV,
  };
}
