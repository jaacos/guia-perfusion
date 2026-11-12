import React from 'react';
import { CATEGORIAS } from '../utils/calc';

interface CategoryFiltersProps {
  categories: string[];
  activeCategory: string;
  onSelectCategory: (cat: string) => void;
  counts: Record<string, number>;
}

export const CategoryFilters: React.FC<CategoryFiltersProps> = ({
  categories,
  activeCategory,
  onSelectCategory,
  counts,
}) => {
  return (
    <div id="filtersWrap" className="max-w-7xl mx-auto px-4 py-3 flex gap-1.5 flex-wrap">
      <button
        id="filter-all"
        onClick={() => onSelectCategory('all')}
        className={`px-3 py-1.5 rounded-full border text-xs font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
          activeCategory === 'all'
            ? 'bg-blue-600/20 border-blue-500 text-blue-400 font-semibold shadow-sm'
            : 'border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200 hover:bg-[#182030]/60'
        }`}
      >
        <span>Todos</span>
        <span className="text-[10px] opacity-70">({counts.all || 0})</span>
      </button>

      {categories.map(cat => {
        const info = CATEGORIAS[cat] || { label: cat, dotColor: '#94a3b8' };
        const count = counts[cat] || 0;
        const isActive = activeCategory === cat;

        return (
          <button
            key={cat}
            id={`filter-${cat}`}
            onClick={() => onSelectCategory(cat)}
            className={`px-3 py-1.5 rounded-full border text-xs font-mono transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              isActive
                ? 'bg-blue-600/20 border-blue-500 text-blue-400 font-semibold shadow-sm'
                : 'border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200 hover:bg-[#182030]/60'
            }`}
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: info.dotColor }}
            />
            <span>{info.label}</span>
            <span className="text-[10px] opacity-70">({count})</span>
          </button>
        );
      })}
    </div>
  );
};
