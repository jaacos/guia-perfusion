export interface MetaData {
  version: string;
  estado: string;
  fechaGeneracion: string;
  fechaAprobacion: string | null;
  farmaceuticoResponsable: string | null;
  proximaRevision: string | null;
  volumenEstandar: number;
  pesoMin: number;
  pesoMax: number;
  resolucionBomba: number;
  usoPrevisto: string;
  notas?: string[];
}

export type CategoriaId =
  | 'vasoactivo'
  | 'sedacion'
  | 'analgesico'
  | 'relajante'
  | 'antiarritmico'
  | 'antihipertensivo'
  | 'anticoagulante'
  | 'antifibrinolitico'
  | 'antiepilepsico'
  | 'metabolico'
  | 'revertidor'
  | 'digestivo'
  | 'diuretico'
  | 'otro';

export type AlertaId =
  | 'viacentral'
  | 'luz'
  | 'velocidad'
  | 'bombaICC'
  | 'frio'
  | 'modosAlternativos';

export interface Conc {
  valor: number;
  unidad: string; // 'mg' | 'µg' | 'UI'
}

export interface BoloModo {
  label: string;
  porKg?: number;
  fijo?: number;
  unidadBolo: string;
  conc: number; // concentración de la jeringa de bolo en unidadBolo/mL
  maxDosis?: number;
}

/** Fase de una infusión en suero por gravedad (fármacos que no caben en jeringa) */
export interface FaseGravedad {
  nombre: string;
  mgKg: number;
  suero: number;   // mL de suero
  minutos: number; // duración de la fase
}

export interface ModoPerfusion {
  nombre: string;
  min: number;
  max: number;
  unidad: string; // e.g., 'mg/kg/h', 'µg/kg/min', 'mg/min', 'UI/h', etc.
}

export interface Farmaco {
  id: string;
  nombreComercial: string;
  principioActivo: string;
  categoria: CategoriaId | string;
  presentacion: string;
  puro?: boolean;
  polvo?: boolean;
  otrasPresentaciones?: string[];
  volFarmaco: number;
  diluyente: string | null;
  dosisTotalNum: number | null;
  dosisTotalUnidad: string | null;
  nAmp: string;
  volumenFinal: number;
  dilucion: string;
  conc: Conc;
  bolo: string | null;
  boloModos?: BoloModo[];
  modos?: ModoPerfusion[];
  pesoDosificacion: 'real' | 'ideal' | 'magro' | 'no_aplica' | string;
  estabilidad: string;
  concMaxPeriferica: string | null;
  referencia: string | null;
  observaciones: string;
  alertas?: (AlertaId | string)[];
  contraindicaciones?: string | null;
  incompatibilidades?: string | null;
  estado: 'ok' | 'corregido' | 'revisar' | string;
  notaRevision?: string | null;
  ampollasBase?: number;
  dosisPorAmp?: number;
  volPorAmp?: number;
  unidadPorAmp?: string;
  tipoEnvase?: 'amp' | 'vial' | string;
  envaseTxt?: string;        // texto del envase en la receta, p. ej. 'amp al 1 %'
  maxAmpollas?: number;      // tope del selector de ampollas
  tipo?: 'gravedad' | string; // 'gravedad' = en suero, no en jeringa
  fases?: FaseGravedad[];
  pesoMaxCalculo?: number;
  volVial?: number;
  gotasPorMl?: number;
}

export interface DrugDataset {
  meta: MetaData;
  farmacos: Farmaco[];
}

export interface InvalidFarmacoInfo {
  id: string;
  nombre: string;
  errores: string[];
}
