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

/** Fase de una pauta en varias jeringas de volumenFinal mL (p. ej. acetilcisteína) */
export interface FaseJeringas {
  nombre: string;
  mgKg: number;    // dosis TOTAL de la fase
  jeringas: number; // jeringas iguales en que se reparte la fase, una tras otra
  minutos: number; // duración TOTAL de la fase
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
  tipo?: 'jeringasFases' | string; // pauta por fases en varias jeringas
  fases?: FaseJeringas[];
  pesoMaxCalculo?: number;
  volVial?: number;
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
