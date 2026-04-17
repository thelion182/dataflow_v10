// @ts-nocheck
import { useState, useCallback, useEffect } from 'react';
import { db } from '../../../services/db';
import type { ReclamosConfig } from '../types/reclamo.types';

const DEFAULT_CONFIG: ReclamosConfig = {
  cargos: [], centrosCosto: [], liquidaciones: [],
  causales: [], tiposReclamo: [],
  emailSueldos: '', whatsappActivo: false, notificarLiquidado: false,
};

export function useReclamosConfig({ meId }: { meId?: string } = {}) {
  const [config, setConfig] = useState<ReclamosConfig>(() => {
    const r = db.reclamosConfig.get();
    if (r && typeof (r as any).then !== 'function') return r;
    return DEFAULT_CONFIG;
  });

  // Carga async para modo API (cuando el usuario se loguea)
  useEffect(() => {
    if (!meId) return;
    const r = db.reclamosConfig.get();
    if (r && typeof (r as any).then === 'function') {
      (r as any).then((v: any) => { if (v && typeof v === 'object') setConfig(v); }).catch(() => {});
    }
  }, [meId]);

  function reload() {
    const r = db.reclamosConfig.get();
    if (r && typeof (r as any).then === 'function') {
      (r as any).then((v: any) => { if (v && typeof v === 'object') setConfig(v); }).catch(() => {});
    } else if (r && typeof r === 'object') {
      setConfig(r);
    }
  }

  const guardar = useCallback((nueva: ReclamosConfig) => {
    db.reclamosConfig.save(nueva);
    setConfig(nueva);
  }, []);

  function agregarItem(campo: keyof ReclamosConfig, valor: string) {
    if (typeof config[campo] !== 'object' || !Array.isArray(config[campo])) return;
    if ((config[campo] as string[]).includes(valor)) return;
    const nueva = {
      ...config,
      [campo]: [...(config[campo] as string[]), valor],
    };
    guardar(nueva);
  }

  function editarItem(campo: keyof ReclamosConfig, idx: number, valor: string) {
    if (!Array.isArray(config[campo])) return;
    const arr = [...(config[campo] as string[])];
    arr[idx] = valor;
    guardar({ ...config, [campo]: arr });
  }

  function eliminarItem(campo: keyof ReclamosConfig, idx: number) {
    if (!Array.isArray(config[campo])) return;
    const arr = (config[campo] as string[]).filter((_, i) => i !== idx);
    guardar({ ...config, [campo]: arr });
  }

  function setEmailSueldos(email: string) {
    guardar({ ...config, emailSueldos: email });
  }

  function setWhatsappActivo(activo: boolean) {
    guardar({ ...config, whatsappActivo: activo });
  }

  function setLogoDataUrl(dataUrl: string) {
    guardar({ ...config, logoDataUrl: dataUrl });
  }

  function setNotificarLiquidado(activo: boolean) {
    guardar({ ...config, notificarLiquidado: activo });
  }

  return {
    config,
    reload,
    guardar,
    agregarItem,
    editarItem,
    eliminarItem,
    setEmailSueldos,
    setWhatsappActivo,
    setLogoDataUrl,
    setNotificarLiquidado,
  };
}
