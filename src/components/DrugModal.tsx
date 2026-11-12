import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, AlertCircle, Clock, RotateCcw, Minus, Plus } from 'lucide-react';
import { Farmaco, MetaData } from '../types';
import {
  ALERTAS_INFO,
  concTexto,
  farmacoPorPeso,
  esPorPeso,
  dosisAmLh,
  fmtRitmo,
  fmt,
  duracion,
  recalcularPorAmpollas,
  maxAmpollas,
  tieneSelectorAmpollas,
  esGravedad,
  calcularFases,
  rangoDosisTxt,
  duracionTxt,
  normalize,
} from '../utils/calc';

interface DrugModalProps {
  farmaco: Farmaco;
  meta: MetaData;
  peso: number | null;
  numAmpollas?: number;
  onAmpollasChange?: (n: number) => void;
  onPesoChange: (p: number | null) => void;
  onClose: () => void;
}

const PRESETS = [40, 50, 60, 70, 80, 90, 100, 110, 120];

const PESO_LABELS: Record<string, string> = {
  real: 'peso REAL (total)',
  ideal: 'peso IDEAL',
  magro: 'peso MAGRO',
  no_aplica: 'no depende del peso',
};

export const DrugModal: React.FC<DrugModalProps> = ({
  farmaco,
  meta,
  peso,
  numAmpollas: initialNumAmpollas,
  onAmpollasChange,
  onPesoChange,
  onClose,
}) => {
  const [modoActivo, setModoActivo] = useState(0);
  const [pesoInputStr, setPesoInputStr] = useState<string>(peso != null ? String(peso) : '70');
  const [numAmpollas, setNumAmpollas] = useState<number>(
    initialNumAmpollas || farmaco.ampollasBase || 1
  );
  const modalRef = useRef<HTMLDivElement>(null);

  // Sync ampoules when drug changes or initialNumAmpollas updates
  useEffect(() => {
    if (initialNumAmpollas != null) {
      setNumAmpollas(initialNumAmpollas);
    } else {
      setNumAmpollas(farmaco.ampollasBase || 1);
    }
  }, [farmaco.id, farmaco.ampollasBase, initialNumAmpollas]);

  const maxAmp = maxAmpollas(farmaco);
  const conSelector = tieneSelectorAmpollas(farmaco);
  const gravedad = esGravedad(farmaco);
  const mismoNombre = normalize(farmaco.nombreComercial) === normalize(farmaco.principioActivo);

  const handleUpdateAmpollas = (val: number) => {
    const clamped = Math.max(1, Math.min(maxAmp, val));
    setNumAmpollas(clamped);
    onAmpollasChange?.(clamped);
  };

  // Derived drug with dynamic recalculation for the selected number of ampoules
  const farmacoEfectivo = useMemo(() => {
    if (farmaco.dosisPorAmp && numAmpollas > 0) {
      return recalcularPorAmpollas(farmaco, numAmpollas);
    }
    return farmaco;
  }, [farmaco, numAmpollas]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    modalRef.current?.focus();
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handlePesoInput = (val: string) => {
    setPesoInputStr(val);
    const parsed = parseFloat(val);
    if (Number.isFinite(parsed) && parsed >= meta.pesoMin && parsed <= meta.pesoMax) {
      onPesoChange(parsed);
    } else {
      onPesoChange(null);
    }
  };

  const isPesoValido = peso != null;

  const hayPerf = Array.isArray(farmaco.modos) && farmaco.modos.length > 0;
  const hayBolo = Array.isArray(farmaco.boloModos) && farmaco.boloModos.length > 0;
  const multiModo = hayPerf && farmaco.modos && farmaco.modos.length > 1;
  const usaPeso = gravedad || farmacoPorPeso(farmaco) || (farmaco.boloModos || []).some(b => b.fijo == null);

  const pills: { label: string; className: string }[] = [];
  (farmaco.alertas || []).forEach(a => {
    if (ALERTAS_INFO[a]) {
      pills.push({ label: ALERTAS_INFO[a].largo, className: ALERTAS_INFO[a].badgeClass });
    }
  });
  if (farmaco.contraindicaciones) {
    pills.push({
      label: `✕ CI: ${farmaco.contraindicaciones}`,
      className: 'bg-red-500/15 text-red-300 border border-red-500/40',
    });
  }
  if (farmaco.incompatibilidades) {
    pills.push({
      label: `≠ INC: ${farmaco.incompatibilidades}`,
      className: 'bg-rose-500/15 text-rose-300 border border-rose-500/40',
    });
  }

  // Calculate perfusion rate
  const currentModo = farmacoEfectivo.modos?.[modoActivo] || farmacoEfectivo.modos?.[0];
  let perfusionResultNode: React.ReactNode = null;

  if (currentModo) {
    const modoUsaPeso = esPorPeso(currentModo.unidad);
    if (modoUsaPeso && peso == null) {
      perfusionResultNode = (
        <div className="bg-red-950/40 border border-red-500/40 rounded-lg p-3 text-red-300 text-xs font-mono">
          ⚠ Peso no válido: el ritmo de este modo no se puede calcular.
        </div>
      );
    } else {
      try {
        const a = dosisAmLh(currentModo.min, currentModo.unidad, peso, farmacoEfectivo.conc, meta);
        const b = dosisAmLh(currentModo.max, currentModo.unidad, peso, farmacoEfectivo.conc, meta);
        const igual = Math.abs(a - b) < 1e-9;
        const valorStr = igual
          ? `${fmtRitmo(a, meta)} mL/h`
          : `${fmtRitmo(a, meta)} – ${fmtRitmo(b, meta)} mL/h`;
        const labelStr = modoUsaPeso
          ? `${currentModo.nombre} — ${peso} kg`
          : `${currentModo.nombre} — dosis fija (independiente del peso)`;

        const avisos: string[] = [];
        const dur = duracion(b, farmacoEfectivo.volumenFinal);
        if (dur < 30) {
          avisos.push(
            `⚠ A ritmo máximo la jeringa de ${farmacoEfectivo.volumenFinal} mL se agota en ~${Math.round(
              dur
            )} min. Valorar más ampollas en la jeringa (dilución más concentrada).`
          );
        }
        if (a > 0 && a < meta.resolucionBomba) {
          avisos.push(
            `⚠ El ritmo mínimo (${a
              .toFixed(3)
              .replace('.', ',')} mL/h) está por debajo de la resolución de la bomba (${
              meta.resolucionBomba
            } mL/h).`
          );
        }

        perfusionResultNode = (
          <div className="bg-[#1e2a3d]/80 border border-blue-500/20 rounded-xl p-4">
            <div className="font-mono text-[11px] uppercase tracking-wider text-slate-400 mb-1">
              {labelStr}
            </div>
            <div className="font-mono text-2xl font-bold text-emerald-400 tracking-tight">
              {valorStr}
            </div>
            <div className="text-xs text-slate-300 mt-1 font-mono">
              {rangoDosisTxt(currentModo.min, currentModo.max, currentModo.unidad)} ·{' '}
              {concTexto(farmacoEfectivo)} · jeringa de {farmacoEfectivo.volumenFinal} mL
            </div>
            <div className="text-xs text-slate-300 mt-1 font-mono">
              La jeringa dura{' '}
              {igual
                ? duracionTxt(b, farmacoEfectivo.volumenFinal)
                : `de ${duracionTxt(b, farmacoEfectivo.volumenFinal)} (ritmo máx.) a ${duracionTxt(a, farmacoEfectivo.volumenFinal)} (ritmo mín.)`}
            </div>
            {avisos.map((av, idx) => (
              <div
                key={idx}
                className="font-mono text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2.5 mt-2 font-medium leading-relaxed"
              >
                {av}
              </div>
            ))}
          </div>
        );
      } catch (err: unknown) {
        perfusionResultNode = (
          <div className="bg-red-950/40 border border-red-500/40 rounded-lg p-3 text-red-300 text-xs font-mono font-semibold">
            DATO NO VÁLIDO — NO USAR. ({(err as Error).message})
          </div>
        );
      }
    }
  }

  return (
    <div
      id="modalBackdrop"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4 overflow-y-auto"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        id="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modalTitulo"
        tabIndex={-1}
        className="w-full max-w-2xl bg-[#111620] border border-blue-500/30 rounded-t-2xl sm:rounded-2xl shadow-2xl p-5 sm:p-6 max-h-[92vh] sm:max-h-[88vh] overflow-y-auto relative outline-none text-slate-200"
      >
        {/* Close button */}
        <button
          id="modalClose"
          onClick={onClose}
          aria-label="Cerrar ventana"
          className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-[#1e2a3d] border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="pr-10">
          <h2 id="modalTitulo" className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {farmaco.principioActivo}
          </h2>
          {!mismoNombre && (
            <div className="font-mono text-xs uppercase tracking-wider text-slate-400 mt-1">
              {farmaco.nombreComercial}
            </div>
          )}
        </div>

        {/* Alerts Pills */}
        {pills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3 mb-4">
            {pills.map((pill, i) => (
              <span
                key={i}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold leading-tight ${pill.className}`}
              >
                {pill.label}
              </span>
            ))}
          </div>
        )}

        {/* Section: Preparación */}
        <div className="mt-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1 mb-2">
            <h3 className="font-mono text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              Preparación
            </h3>
            {farmaco.ampollasBase && numAmpollas !== farmaco.ampollasBase && (
              <span className="font-mono text-[10px] text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded font-semibold">
                DILUCIÓN MODIFICADA
              </span>
            )}
          </div>

          {/* Selector de número de ampollas/viales si está disponible */}
          {conSelector && farmaco.dosisPorAmp && (
            <div className="mb-3 p-3 bg-[#182030] border border-blue-500/30 rounded-xl">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="font-mono text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                    <span>{farmaco.tipoEnvase === 'vial' ? 'Viales' : 'Ampollas'} en la perfusión:</span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-sans mt-0.5">
                    Presentación: {farmaco.presentacion}
                    {farmaco.ampollasBase && (
                      <span className="ml-1 text-slate-400">
                        (estándar: {farmaco.ampollasBase}{' '}
                        {farmaco.tipoEnvase === 'vial'
                          ? farmaco.ampollasBase === 1
                            ? 'vial'
                            : 'viales'
                          : farmaco.ampollasBase === 1
                          ? 'ampolla'
                          : 'ampollas'}
                        )
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={numAmpollas <= 1}
                    onClick={() => handleUpdateAmpollas(numAmpollas - 1)}
                    className="w-8 h-8 rounded-lg bg-[#111620] border border-slate-700 text-white font-bold flex items-center justify-center hover:bg-slate-700 hover:border-blue-400 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-sm"
                    aria-label="Reducir una ampolla"
                    title="Restar 1 ampolla"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <div className="px-2 text-center min-w-[3.2rem]">
                    <span className="font-mono font-bold text-lg text-white">{numAmpollas}</span>
                    <span className="text-[11px] font-mono text-slate-400 ml-1">
                      {farmaco.tipoEnvase === 'vial'
                        ? numAmpollas === 1
                          ? 'vial'
                          : 'viales'
                        : numAmpollas === 1
                        ? 'amp'
                        : 'amp'}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={numAmpollas >= maxAmp}
                    onClick={() => handleUpdateAmpollas(numAmpollas + 1)}
                    className="w-8 h-8 rounded-lg bg-[#111620] border border-slate-700 text-white font-bold flex items-center justify-center hover:bg-slate-700 hover:border-blue-400 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-sm"
                    aria-label="Añadir una ampolla"
                    title="Añadir 1 ampolla"
                  >
                    <Plus className="w-4 h-4" />
                  </button>

                  {farmaco.ampollasBase && numAmpollas !== farmaco.ampollasBase && (
                    <button
                      type="button"
                      onClick={() => handleUpdateAmpollas(farmaco.ampollasBase || 1)}
                      className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono text-cyan-300 bg-cyan-950/60 border border-cyan-700/50 rounded-lg hover:bg-cyan-900/60 cursor-pointer transition-colors ml-1"
                      title="Volver a la preparación estándar"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Estándar ({farmaco.ampollasBase})</span>
                    </button>
                  )}
                </div>
              </div>

              {farmaco.ampollasBase && numAmpollas !== farmaco.ampollasBase && (
                <div className="mt-2.5 text-xs font-mono text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 font-medium">
                  ⚡ Recalculado para {numAmpollas}{' '}
                  {farmaco.tipoEnvase === 'vial'
                    ? numAmpollas === 1
                      ? 'vial'
                      : 'viales'
                    : numAmpollas === 1
                    ? 'ampolla'
                    : 'ampollas'}
                  . El ritmo de perfusión y la concentración se recalculan en tiempo real.
                </div>
              )}
            </div>
          )}

          <div className="text-xs space-y-1.5 font-sans">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 py-1 border-b border-slate-800/40">
              <span className="font-mono text-slate-400 uppercase text-[11px]">Presentación</span>
              <span className="sm:col-span-2 text-slate-200">{farmacoEfectivo.presentacion}</span>
            </div>
            {(farmaco.otrasPresentaciones || []).length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 py-1 border-b border-slate-800/40">
                <span className="font-mono text-slate-400 uppercase text-[11px]">Otras presentaciones</span>
                <span className="sm:col-span-2 text-slate-300">
                  {farmaco.otrasPresentaciones!.map((p, i) => (
                    <div key={i}>{p}</div>
                  ))}
                </span>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 py-1 border-b border-slate-800/40">
              <span className="font-mono text-slate-400 uppercase text-[11px]">Preparación</span>
              <span className="sm:col-span-2 text-white font-semibold font-mono">
                {farmacoEfectivo.dilucion}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 py-1 border-b border-slate-800/40">
              <span className="font-mono text-slate-400 uppercase text-[11px]">Concentración</span>
              <span className="sm:col-span-2 text-white font-semibold font-mono">
                {concTexto(farmacoEfectivo)}
              </span>
            </div>
            <div className={`grid grid-cols-1 sm:grid-cols-3 gap-1 py-1 border-b border-slate-800/40 ${gravedad ? 'hidden' : ''}`}>
              <span className="font-mono text-slate-400 uppercase text-[11px]">Volumen final</span>
              <span className="sm:col-span-2 text-white font-semibold font-mono">
                {farmacoEfectivo.volumenFinal} mL
              </span>
            </div>
            {farmacoEfectivo.diluyente && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 py-1 border-b border-slate-800/40">
                <span className="font-mono text-slate-400 uppercase text-[11px]">Diluyente</span>
                <span className="sm:col-span-2 text-slate-200">{farmacoEfectivo.diluyente}</span>
              </div>
            )}
            {farmacoEfectivo.estabilidad && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 py-1 border-b border-slate-800/40">
                <span className="font-mono text-slate-400 uppercase text-[11px]">Estabilidad</span>
                <span className="sm:col-span-2 text-slate-300">{farmacoEfectivo.estabilidad}</span>
              </div>
            )}
            {farmacoEfectivo.concMaxPeriferica && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 py-1 border-b border-slate-800/40">
                <span className="font-mono text-slate-400 uppercase text-[11px]">
                  Conc. máx. periférica
                </span>
                <span className="sm:col-span-2 text-amber-300 font-medium">
                  {farmacoEfectivo.concMaxPeriferica}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Section: Dosificación */}
        <div className="mt-5">
          <h3 className="font-mono text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-1 mb-2 font-semibold">
            Dosificación
          </h3>
          <div className="text-xs space-y-1.5 font-sans">
            {farmaco.bolo && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 py-1 border-b border-slate-800/40">
                <span className="font-mono text-slate-400 uppercase text-[11px]">Bolo</span>
                <span className="sm:col-span-2 text-slate-200">{farmaco.bolo}</span>
              </div>
            )}
            {hayPerf && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 py-1 border-b border-slate-800/40">
                <span className="font-mono text-slate-400 uppercase text-[11px]">Perfusión</span>
                <div className="sm:col-span-2 space-y-1 text-slate-200 font-mono">
                  {farmaco.modos?.map((m, idx) => (
                    <div key={idx}>
                      <span className="text-slate-400">{m.nombre}: </span>
                      <span className="text-white font-medium">
                        {rangoDosisTxt(m.min, m.max, m.unidad)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 py-1 border-b border-slate-800/40">
              <span className="font-mono text-slate-400 uppercase text-[11px]">Dosificar por</span>
              <span className="sm:col-span-2 text-white font-semibold font-mono">
                {PESO_LABELS[farmaco.pesoDosificacion] || '—'}
              </span>
            </div>
            {farmaco.observaciones && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 py-1 border-b border-slate-800/40">
                <span className="font-mono text-slate-400 uppercase text-[11px]">Observaciones</span>
                <span className="sm:col-span-2 text-slate-300 leading-relaxed">
                  {farmaco.observaciones}
                </span>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 py-1 border-b border-slate-800/40">
              <span className="font-mono text-slate-400 uppercase text-[11px]">Referencia</span>
              <span className="sm:col-span-2">
                {farmaco.referencia ? (
                  <span className="text-slate-300">{farmaco.referencia}</span>
                ) : (
                  <span className="text-amber-400 font-mono text-[11px]">
                    pendiente de Farmacia
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Section: Shared Patient Weight */}
        {usaPeso && (
          <div className="mt-5 bg-[#182030] border border-blue-500/20 rounded-xl p-4">
            <div className="font-mono text-[11px] uppercase tracking-wider text-cyan-400 font-bold mb-3 flex items-center gap-1.5">
              <span>◉ Peso del paciente (común a todos los cálculos)</span>
            </div>

            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <label htmlFor="kgInput" className="text-xs text-slate-300 font-medium shrink-0">
                Peso (kg):
              </label>

              <button
                type="button"
                onClick={() => handlePesoInput(String(Math.max(meta.pesoMin, (peso || 70) - 5)))}
                className="h-8 px-2 rounded-lg bg-[#111620] border border-slate-700 text-slate-300 hover:text-white hover:border-blue-400 font-mono text-xs font-semibold cursor-pointer transition-colors"
                title="-5 kg"
              >
                -5
              </button>

              <button
                type="button"
                onClick={() => handlePesoInput(String(Math.max(meta.pesoMin, (peso || 70) - 1)))}
                className="w-8 h-8 rounded-lg bg-[#111620] border border-slate-700 text-white hover:border-blue-400 flex items-center justify-center cursor-pointer transition-colors"
                title="-1 kg"
                aria-label="Restar 1 kg"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>

              <input
                id="kgInput"
                type="number"
                min={meta.pesoMin}
                max={meta.pesoMax}
                step="1"
                inputMode="numeric"
                value={pesoInputStr}
                onChange={e => handlePesoInput(e.target.value)}
                className={`w-20 px-2 py-1 bg-[#111620] border rounded-lg text-center font-mono text-base font-bold text-white outline-none transition-all ${
                  isPesoValido
                    ? 'border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                    : 'border-red-500 focus:ring-2 focus:ring-red-500/30 ring-2 ring-red-500/20'
                }`}
              />

              <button
                type="button"
                onClick={() => handlePesoInput(String(Math.min(meta.pesoMax, (peso || 70) + 1)))}
                className="w-8 h-8 rounded-lg bg-[#111620] border border-slate-700 text-white hover:border-blue-400 flex items-center justify-center cursor-pointer transition-colors"
                title="+1 kg"
                aria-label="Sumar 1 kg"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => handlePesoInput(String(Math.min(meta.pesoMax, (peso || 70) + 5)))}
                className="h-8 px-2 rounded-lg bg-[#111620] border border-slate-700 text-slate-300 hover:text-white hover:border-blue-400 font-mono text-xs font-semibold cursor-pointer transition-colors"
                title="+5 kg"
              >
                +5
              </button>

              <span className="text-xs text-slate-400 font-mono ml-1">
                [{meta.pesoMin}–{meta.pesoMax} kg]
              </span>
            </div>

            {/* Presets */}
            <div className="flex gap-1.5 flex-wrap my-2">
              {PRESETS.map(k => (
                <button
                  key={k}
                  onClick={() => handlePesoInput(String(k))}
                  className={`px-2.5 py-1 rounded-md border text-xs font-mono transition-colors cursor-pointer ${
                    peso === k
                      ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-bold'
                      : 'border-slate-700/80 text-slate-400 hover:border-slate-600 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>

            <div className="font-mono text-[11px] text-slate-400 leading-normal mt-2">
              Dosificar por {PESO_LABELS[farmaco.pesoDosificacion] || '—'}. Rango admitido{' '}
              {meta.pesoMin}–{meta.pesoMax} kg (guía NO pediátrica).
            </div>

            {!isPesoValido && (
              <div
                id="pesoError"
                className="mt-2.5 font-mono text-xs font-semibold text-red-400 bg-red-950/50 border border-red-500/40 rounded-lg p-2.5 flex items-center gap-1.5"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>
                  ⚠ Peso no válido. Introduce un valor entre {meta.pesoMin} y {meta.pesoMax} kg.
                  Los cálculos por peso están ocultos.
                </span>
              </div>
            )}
          </div>
        )}

        {/* Section: Infusión por gravedad (no cabe en jeringa) */}
        {gravedad && (
          <div className="mt-4 bg-[#182030]/60 border border-orange-500/20 rounded-xl p-4">
            <div className="font-mono text-[11px] uppercase tracking-wider text-orange-400 font-bold mb-3">
              ⊕ Preparación por fases (suero por gravedad)
            </div>
            {peso == null ? (
              <div className="bg-red-950/30 border border-red-500/30 rounded-lg p-3 text-xs font-mono text-red-300">
                Peso no válido, cálculo no disponible.
              </div>
            ) : (
              (() => {
                const g = calcularFases(farmaco, peso);
                return (
                  <div className="space-y-2.5">
                    {g.fases.map((fa, idx) => (
                      <div key={idx} className="bg-[#111620] border border-slate-800 rounded-lg p-3.5">
                        <div className="font-mono text-[11px] uppercase tracking-wider text-slate-400 mb-1">
                          {fa.nombre} — {fmt(fa.mgKg)} mg/kg en{' '}
                          {fa.minutos < 120 ? `${fa.minutos} min` : `${fmt(fa.minutos / 60)} h`}
                        </div>
                        <div className="font-mono text-xl font-bold text-orange-400">
                          {fmt(fa.mL)} mL de fármaco ({fmt(fa.mg / 1000)} g)
                        </div>
                        <div className="text-xs text-slate-400 mt-1 font-mono">
                          Añadir a {fa.suero} mL de {farmaco.diluyente} ·{' '}
                          <span className="text-white font-semibold">{fmt(fa.mLh)} mL/h</span> ≈{' '}
                          <span className="text-white font-semibold">{fa.gotasMin} gotas/min</span> (equipo de{' '}
                          {g.gotas} gotas/mL)
                        </div>
                      </div>
                    ))}
                    <div className="text-xs text-slate-300 font-mono">
                      Total: {fmt(g.mLTotal)} mL de fármaco
                      {g.viales != null ? ` ≈ ${g.viales} viales de ${farmaco.volVial} mL` : ''}.
                    </div>
                    {g.limitado && (
                      <div className="text-xs font-mono text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded p-2 font-medium">
                        ⚠ Calculado con el peso máximo de {farmaco.pesoMaxCalculo} kg.
                      </div>
                    )}
                  </div>
                );
              })()
            )}
          </div>
        )}

        {/* Section: Bolo Calculator */}
        {hayBolo && (
          <div className="mt-4 bg-[#182030]/60 border border-orange-500/20 rounded-xl p-4">
            <div className="font-mono text-[11px] uppercase tracking-wider text-orange-400 font-bold mb-3 flex items-center gap-1.5">
              <span>⊕ Dosis en bolo</span>
            </div>

            <div className="space-y-2.5">
              {farmaco.boloModos?.map((b, idx) => {
                const u = b.unidadBolo || 'mg';
                let dosis = 0;
                let limitado = false;
                let calculable = true;

                if (b.fijo != null) {
                  dosis = b.fijo;
                } else {
                  if (peso == null) {
                    calculable = false;
                  } else {
                    dosis = (b.porKg || 0) * peso;
                    if (b.maxDosis != null && dosis > b.maxDosis) {
                      dosis = b.maxDosis;
                      limitado = true;
                    }
                  }
                }

                const vol = b.conc > 0 && calculable ? dosis / b.conc : null;

                if (!calculable) {
                  return (
                    <div
                      key={idx}
                      className="bg-red-950/30 border border-red-500/30 rounded-lg p-3 text-xs font-mono text-red-300"
                    >
                      {b.label} — peso no válido, cálculo no disponible.
                    </div>
                  );
                }

                return (
                  <div
                    key={idx}
                    className={`bg-[#111620] border rounded-lg p-3.5 ${
                      limitado ? 'border-amber-500/60' : 'border-slate-800'
                    }`}
                  >
                    <div className="font-mono text-[11px] uppercase tracking-wider text-slate-400 mb-1">
                      {b.label}
                    </div>
                    <div className="font-mono text-xl font-bold text-orange-400">
                      {fmt(dosis)} {u} {b.fijo != null ? '(dosis fija)' : ''}
                    </div>
                    <div className="text-xs text-slate-400 mt-1 font-mono">
                      Volumen a inyectar:{' '}
                      <span className="text-white font-semibold">
                        {vol != null ? `${fmt(vol)} mL` : '—'}
                      </span>{' '}
                      · jeringa cargada a {fmt(b.conc)} {u}/mL
                    </div>

                    {limitado && (
                      <div className="mt-2 text-xs font-mono text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded p-2 font-medium">
                        ⚠ LIMITADO POR DOSIS MÁXIMA ({fmt(b.maxDosis)} {u}). La dosis por peso
                        habría sido {fmt((b.porKg || 0) * (peso || 0))} {u}.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Section: Perfusion Calculator */}
        {hayPerf && (
          <div className="mt-4 bg-[#182030]/60 border border-blue-500/20 rounded-xl p-4">
            <div className="font-mono text-[11px] uppercase tracking-wider text-blue-400 font-bold mb-3 flex items-center justify-between">
              <span>⊕ Ritmo de perfusión (bomba de jeringa)</span>
              <Clock className="w-3.5 h-3.5 text-blue-400" />
            </div>

            {/* Selector interactivo de ampollas en la propia calculadora */}
            {conSelector && farmaco.dosisPorAmp && (
              <div className="mb-3.5 p-3 bg-[#111620] border border-blue-500/30 rounded-xl flex items-center justify-between flex-wrap gap-2.5">
                <div>
                  <div className="font-mono text-xs font-bold text-white flex items-center gap-1.5">
                    <span>{farmaco.tipoEnvase === 'vial' ? 'Viales' : 'Ampollas'} en perfusión:</span>
                    {numAmpollas !== (farmaco.ampollasBase || 1) && (
                      <span className="text-[10px] font-mono text-amber-300 bg-amber-500/20 border border-amber-500/40 px-1.5 py-0.5 rounded font-bold">
                        DILUCIÓN MODIFICADA
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-[11px] text-slate-400 mt-0.5">
                    {numAmpollas} {farmaco.tipoEnvase === 'vial' ? (numAmpollas === 1 ? 'vial' : 'viales') : 'amp'} = {fmt(numAmpollas * farmaco.dosisPorAmp)} {farmaco.unidadPorAmp || farmaco.conc.unidad} en {farmaco.volumenFinal} mL
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={numAmpollas <= 1}
                    onClick={() => handleUpdateAmpollas(numAmpollas - 1)}
                    className="w-8 h-8 rounded-lg bg-[#182030] hover:bg-slate-700 text-white flex items-center justify-center border border-slate-700 hover:border-blue-400 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-sm"
                    aria-label="Restar una ampolla"
                    title="Restar 1 ampolla"
                  >
                    <Minus className="w-4 h-4" />
                  </button>

                  <div className="min-w-[3.2rem] text-center px-2 py-1 bg-slate-900 border border-slate-800 rounded-lg">
                    <span className="font-mono font-bold text-base text-blue-400 leading-none">
                      {numAmpollas}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 ml-1">
                      {farmaco.tipoEnvase === 'vial' ? (numAmpollas === 1 ? 'vial' : 'viales') : 'amp'}
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={numAmpollas >= maxAmp}
                    onClick={() => handleUpdateAmpollas(numAmpollas + 1)}
                    className="w-8 h-8 rounded-lg bg-[#182030] hover:bg-slate-700 text-white flex items-center justify-center border border-slate-700 hover:border-blue-400 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-sm"
                    aria-label="Añadir una ampolla"
                    title="Añadir 1 ampolla"
                  >
                    <Plus className="w-4 h-4" />
                  </button>

                  {numAmpollas !== (farmaco.ampollasBase || 1) && (
                    <button
                      type="button"
                      onClick={() => handleUpdateAmpollas(farmaco.ampollasBase || 1)}
                      className="flex items-center gap-1 px-2 py-1 text-[11px] font-mono text-slate-400 hover:text-white underline cursor-pointer ml-1"
                      title="Restablecer a preparación estándar"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {multiModo && farmaco.modos && (
              <div className="flex gap-1.5 mb-3 flex-wrap">
                {farmaco.modos.map((m, i) => (
                  <button
                    key={i}
                    onClick={() => setModoActivo(i)}
                    className={`flex-1 min-w-[120px] py-1.5 px-3 rounded-lg border text-xs font-mono transition-colors cursor-pointer text-center ${
                      modoActivo === i
                        ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-bold'
                        : 'border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    {m.nombre}
                  </button>
                ))}
              </div>
            )}

            {perfusionResultNode}
          </div>
        )}
      </div>
    </div>
  );
};
