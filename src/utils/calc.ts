import { Farmaco, Conc, MetaData } from '../types';

export const MICRO = '\u00b5'; // U+00B5
export const MU_GRIEGA = '\u03bc'; // U+03BC

export const U_DOSIS = ['mg', MICRO + 'g', 'UI'];
export const U_TIEMPO: Record<string, number> = {
  'min': 60,
  'h': 1,
  'día': 1 / 24,
};

export const FACTOR: Record<string, Record<string, number>> = {
  'mg': { 'mg': 1, [MICRO + 'g']: 1000 },
  [MICRO + 'g']: { [MICRO + 'g']: 1, 'mg': 0.001 },
  'UI': { 'UI': 1 },
};

export const DEFAULT_META: MetaData = {
  version: '2.1.0-borrador',
  estado: 'BORRADOR — NO VALIDADO POR FARMACIA',
  fechaGeneracion: '2026-11-12',
  fechaAprobacion: null,
  farmaceuticoResponsable: null,
  proximaRevision: null,
  volumenEstandar: 50,
  pesoMin: 30,
  pesoMax: 250,
  resolucionBomba: 0.1,
  usoPrevisto:
    'Herramienta de apoyo a la preparación de perfusiones en pacientes ADULTOS por personal sanitario del SUC. NO sustituye a la prescripción facultativa ni a la ficha técnica. Requiere verificación por un segundo profesional antes de la administración. NO válida para pacientes pediátricos ni de peso inferior a 30 kg.',
  notas: [
    "Campo 'referencia' pendiente de cumplimentar por Farmacia para cada fármaco.",
    "Los registros con estado 'revisar' requieren decisión expresa de Farmacia antes de la aprobación.",
  ],
};

/** Convierte una dosis a ritmo de bomba en mL/h. Lanza si algo no cuadra. */
export function dosisAmLh(
  dose: number,
  unidad: string,
  kg: number | null,
  conc: Conc,
  meta: MetaData = DEFAULT_META
): number {
  if (!Number.isFinite(dose) || dose < 0) throw new Error('dosis inválida');
  if (!conc || !(conc.valor > 0)) throw new Error('concentración inválida');

  const p = String(unidad).split('/').map(s => s.trim());
  if (p.length < 2 || p.length > 3) throw new Error('unidad mal formada: ' + unidad);
  const uDosis = p[0];
  const tiempo = p[p.length - 1];
  const porPeso = p.length === 3;

  if (!U_DOSIS.includes(uDosis)) throw new Error('unidad de dosis no reconocida: ' + unidad);
  if (porPeso && p[1] !== 'kg') throw new Error("segundo término no es 'kg': " + unidad);
  if (!(tiempo in U_TIEMPO)) throw new Error('unidad de tiempo no reconocida: ' + unidad);
  if (porPeso && (kg == null || !Number.isFinite(kg) || kg < meta.pesoMin || kg > meta.pesoMax)) {
    throw new Error('peso fuera de rango');
  }

  const f = FACTOR[uDosis]?.[conc.unidad];
  if (f == null) throw new Error('conversión imposible ' + uDosis + ' → ' + conc.unidad);

  return (dose * (porPeso ? (kg as number) : 1) * U_TIEMPO[tiempo] * f) / conc.valor;
}

export const esJeringasFases = (f: Farmaco): boolean =>
  f.tipo === 'jeringasFases' && Array.isArray(f.fases) && f.fases.length > 0;

/** "250 µg/h" si min = max; "1–6 mg/kg/h" si es un rango */
export const rangoDosisTxt = (min: number, max: number, unidad: string): string =>
  (Math.abs(min - max) < 1e-9 ? fmt(min) : fmt(min) + '–' + fmt(max)) + ' ' + unidad;

/** Duración legible de una jeringa a un ritmo dado */
export function duracionTxt(mLh: number, vol: number): string {
  const min = duracion(mLh, vol);
  if (!Number.isFinite(min)) return '—';
  return min < 90 ? Math.round(min) + ' min' : fmt(Math.round(min / 6) / 10) + ' h';
}

/**
 * Tope físico del selector de ampollas: el volumen de fármaco no puede superar
 * el volumen final de la jeringa. Para liofilizados (sin volumen propio) se
 * usa el tope declarado en el dato o, en su defecto, el doble del estándar.
 */
export function maxAmpollas(f: Farmaco): number {
  if (!f.dosisPorAmp || f.puro) return f.ampollasBase || 1;
  let tope = 20;
  if (f.maxAmpollas) tope = f.maxAmpollas;
  else if (f.volPorAmp && f.volPorAmp > 0) tope = Math.floor(f.volumenFinal / f.volPorAmp + 1e-9);
  else tope = 2 * (f.ampollasBase || 1);
  return Math.max(f.ampollasBase || 1, Math.min(20, tope));
}

/** ¿Tiene sentido ofrecer el selector de ampollas en este fármaco? */
export const tieneSelectorAmpollas = (f: Farmaco): boolean =>
  !!f.dosisPorAmp && !esJeringasFases(f) && maxAmpollas(f) > 1;

/**
 * Pauta por fases en jeringas de volumenFinal mL. f.conc es la concentración
 * del VIAL. Cada fase se reparte en jeringas iguales que se pasan una tras
 * otra, así que el ritmo es volumen de la jeringa / duración de cada jeringa.
 * El ritmo no depende del peso; con el peso solo cambia el fármaco por jeringa.
 */
export function calcularJeringasFases(f: Farmaco, kg: number) {
  const vol = f.volumenFinal;
  const kgCalc = f.pesoMaxCalculo ? Math.min(kg, f.pesoMaxCalculo) : kg;
  const fases = (f.fases || []).map(fa => {
    const mgFase = fa.mgKg * kgCalc;
    const mgJeringa = mgFase / fa.jeringas;
    const mLFarmaco = mgJeringa / f.conc.valor;
    const minJeringa = fa.minutos / fa.jeringas;
    return {
      ...fa, mgFase, mgJeringa, mLFarmaco,
      mLDiluyente: vol - mLFarmaco,
      concJeringa: mgJeringa / vol,
      minJeringa,
      mLh: vol / (minJeringa / 60),
    };
  });
  const mLTotal = fases.reduce((s, x) => s + x.mLFarmaco * x.jeringas, 0);
  return {
    fases, kgCalc, mLTotal, limitado: kg > kgCalc,
    noCabe: fases.some(x => x.mLFarmaco > vol + 1e-9),
    viales: f.volVial ? Math.ceil(mLTotal / f.volVial - 1e-9) : null,
  };
}

const minTxt = (m: number) => (m < 120 ? fmt(m) + ' min' : fmt(m / 60) + ' h');
export { minTxt };

export const esPorPeso = (unidad: string): boolean => String(unidad).split('/').length === 3;

export const farmacoPorPeso = (f: Farmaco): boolean =>
  (f.modos || []).some(m => esPorPeso(m.unidad));

export const duracion = (mLh: number, vol: number): number =>
  mLh > 0 ? (vol / mLh) * 60 : Infinity;

/** Formato de ritmo ajustado a la resolución real de la bomba. */
export function fmtRitmo(n: number, meta: MetaData = DEFAULT_META): string {
  if (!Number.isFinite(n)) throw new Error('ritmo no finito');
  const R = meta.resolucionBomba || 0.1;
  if (n > 0 && n < R) return '< ' + String(R).replace('.', ',');
  const dec = R >= 1 ? 0 : String(R).split('.')[1]?.length || 1;
  return (Math.round(n / R) * R).toFixed(dec).replace('.', ',');
}

export function fmt(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return parseFloat(n.toFixed(3)).toString().replace('.', ',');
}

/** Texto del ritmo de referencia. Devuelve {texto, porPeso} o lanza. */
export function ritmoRef(
  f: Farmaco,
  kg: number,
  meta: MetaData = DEFAULT_META
): { texto: string; porPeso: boolean } {
  if (esJeringasFases(f)) {
    const g = calcularJeringasFases(f, kg);
    return { texto: g.fases.map(x => `${x.nombre}: ${fmtRitmo(x.mLh, meta)} mL/h`).join(' · '), porPeso: true };
  }
  if (!f.modos || !f.modos.length) return { texto: 'Solo bolo', porPeso: false };
  const partes = f.modos.map(m => {
    const a = dosisAmLh(m.min, m.unidad, kg, f.conc, meta);
    const b = dosisAmLh(m.max, m.unidad, kg, f.conc, meta);
    const v =
      Math.abs(a - b) < 1e-9
        ? fmtRitmo(a, meta) + ' mL/h'
        : fmtRitmo(a, meta) + '–' + fmtRitmo(b, meta) + ' mL/h';
    return f.modos && f.modos.length > 1 ? m.nombre + ': ' + v : v;
  });
  return { texto: partes.join(' · '), porPeso: farmacoPorPeso(f) };
}

/** El texto de concentración se DERIVA de conc: no puede divergir del cálculo. */
export function concTexto(f: Farmaco): string {
  if (esJeringasFases(f)) return 'Vial: 1 mL = ' + fmt(f.conc.valor) + ' ' + f.conc.unidad + ' · en jeringa según fase y peso';
  const u = f.conc.unidad;
  let t = '1 mL = ' + fmt(f.conc.valor) + ' ' + u;
  if (u === MICRO + 'g' && f.conc.valor >= 1000) t += ' (' + fmt(f.conc.valor / 1000) + ' mg)';
  if (u === 'mg' && f.conc.valor < 1) t += ' (' + fmt(f.conc.valor * 1000) + ' ' + MICRO + 'g)';
  return t;
}

/**
 * Recalcula la concentración, dilución y volumen de un fármaco en función
 * del número de ampollas o viales seleccionados en la preparación de la perfusión.
 */
export function recalcularPorAmpollas(f: Farmaco, numAmpollas: number): Farmaco {
  if (numAmpollas <= 0 || !f.dosisPorAmp || esJeringasFases(f)) return f;
  // Preparación estándar: se respeta el texto validado del dato, sin regenerarlo
  if (numAmpollas === (f.ampollasBase || 1)) return f;
  numAmpollas = Math.min(numAmpollas, maxAmpollas(f));

  const factor = FACTOR[f.unidadPorAmp || 'mg']?.[f.conc.unidad] ?? 1;
  const dosisTotalEnConc = (numAmpollas * f.dosisPorAmp) * factor;
  const nuevoValorConc = dosisTotalEnConc / f.volumenFinal;
  const volFarmaco = numAmpollas * (f.volPorAmp || 0);
  const volDiluyente = Math.max(0, f.volumenFinal - volFarmaco);
  const tipo = f.envaseTxt || (f.tipoEnvase === 'vial' ? (numAmpollas === 1 ? 'vial' : 'viales') : 'amp');

  const dosisTotalNum = numAmpollas * f.dosisPorAmp;
  const dosisStr =
    dosisTotalNum >= 1000 && (f.unidadPorAmp === MICRO + 'g' || f.unidadPorAmp === 'µg')
      ? `${fmt(dosisTotalNum / 1000)} mg`
      : `${fmt(dosisTotalNum)} ${f.unidadPorAmp || f.conc.unidad}`;

  let nuevaDilucion = '';
  if (f.polvo) {
    nuevaDilucion = `${numAmpollas} ${tipo} (${dosisStr}) — reconstituir y COMPLETAR HASTA ${f.volumenFinal} mL con ${f.diluyente || 'SS0,9%'}`;
  } else if (volDiluyente > 0) {
    nuevaDilucion = `${numAmpollas} ${tipo} (${dosisStr}) + ${fmt(volDiluyente)} mL ${f.diluyente || 'diluyente'} → VOLUMEN FINAL ${f.volumenFinal} mL`;
  } else {
    nuevaDilucion = `${numAmpollas} ${tipo} (${dosisStr}) sin diluyente (puro) → ${f.volumenFinal} mL`;
  }

  return {
    ...f,
    volFarmaco,
    dosisTotalNum,
    dosisTotalUnidad: f.unidadPorAmp || f.dosisTotalUnidad,
    nAmp: `${numAmpollas} ${tipo}`,
    dilucion: nuevaDilucion,
    conc: {
      valor: nuevoValorConc,
      unidad: f.conc.unidad,
    },
  };
}

export const normalize = (s: string): string =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// Categorías oficiales
export const CATEGORIAS: Record<
  string,
  { label: string; badgeClass: string; dotColor: string }
> = {
  vasoactivo: { label: 'Vasoactivo', badgeClass: 'bg-red-500/15 text-red-400 border border-red-500/30', dotColor: '#f87171' },
  sedacion: { label: 'Sedación', badgeClass: 'bg-purple-500/15 text-purple-300 border border-purple-500/30', dotColor: '#a78bfa' },
  analgesico: { label: 'Analgésico', badgeClass: 'bg-orange-500/15 text-orange-300 border border-orange-500/30', dotColor: '#fb923c' },
  relajante: { label: 'Relajante muscular', badgeClass: 'bg-teal-500/15 text-teal-300 border border-teal-500/30', dotColor: '#14b8a6' },
  antiarritmico: { label: 'Antiarrítmico', badgeClass: 'bg-blue-500/15 text-blue-300 border border-blue-500/30', dotColor: '#60a5fa' },
  antihipertensivo: { label: 'Antihipertensivo', badgeClass: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30', dotColor: '#4ade80' },
  anticoagulante: { label: 'Anticoagulante', badgeClass: 'bg-amber-500/15 text-amber-300 border border-amber-500/30', dotColor: '#fbbf24' },
  antifibrinolitico: { label: 'Antifibrinolítico', badgeClass: 'bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/30', dotColor: '#f0abfc' },
  antiepilepsico: { label: 'Antiepiléptico', badgeClass: 'bg-rose-500/15 text-rose-300 border border-rose-500/30', dotColor: '#fb7185' },
  metabolico: { label: 'Metabólico', badgeClass: 'bg-sky-500/15 text-sky-300 border border-sky-500/30', dotColor: '#93c5fd' },
  digestivo: { label: 'Digestivo', badgeClass: 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/30', dotColor: '#fde047' },
  diuretico: { label: 'Diurético', badgeClass: 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30', dotColor: '#7dd3fc' },
  revertidor: { label: 'Antídoto', badgeClass: 'bg-violet-500/15 text-violet-300 border border-violet-500/30', dotColor: '#c4b5fd' },
  otro: { label: 'Otro', badgeClass: 'bg-slate-500/15 text-slate-300 border border-slate-500/30', dotColor: '#94a3b8' },
};

export const ALERTAS_INFO: Record<string, { corto: string; largo: string; badgeClass: string }> = {
  viacentral: {
    corto: '↑ VÍA CENTRAL',
    largo: '↑ VÍA CENTRAL PREFERENTE',
    badgeClass: 'bg-red-500/15 text-red-400 border border-red-500/30',
  },
  luz: {
    corto: '☀ FOTOSENSIBLE',
    largo: '☀ FOTOSENSIBLE — CUBRIR JERINGA Y LÍNEA',
    badgeClass: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
  },
  velocidad: {
    corto: '⚠ VEL. MÁX.',
    largo: '⚠ VELOCIDAD DE ADMINISTRACIÓN RESTRINGIDA',
    badgeClass: 'bg-orange-500/15 text-orange-300 border border-orange-500/30',
  },
  bombaICC: {
    corto: '⊞ BOMBA',
    largo: '⊞ SIEMPRE EN BOMBA DE JERINGA',
    badgeClass: 'bg-purple-500/15 text-purple-300 border border-purple-500/30',
  },
  frio: {
    corto: '❄ NEVERA',
    largo: '❄ CONSERVAR EN NEVERA (2–8 °C)',
    badgeClass: 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30',
  },
  modosAlternativos: {
    corto: '⇄ PAUTAS ALT.',
    largo: '⇄ LAS PAUTAS SON ALTERNATIVAS — NO ACUMULABLES',
    badgeClass: 'bg-amber-500/20 text-amber-200 border border-amber-500/40',
  },
};

export function validarFarmaco(f: Farmaco, meta: MetaData = DEFAULT_META): string[] {
  const e: string[] = [];
  const required = [
    'id',
    'nombreComercial',
    'principioActivo',
    'categoria',
    'conc',
    'volumenFinal',
    'dilucion',
    'estado',
  ] as const;

  required.forEach(c => {
    if (f[c] === undefined || f[c] === null || f[c] === '') {
      e.push('falta ' + c);
    }
  });
  if (e.length) return e;

  if (!CATEGORIAS[f.categoria]) e.push('categoría desconocida: ' + f.categoria);
  const fasesJ = f.tipo === 'jeringasFases';
  if (!(f.volumenFinal > 0)) e.push('volumenFinal inválido');
  if (!(f.conc.valor > 0)) e.push('conc.valor inválido');
  if (!U_DOSIS.includes(f.conc.unidad)) e.push('conc.unidad no reconocida: ' + f.conc.unidad);
  if (f.conc.unidad && f.conc.unidad.includes(MU_GRIEGA)) {
    e.push('conc.unidad usa MU GRIEGA (U+03BC)');
  }

  // La concentración declarada debe cuadrar con la dilución descrita
  if (fasesJ) {
    if (!Array.isArray(f.fases) || !f.fases.length) e.push('pauta por fases sin fases');
    (f.fases || []).forEach(fa => {
      if (!(fa.mgKg > 0 && fa.minutos > 0 && Number.isInteger(fa.jeringas) && fa.jeringas >= 1)) e.push('fase inválida: ' + fa.nombre);
    });
    if (f.conc.unidad !== 'mg') e.push('pauta por fases: conc (vial) debe ir en mg/mL');
    if (!(f.pesoMaxCalculo && f.pesoMaxCalculo > 0)) e.push('pauta por fases sin peso máximo de cálculo');
    else if (Array.isArray(f.fases) && f.conc.valor > 0 && calcularJeringasFases(f, f.pesoMaxCalculo).noCabe) {
      e.push('al peso máximo el fármaco no cabe en la jeringa');
    }
  } else if (f.dosisTotalNum != null && f.dosisTotalUnidad) {
    const fac = FACTOR[f.dosisTotalUnidad]?.[f.conc.unidad];
    if (fac == null) {
      e.push('dosisTotalUnidad no convertible a conc.unidad');
    } else {
      const esperada = (f.dosisTotalNum * fac) / f.volumenFinal;
      if (Math.abs(esperada - f.conc.valor) > Math.max(1e-9, esperada * 1e-6)) {
        e.push(
          'INCOHERENCIA: la dilución da ' +
            esperada +
            ' ' +
            f.conc.unidad +
            '/mL pero conc.valor = ' +
            f.conc.valor
        );
      }
    }
  } else {
    e.push('faltan dosisTotalNum / dosisTotalUnidad (no se puede verificar la dilución)');
  }

  // Modos: unidades válidas y calculables en todo el rango de peso
  (f.modos || []).forEach(m => {
    if (!(m.min <= m.max)) e.push("modo '" + m.nombre + "': min > max");
    [meta.pesoMin, meta.pesoMax].forEach(kg => {
      try {
        dosisAmLh(m.min, m.unidad, kg, f.conc, meta);
        dosisAmLh(m.max, m.unidad, kg, f.conc, meta);
      } catch (err: unknown) {
        e.push("modo '" + m.nombre + "' @" + kg + 'kg: ' + (err as Error).message);
      }
    });
  });

  // Bolos por peso: tope obligatorio
  (f.boloModos || []).forEach(b => {
    if (!b.label) e.push('bolo sin label');
    if (!(b.conc > 0)) e.push("bolo '" + b.label + "' sin concentración válida");
    if (b.fijo == null) {
      if (!(b.porKg && b.porKg > 0)) e.push("bolo '" + b.label + "' sin porKg ni fijo");
      if (b.maxDosis == null) {
        e.push("bolo '" + b.label + "' por peso SIN maxDosis (tope obligatorio)");
      }
    }
  });

  return e;
}
