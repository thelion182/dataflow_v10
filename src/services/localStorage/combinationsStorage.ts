// @ts-nocheck
const KEY = 'dataflow-combinations-v1';

export function getAllCombinations(): any[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveCombinations(combinations: any[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(combinations));
  } catch {}
}
