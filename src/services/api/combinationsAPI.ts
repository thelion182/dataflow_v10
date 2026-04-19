// @ts-nocheck
import { apiGet, apiPut, apiPost, apiDelete } from './client';

export async function getAllCombinations(): Promise<any[]> {
  try {
    const data = await apiGet('/combinations');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function saveCombinations(combinations: any[]): Promise<void> {
  if (!combinations || combinations.length === 0) return;
  try {
    await apiPut('/combinations', combinations);
  } catch (err) {
    console.error('[combinationsAPI] saveCombinations:', err);
  }
}
