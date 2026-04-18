// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cls } from '../../lib/cls';

const CONFIG_KEY = 'dataflow-user-config-v1';

export const DEFAULT_CONFIG = {
  // Notificaciones por categoría
  notifications: {
    subidas:       true,
    descargas:     true,
    dudas:         true,
    respuestas:    true,
    procesamiento: true,
    reclamos:      true,
  },
  // (reservado para futuras opciones)
  // theme: 'dark',
  // rowsPerPage: 20,
};

export function loadUserConfig(): typeof DEFAULT_CONFIG {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    const saved = JSON.parse(raw);
    // merge con defaults para no romper si hay keys nuevas
    return {
      notifications: { ...DEFAULT_CONFIG.notifications, ...(saved.notifications || {}) },
    };
  } catch {
    return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  }
}

function saveUserConfig(cfg: typeof DEFAULT_CONFIG) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
}

const NOTIF_LABELS: Record<string, string> = {
  subidas:       'Archivos nuevos / actualizados',
  descargas:     'Descargas de archivos',
  dudas:         'Nuevas dudas',
  respuestas:    'Dudas respondidas',
  procesamiento: 'Dudas procesadas',
  reclamos:      'Reclamos (creación, estado, notas)',
};

interface Props {
  onClose: () => void;
}

export function UserConfigModal({ onClose }: Props) {
  const [cfg, setCfg] = useState<typeof DEFAULT_CONFIG>(() => loadUserConfig());

  function toggleNotif(key: string) {
    setCfg(prev => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: !prev.notifications[key] },
    }));
  }

  function handleSave() {
    saveUserConfig(cfg);
    onClose();
  }

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚙️</span>
            <h2 className="text-lg font-semibold text-neutral-100">Configuración</h2>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-200 text-xl leading-none">×</button>
        </div>

        {/* Notificaciones */}
        <section>
          <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wide mb-3">
            Notificaciones en tiempo real
          </h3>
          <div className="space-y-2">
            {Object.entries(NOTIF_LABELS).map(([key, label]) => (
              <label key={key} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-750 cursor-pointer group">
                <span className="text-sm text-neutral-200">{label}</span>
                <button
                  onClick={() => toggleNotif(key)}
                  className={cls(
                    'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none',
                    cfg.notifications[key] ? 'bg-emerald-500' : 'bg-neutral-600'
                  )}
                >
                  <span
                    className={cls(
                      'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                      cfg.notifications[key] ? 'translate-x-4' : 'translate-x-0'
                    )}
                  />
                </button>
              </label>
            ))}
          </div>
          <p className="text-xs text-neutral-500 mt-2">
            Las notificaciones activas aparecen en la campana y como alertas emergentes.
          </p>
        </section>

        {/* Futuras opciones — placeholder */}
        <section className="border-t border-neutral-800 pt-4">
          <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wide mb-2">
            Próximamente
          </h3>
          <div className="space-y-1 text-xs text-neutral-600">
            <p>• Tema claro / oscuro</p>
            <p>• Filas por página por defecto</p>
            <p>• Filtros guardados</p>
            <p>• Sonido de notificaciones</p>
            <p>• Firma en notas internas</p>
          </div>
        </section>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-neutral-800 pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 hover:bg-neutral-700 text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
