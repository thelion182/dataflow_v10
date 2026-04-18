// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { cls } from '../lib/cls';
import { loadUserConfig } from '../features/users/UserConfigModal';

const STORAGE_KEY = 'dataflow-notifications-v1';
const MAX_NOTIFS = 100;

export interface NotificationEntry {
  id: string;
  category: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

const CATEGORY_ICONS: Record<string, string> = {
  subidas:       '📤',
  descargas:     '📥',
  dudas:         '💬',
  respuestas:    '✅',
  procesamiento: '⚙️',
  reclamos:      '📋',
  default:       '🔔',
};

function loadNotifications(): NotificationEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveNotifications(list: NotificationEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_NOTIFS)));
}

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'ahora';
    if (diffMin < 60) return `hace ${diffMin} min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `hace ${diffH}h`;
    return d.toLocaleDateString('es-UY', { day: '2-digit', month: '2-digit' });
  } catch { return ''; }
}

export function NotificationBell() {
  const [notifs, setNotifs] = useState<NotificationEntry[]>(() => loadNotifications());
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const unread = notifs.filter(n => !n.read).length;

  // Escuchar eventos SSE convertidos en notificaciones
  useEffect(() => {
    function handler(e: CustomEvent) {
      const d = e.detail;
      const config = loadUserConfig();
      // Respetar preferencias del usuario
      if (config.notifications[d.category] === false) return;

      const entry: NotificationEntry = {
        id: `${Date.now()}-${Math.random()}`,
        category: d.category || 'default',
        title: d.title,
        message: d.message,
        timestamp: d.timestamp || new Date().toISOString(),
        read: false,
      };
      setNotifs(prev => {
        const next = [entry, ...prev].slice(0, MAX_NOTIFS);
        saveNotifications(next);
        return next;
      });
    }
    window.addEventListener('dataflow:notification', handler as any);
    return () => window.removeEventListener('dataflow:notification', handler as any);
  }, []);

  // Cerrar al click fuera
  useEffect(() => {
    if (!open) return;
    function onOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [open]);

  function markAllRead() {
    setNotifs(prev => {
      const next = prev.map(n => ({ ...n, read: true }));
      saveNotifications(next);
      return next;
    });
  }

  function clearAll() {
    setNotifs([]);
    saveNotifications([]);
  }

  function markRead(id: string) {
    setNotifs(prev => {
      const next = prev.map(n => n.id === id ? { ...n, read: true } : n);
      saveNotifications(next);
      return next;
    });
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => { setOpen(v => !v); if (!open && unread > 0) markAllRead(); }}
        className={cls(
          'relative flex items-center justify-center w-8 h-8 rounded-lg transition-colors',
          open ? 'bg-neutral-700 text-neutral-100' : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
        )}
        title="Notificaciones"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-bold bg-red-500 text-white rounded-full leading-none">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-10 w-80 bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl z-[150] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
            <span className="text-sm font-semibold text-neutral-200">Notificaciones</span>
            <div className="flex gap-2">
              {notifs.length > 0 && (
                <>
                  <button onClick={markAllRead} className="text-xs text-neutral-400 hover:text-neutral-200">Marcar leídas</button>
                  <span className="text-neutral-700">·</span>
                  <button onClick={clearAll} className="text-xs text-neutral-400 hover:text-red-400">Limpiar</button>
                </>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="px-4 py-8 text-center text-neutral-500 text-sm">Sin notificaciones</div>
            ) : (
              notifs.map(n => (
                <div
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={cls(
                    'flex gap-3 px-4 py-3 cursor-default border-b border-neutral-800/60 hover:bg-neutral-800/40 transition-colors',
                    !n.read && 'bg-neutral-800/30'
                  )}
                >
                  <span className="text-lg flex-shrink-0 mt-0.5">
                    {CATEGORY_ICONS[n.category] || CATEGORY_ICONS.default}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-neutral-200 truncate">{n.title}</span>
                      <span className="text-[10px] text-neutral-500 flex-shrink-0">{formatTime(n.timestamp)}</span>
                    </div>
                    <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">{n.message}</p>
                  </div>
                  {!n.read && (
                    <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
