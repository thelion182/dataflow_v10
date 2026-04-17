// @ts-nocheck
/**
 * reclamosConfigAPI.ts — implementación API para la configuración del módulo Reclamos.
 * Expone las mismas funciones que localStorage/reclamosConfigStorage.ts pero usando fetch().
 *
 * Endpoints esperados en el backend:
 *   GET  /api/reclamos/config  → devuelve ReclamosConfig (con SEED si no existe)
 *   PUT  /api/reclamos/config  → guarda configuración completa (body: ReclamosConfig)
 *
 * IMPORTANTE para Cómputos:
 *   El SEED de valores por defecto (cargos, centrosCosto, causales, etc.)
 *   debe estar en el backend como migration/seeder, no en el frontend.
 *   Ver BACKEND_GUIDE.md sección "Configuración de Reclamos".
 */
import { apiGet, apiPut } from './client';

export async function getConfig(): Promise<any> {
  try {
    return await apiGet('/reclamos/config');
  } catch (err) {
    console.error('[reclamosConfigAPI] getConfig:', err);
    // Fallback mínimo para que la app no rompa si el backend no responde
    return {
      cargos: [],
      centrosCosto: [],
      liquidaciones: [],
      causales: [],
      tiposReclamo: [],
      emailSueldos: 'reclamos@circulocatolico.com.uy',
      whatsappActivo: false,
    };
  }
}

export async function saveConfig(config: any): Promise<void> {
  try {
    await apiPut('/reclamos/config', config);
  } catch (err) {
    console.error('[reclamosConfigAPI] saveConfig:', err);
  }
}
