// @ts-nocheck
import type { ReclamosConfig } from '../../features/reclamos/types/reclamo.types';

const KEY = 'dataflow_reclamos_config';

const SEED: ReclamosConfig = {
  cargos: [
    'Auxiliar Administrativo',
    'Técnico Administrativo',
    'Analista de RRHH',
    'Jefe de Departamento',
    'Coordinador de Área',
    'Asistente Contable',
    'Técnico en Salud',
    'Médico',
    'Enfermero/a',
    'Auxiliar de Servicio',
  ],
  centrosCosto: [
    'CC-001 Administración Central',
    'CC-002 Recursos Humanos',
    'CC-003 Sueldos y Jornales',
    'CC-004 Sanatorio Galicia',
    'CC-005 Sanatorio Central',
    'CC-006 Juan Pablo II',
    'CC-007 Informática',
    'CC-008 Contabilidad',
    'CC-009 Gerencia General',
    'CC-010 Logística',
  ],
  liquidaciones: [
    'Enero 2025',
    'Febrero 2025',
    'Marzo 2025',
    'Abril 2025',
    'Mayo 2025',
    'Junio 2025',
    'Julio 2025',
    'Agosto 2025',
    'Setiembre 2025',
    'Octubre 2025',
    'Noviembre 2025',
    'Diciembre 2025',
    'Enero 2026',
    'Febrero 2026',
    'Marzo 2026',
  ],
  causales: [
    'Error en cálculo de horas extras',
    'Diferencia en salario base',
    'Descuento incorrecto',
    'Licencia no procesada',
    'Aguinaldo incorrecto',
    'Prima de antigüedad no aplicada',
    'Error en datos personales',
    'Asignación familiar no incluida',
    'Retención de IRPF incorrecta',
    'BPS mal calculado',
  ],
  tiposReclamo: [
    'Reclamo salarial',
    'Reclamo de licencia',
    'Reclamo de datos personales',
    'Reclamo de beneficio',
    'Reclamo de descuento',
    'Reclamo de horas extra',
    'Reclamo de aguinaldo',
    'Otro',
  ],
  emailSueldos: 'reclamos@circulocatolico.com.uy',
  whatsappActivo: false,
  notificarLiquidado: true,
};

export function getConfig(): ReclamosConfig {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(SEED);
    const parsed = JSON.parse(raw);
    // Migración: actualizar email por defecto viejo
    if (parsed.emailSueldos === 'sueldos@empresa.com.uy') {
      parsed.emailSueldos = 'reclamos@circulocatolico.com.uy';
    }
    // Migración: campo notificarLiquidado (configs anteriores no lo tenían)
    if (parsed.notificarLiquidado === undefined) {
      parsed.notificarLiquidado = true;
    }
    localStorage.setItem(KEY, JSON.stringify(parsed));
    return parsed;
  } catch {
    return structuredClone(SEED);
  }
}

export function saveConfig(config: ReclamosConfig): void {
  localStorage.setItem(KEY, JSON.stringify(config));
}
