// @ts-nocheck
/**
 * auditStorage.ts — persistencia del log de auditoría en localStorage.
 * Clave: dataflow-audit-v2  (separada del antiguo dataflow-audit-log-v1)
 * Máximo: 5.000 entradas — FIFO (se descarta la más antigua al superar el límite).
 */
import type { AuditEntry } from '../../lib/audit';

const KEY = 'dataflow-audit-v2';
const MAX_ENTRIES = 5000;

export function getAll(): AuditEntry[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveAll(entries: AuditEntry[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries));
  } catch { /* quota excedida — ignorar */ }
}

export function append(entry: AuditEntry): void {
  try {
    const all = getAll();
    all.push(entry);
    const trimmed = all.length > MAX_ENTRIES ? all.slice(all.length - MAX_ENTRIES) : all;
    saveAll(trimmed);
  } catch { /* nunca lanza */ }
}

export function clear(): void {
  try {
    localStorage.removeItem(KEY);
  } catch { /* nunca lanza */ }
}
