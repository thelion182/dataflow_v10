// @ts-nocheck
import { useState, useCallback } from 'react';
import { db } from '../../../services/db';
import type { ReclamosConfig } from '../types/reclamo.types';

export function useReclamosConfig() {
  const [config, setConfig] = useState<ReclamosConfig>(() => db.reclamosConfig.get());

  function reload() {
    setConfig(db.reclamosConfig.get());
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
