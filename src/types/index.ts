export type EstadoPeregrino = 'CAMINANDO' | 'MOVIL_APOYO' | 'BAJA';

export type PostaNombre = 
  | 'Parroquia (Micro)'
  | 'Morón'
  | 'Merlo'
  | 'La Reja'
  | 'Gral. Rodríguez'
  | '1er. Puente'
  | 'Luján (Santuario)';

export type PuestoNombre = PostaNombre;

export interface PostaConfig {
  id: string;
  nombre: PostaNombre;
  km: number;
  subtitulo: string;
  estado: 'Cerrada' | 'Rezagados' | 'Epicentro' | 'Vanguardia' | 'Preparada' | 'Basílica';
  horarioEstimado: string;
}

export type PuestoConfig = PostaConfig;

export interface Peregrino {
  id: string; // PL-001, etc.
  idCorto: string; // #PL-001
  nombre: string;
  apellido: string;
  dni?: string;
  edad?: number;
  telefono: string;
  parroquia?: string;
  comunidad?: string;
  grupoRuta?: string;
  factorSanguineo?: string;
  fotoUrl?: string;
  rol?: 'PEREGRINO' | 'COORDINADOR' | 'SANIDAD' | 'APOYO';
  
  // Datos médicos opcionales (deprecados para vista simplificada)
  alergias?: string;
  medicacion?: string;
  observacionesMedicas?: string;
  contactoEmergenciaNombre?: string;
  contactoEmergenciaParentesco?: string;
  contactoEmergenciaTelefono?: string;

  // Estado dinámico en marcha
  estadoActual: EstadoPeregrino;
  subEstadoDetalle?: string;
  ultimaPosta: PostaNombre | 'Sin registros';
  ultimoTimestamp: number | null;
  tomadorUltimoRegistro?: string;
}

export interface RegistroPosta {
  id?: number;
  peregrinoId: string;
  idCorto: string;
  nombreCompleto: string;
  posta: PostaNombre;
  estado: EstadoPeregrino;
  detalle?: string;
  tomadorId: string;
  tomadorNombre: string;
  timestamp: number;
  synched: 0 | 1; // 0: pendiente offline, 1: sincronizado con nube
  syncedAt?: number;
}

export type RegistroPuesto = RegistroPosta;

export interface MetricasPosta {
  registrados: number;
  pendientes: number;
  totalPasoEsperado: number;
  porcentaje: number;
}
