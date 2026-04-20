// @ts-nocheck
/**
 * useSSE — hook de notificaciones en tiempo real via Server-Sent Events.
 *
 * Solo activo cuando VITE_USE_API=true (modo backend).
 * En modo localStorage no hace nada.
 *
 * Al recibir eventos del backend, dispara:
 *   - window event 'dataflow:toast'            → DataFlowDemo lo convierte en toast
 *   - window event 'dataflow:notification'     → NotificationBell lo almacena en historial
 *   - window event 'dataflow:files:refresh'    → useFiles recarga los archivos
 *   - window event 'dataflow:reclamos:refresh' → useReclamos recarga los reclamos
 */
import { useEffect } from 'react';

const USE_API  = import.meta.env.VITE_USE_API === 'true';
const _sseBase = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '');
const API_URL  = _sseBase.replace(/^(https?:\/\/)localhost(:\d+)?/, `$1${window.location.hostname}$2`);

function toast(title: string, message: string) {
  window.dispatchEvent(new CustomEvent('dataflow:toast', { detail: { title, message } }));
}

function notify(category: string, title: string, message: string, extra: any = {}) {
  window.dispatchEvent(new CustomEvent('dataflow:notification', {
    detail: { category, title, message, timestamp: new Date().toISOString(), ...extra }
  }));
}

function refreshFiles() {
  window.dispatchEvent(new CustomEvent('dataflow:files:refresh'));
}

function refreshReclamos() {
  window.dispatchEvent(new CustomEvent('dataflow:reclamos:refresh'));
}

export function useSSE({ meId }: { meId?: string } = {}) {
  useEffect(() => {
    if (!USE_API || !meId) return;

    const es = new EventSource(`${API_URL}/events`, { withCredentials: true });

    es.addEventListener('ping', () => {/* keepalive silencioso */});

    es.addEventListener('file:uploaded', (e: any) => {
      const d = JSON.parse(e.data);
      notify('subidas', 'Archivo nuevo', `${d.uploaderName} subió "${d.fileName}"`, { fileId: d.fileId });
      toast('Archivo nuevo', `${d.uploaderName} subió "${d.fileName}"`);
      refreshFiles();
    });

    es.addEventListener('file:status', (e: any) => {
      const d = JSON.parse(e.data);
      notify('subidas', 'Archivo actualizado', `"${d.fileName}" → ${d.status}`, { fileId: d.fileId });
      toast('Archivo actualizado', `"${d.fileName}" → ${d.status}`);
      refreshFiles();
    });

    es.addEventListener('file:downloaded', (e: any) => {
      const d = JSON.parse(e.data);
      notify('descargas', 'Archivo descargado', `${d.downloadedBy} descargó "${d.fileName}"`, { fileId: d.fileId });
      toast('Archivo descargado', `${d.downloadedBy} descargó "${d.fileName}"`);
      refreshFiles();
    });

    es.addEventListener('period:reset', (e: any) => {
      refreshFiles();
    });

    es.addEventListener('file:observation', (e: any) => {
      const d = JSON.parse(e.data);
      if (d.type === 'nueva_duda') {
        notify('dudas', 'Nueva duda', `${d.byUser} registró una duda en "${d.fileName}"`, { fileId: d.fileId });
        toast('Nueva duda', `${d.byUser} registró una duda en "${d.fileName}"`);
      } else if (d.type === 'respuesta') {
        const esArreglo = d.tipo === 'arreglo';
        const label = esArreglo ? 'Arreglo respondido' : 'Duda respondida';
        const msg = esArreglo
          ? `${d.byUser} respondió un arreglo en "${d.fileName}"`
          : `${d.byUser} respondió una duda en "${d.fileName}"`;
        notify('respuestas', label, msg, { fileId: d.fileId });
        toast(label, msg);
      } else if (d.type === 'procesada') {
        notify('procesamiento', 'Procesado', `${d.byUser} procesó un registro en "${d.fileName}"`, { fileId: d.fileId });
        toast('Procesado', `${d.byUser} procesó un registro en "${d.fileName}"`);
      }
      refreshFiles();
    });

    es.addEventListener('reclamo:created', (e: any) => {
      const d = JSON.parse(e.data);
      notify('reclamos', 'Nuevo reclamo', `${d.ticket} — ${d.nombreFuncionario}`, { ticket: d.ticket });
      toast('Nuevo reclamo', `${d.ticket} — ${d.nombreFuncionario}`);
      refreshReclamos();
    });

    es.addEventListener('reclamo:estado', (e: any) => {
      const d = JSON.parse(e.data);
      notify('reclamos', 'Reclamo actualizado', `${d.ticket} → ${d.estado}`, { ticket: d.ticket });
      toast('Reclamo actualizado', `${d.ticket} → ${d.estado}`);
      refreshReclamos();
    });

    es.addEventListener('reclamo:nota', (e: any) => {
      const d = JSON.parse(e.data);
      notify('reclamos', 'Nota interna', `Nueva nota en ${d.ticket}`, { ticket: d.ticket });
      toast('Nota interna', `Nueva nota en ${d.ticket}`);
      refreshReclamos();
    });

    es.onerror = () => {
      // EventSource reconecta automáticamente — no hacer nada
    };

    return () => es.close();
  }, [meId]);
}
