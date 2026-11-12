import React from 'react';
import { Search, X, Minus, Plus } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { MetaData } from '../types';

interface HeaderProps {
  meta: MetaData;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  peso: number | null;
  onPesoChange: (value: number | null) => void;
}

export const Header: React.FC<HeaderProps> = ({
  meta,
  searchTerm,
  onSearchChange,
  peso,
  onPesoChange,
}) => {
  const currentPeso = peso ?? 70;

  return (
    <header className="sticky top-0 z-30 bg-[#0a0d12]/95 backdrop-blur-md border-b border-blue-500/10 px-4 py-3.5 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
              <span>Guía</span>
              <span className="text-red-500 font-extrabold">Perfusión</span>
              <span>SUC</span>
            </h1>
          </div>
          <p id="headerSub" className="font-mono text-[11px] text-slate-400 mt-0.5">
            Adultos ≥{meta.pesoMin} kg · {meta.volumenEstandar} mL estándar · v{meta.version}
          </p>
        </div>

        <div className="flex-1 min-w-[240px] max-w-xl relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            id="searchInput"
            type="search"
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Buscar por nombre comercial o principio activo..."
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
            className="w-full pl-9 pr-8 py-2 bg-[#182030] border border-blue-500/20 rounded-lg text-sm text-slate-100 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-sans"
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 cursor-pointer"
              aria-label="Limpiar búsqueda"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Global patient weight stepper with + and - */}
          <div className="flex items-center gap-1.5 bg-[#182030] border border-blue-500/30 rounded-lg px-2.5 py-1 shadow-sm">
            <span className="font-mono text-xs text-slate-400 font-medium">Peso:</span>
            <button
              type="button"
              onClick={() => onPesoChange(Math.max(meta.pesoMin, currentPeso - 5))}
              className="w-6 h-6 rounded bg-[#0e141f] hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
              title="Restar 5 kg"
              aria-label="Restar 5 kg"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="font-mono font-bold text-xs text-blue-300 min-w-[2.75rem] text-center">
              {currentPeso} kg
            </span>
            <button
              type="button"
              onClick={() => onPesoChange(Math.min(meta.pesoMax, currentPeso + 5))}
              className="w-6 h-6 rounded bg-[#0e141f] hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
              title="Sumar 5 kg"
              aria-label="Sumar 5 kg"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          <PWAInstallButton />
        </div>
      </div>
    </header>
  );
};
