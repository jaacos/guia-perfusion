import React, { useMemo } from 'react';
import { Minus, Plus } from 'lucide-react';
import { Farmaco, MetaData } from '../types';
import {
  CATEGORIAS,
  ALERTAS_INFO,
  ritmoRef,
  concTexto,
  normalize,
  recalcularPorAmpollas,
  maxAmpollas,
  tieneSelectorAmpollas,
} from '../utils/calc';

interface DrugCardProps {
  farmaco: Farmaco;
  searchTerm: string;
  meta: MetaData;
  peso: number | null;
  numAmpollas: number;
  onAmpollasChange: (n: number) => void;
  onSelect: (f: Farmaco) => void;
}

export const DrugCard: React.FC<DrugCardProps> = ({
  farmaco,
  searchTerm,
  meta,
  peso,
  numAmpollas,
  onAmpollasChange,
  onSelect,
}) => {
  const c = CATEGORIAS[farmaco.categoria] || CATEGORIAS.otro;
  const tags = (farmaco.alertas || []).filter(a => ALERTAS_INFO[a]);

  // Recalculate drug properties if ampollas modified
  const fEfectivo = useMemo(
    () => recalcularPorAmpollas(farmaco, numAmpollas),
    [farmaco, numAmpollas]
  );

  const currentPeso = peso ?? 70;
  const baseAmp = farmaco.ampollasBase || 1;
  const isModified = numAmpollas !== baseAmp;
  const maxAmp = maxAmpollas(farmaco);
  const conSelector = tieneSelectorAmpollas(farmaco);
  const mismoNombre = normalize(farmaco.nombreComercial) === normalize(farmaco.principioActivo);
  const tipoEnvase = farmaco.tipoEnvase === 'vial' ? (numAmpollas === 1 ? 'vial' : 'viales') : 'amp';

  let ritmoHTML: string;
  let etiquetaRitmo: string;

  try {
    const r = ritmoRef(fEfectivo, currentPeso, meta);
    ritmoHTML = r.texto;
    etiquetaRitmo = r.porPeso ? `Ritmo (${currentPeso} kg)` : 'Ritmo (dosis fija)';
  } catch (err: unknown) {
    ritmoHTML = 'DATO NO VÁLIDO';
    etiquetaRitmo = 'Ritmo';
  }

  // Highlight matches
  const renderHighlighted = (text: string) => {
    if (!searchTerm.trim()) return text;
    const termNorm = normalize(searchTerm.trim());
    const textNorm = normalize(text);
    const index = textNorm.indexOf(termNorm);

    if (index === -1) return text;
    const before = text.slice(0, index);
    const match = text.slice(index, index + searchTerm.trim().length);
    const after = text.slice(index + searchTerm.trim().length);

    return (
      <>
        {before}
        <mark className="bg-amber-400/30 text-amber-200 rounded px-0.5">{match}</mark>
        {after}
      </>
    );
  };

  return (
    <div
      id={`card-${farmaco.id}`}
      role="button"
      tabIndex={0}
      onClick={() => onSelect(fEfectivo)}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(fEfectivo);
        }
      }}
      className="group flex flex-col bg-[#111620] border border-slate-800/80 rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/50 hover:border-blue-500/40 cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-blue-500/50"
    >
      {/* Card top */}
      <div className="p-4 pb-3 border-b border-slate-800/80 flex items-start justify-between gap-2.5">
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-white leading-snug group-hover:text-blue-400 transition-colors">
            {renderHighlighted(farmaco.principioActivo)}
          </h2>
          {!mismoNombre && (
            <div className="font-mono text-xs text-slate-400 uppercase tracking-wide mt-0.5 truncate">
              {renderHighlighted(farmaco.nombreComercial)}
            </div>
          )}
        </div>
        <span className={`shrink-0 px-2 py-0.5 rounded text-[11px] font-mono font-medium ${c.badgeClass}`}>
          {c.label}
        </span>
      </div>

      {/* Card body */}
      <div className="p-4 flex-1 flex flex-col justify-between text-xs space-y-2">
        <div className="space-y-1.5">
          <div className="flex justify-between items-baseline gap-2 pb-1 border-b border-slate-800/40">
            <span className="font-mono text-[11px] uppercase tracking-wider text-slate-400 shrink-0">
              Presentación
            </span>
            <span className="text-slate-300 text-right leading-tight">
              {farmaco.presentacion}
            </span>
          </div>

          {/* Interactive Ampoule Stepper on Card */}
          {conSelector && (
          <div
            className="flex items-center justify-between bg-[#161f2e] border border-blue-500/25 rounded-lg px-2.5 py-1.5 my-1"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[11px] uppercase tracking-wider text-blue-300 font-semibold">
                {farmaco.tipoEnvase === 'vial' ? 'Viales' : 'Ampollas'}
              </span>
              {isModified && (
                <span className="text-[10px] font-mono text-amber-300 bg-amber-500/20 px-1 py-0.2 rounded border border-amber-500/30">
                  Modificado
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={numAmpollas <= 1}
                onClick={e => {
                  e.stopPropagation();
                  onAmpollasChange(Math.max(1, numAmpollas - 1));
                }}
                className="w-7 h-7 rounded-md bg-[#0e141f] border border-slate-700 text-white flex items-center justify-center hover:bg-slate-700 hover:border-blue-400 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-sm"
                aria-label="Restar una ampolla"
                title="Restar 1 ampolla"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>

              <div className="min-w-[2.8rem] text-center font-mono font-bold text-xs text-blue-300">
                {numAmpollas}{' '}
                <span className="text-[10px] font-normal text-slate-400">
                  {tipoEnvase}
                </span>
              </div>

              <button
                type="button"
                disabled={numAmpollas >= maxAmp}
                onClick={e => {
                  e.stopPropagation();
                  onAmpollasChange(Math.min(maxAmp, numAmpollas + 1));
                }}
                className="w-7 h-7 rounded-md bg-[#0e141f] border border-slate-700 text-white flex items-center justify-center hover:bg-slate-700 hover:border-blue-400 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-sm"
                aria-label="Añadir una ampolla"
                title="Añadir 1 ampolla"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>

              {isModified && (
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    onAmpollasChange(baseAmp);
                  }}
                  className="text-[10px] font-mono text-slate-400 hover:text-white underline ml-1 cursor-pointer"
                  title="Restablecer a estándar"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
          )}

          <div className="flex justify-between items-baseline gap-2 pb-1 border-b border-slate-800/40">
            <span className="font-mono text-[11px] uppercase tracking-wider text-slate-400 shrink-0">
              Preparación
            </span>
            <span className="text-slate-100 font-semibold font-mono text-[11.5px] text-right leading-tight">
              {fEfectivo.dilucion}
            </span>
          </div>

          <div className="flex justify-between items-baseline gap-2 pb-1 border-b border-slate-800/40">
            <span className="font-mono text-[11px] uppercase tracking-wider text-slate-400 shrink-0">
              Concentración
            </span>
            <span className="text-slate-100 font-semibold font-mono text-[11.5px] text-right">
              {concTexto(fEfectivo)}
            </span>
          </div>

          <div className="flex justify-between items-baseline gap-2 pt-0.5">
            <span className="font-mono text-[11px] uppercase tracking-wider text-slate-400 shrink-0">
              {etiquetaRitmo}
            </span>
            <span
              className={`text-right leading-tight ${
                ritmoHTML.includes('NO VÁLIDO')
                  ? 'text-red-400 font-bold font-mono'
                  : 'text-emerald-400 font-mono font-medium'
              }`}
            >
              {ritmoHTML}
            </span>
          </div>
        </div>
      </div>

      {/* Card footer with warning tags */}
      {tags.length > 0 && (
        <div className="p-3 bg-[#0d121a] border-t border-slate-800/60 flex flex-wrap gap-1.5">
          {tags.map(a => {
            const info = ALERTAS_INFO[a];
            return (
              <span
                key={a}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-tight ${info.badgeClass}`}
              >
                {info.corto}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};
