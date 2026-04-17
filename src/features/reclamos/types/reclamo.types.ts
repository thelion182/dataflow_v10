// @ts-nocheck
export type EstadoReclamo =
  | 'Emitido'
  | 'En proceso'
  | 'Liquidado'
  | 'Rechazado/Duda de reclamo'
  | 'Eliminado';

export interface HistorialEstado {
  estado: EstadoReclamo;
  fecha: string;        // ISO string
  usuarioId: string;
  usuarioNombre: string;
  nota?: string;
}

export interface NotificacionSimulada {
  tipo: 'email' | 'whatsapp';
  destinatario: string;
  fecha: string;
  asunto: string;
  cuerpo: string; // HTML string
}

export interface NotaInterna {
  id: string;
  texto: string;
  autorId: string;
  autorNombre: string;
  fecha: string;  // ISO string
}

export interface Adjunto {
  id: string;
  nombre: string;
  tipo: string;    // MIME type
  tamaño: number;  // bytes
  datos: string;   // base64 data URL
}

export interface Reclamo {
  id: string;              // uuid
  ticket: string;          // "RC-YYYYMMDD-XXXX"
  nroFuncionario: string;
  nombreFuncionario: string;
  emailFuncionario: string;
  cargo: string;
  centroCosto: string;
  liquidacion: string;
  paraLiquidacion?: string;
  causal: string;
  tipoReclamo: string;
  descripcion: string;
  emisorId: string;
  emisorNombre: string;
  fechaEmision: string;
  estado: EstadoReclamo;
  historialEstados: HistorialEstado[];
  notificaciones: NotificacionSimulada[];
  notasInternas: NotaInterna[];   // hilo privado RRHH/Sueldos
  adjuntos?: Adjunto[];           // archivos adjuntos
  eliminado: boolean;      // soft delete
}

export interface ReclamosConfig {
  cargos: string[];
  centrosCosto: string[];
  liquidaciones: string[];
  causales: string[];
  tiposReclamo: string[];
  emailSueldos: string;
  whatsappActivo: boolean;
  notificarLiquidado: boolean;   // enviar email al funcionario cuando pasa a Liquidado
  logoDataUrl?: string;
}
