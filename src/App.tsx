import React, { useState, useEffect, useMemo } from 'react';
import { defaultDataset } from './data/defaultDataset';
import { DrugDataset, Farmaco } from './types';
import { validarFarmaco, normalize } from './utils/calc';
import { MetaBanner } from './components/MetaBanner';
import { Header } from './components/Header';
import { CategoryFilters } from './components/CategoryFilters';
import { DrugCard } from './components/DrugCard';
import { DrugModal } from './components/DrugModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { FooterDisclaimer } from './components/FooterDisclaimer';
import { SearchX } from 'lucide-react';

export default function App() {
  const [dataset, setDataset] = useState<DrugDataset>(defaultDataset);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedFarmaco, setSelectedFarmaco] = useState<Farmaco | null>(null);
  const [peso, setPeso] = useState<number | null>(70);
  const [customAmpollas, setCustomAmpollas] = useState<Record<string, number>>({});

  // Fetch updated dataset from service worker / server
  useEffect(() => {
    let isMounted = true;
    fetch('./farmacos.json')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
      })
      .then((data: DrugDataset) => {
        if (!isMounted) return;
        if (!data || !Array.isArray(data.farmacos) || !data.meta) return;

        // Filter valid drugs through clinical validator
        const farmacosValidos: Farmaco[] = [];
        data.farmacos.forEach(f => {
          const errors = validarFarmaco(f, data.meta);
          if (errors.length > 0) {
            console.error(
              `[Guía SUC] Fármaco descartado por validación (${f.id}): ${errors.join('; ')}`
            );
          } else {
            farmacosValidos.push(f);
          }
        });

        setDataset({
          meta: data.meta,
          farmacos: farmacosValidos,
        });
      })
      .catch(err => {
        // Safe: defaultDataset is already bundled and active
        console.warn('[Guía SUC] Usando dataset local precompilado:', err.message);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Sync selected drug if dataset refreshes
  useEffect(() => {
    if (selectedFarmaco) {
      const updated = dataset.farmacos.find(f => f.id === selectedFarmaco.id);
      if (updated) {
        setSelectedFarmaco(updated);
      }
    }
  }, [dataset, selectedFarmaco]);

  // Unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    dataset.farmacos.forEach(f => set.add(f.categoria));
    return Array.from(set);
  }, [dataset]);

  // Counts per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: dataset.farmacos.length };
    dataset.farmacos.forEach(f => {
      counts[f.categoria] = (counts[f.categoria] || 0) + 1;
    });
    return counts;
  }, [dataset]);

  // Filtered and sorted drug list
  const filteredDrugs = useMemo(() => {
    const termNorm = normalize(searchTerm.trim());

    return dataset.farmacos
      .filter(f => {
        // Category filter
        if (activeCategory !== 'all' && f.categoria !== activeCategory) {
          return false;
        }
        // Search term filter
        if (termNorm) {
          const nom = normalize(f.nombreComercial);
          const pa = normalize(f.principioActivo);
          if (!nom.includes(termNorm) && !pa.includes(termNorm)) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => a.principioActivo.localeCompare(b.principioActivo, 'es'));
  }, [dataset, activeCategory, searchTerm]);

  return (
    <div className="min-h-screen flex flex-col bg-[#0d1117] text-slate-100 font-sans selection:bg-blue-500 selection:text-white antialiased">
      {/* Meta Bar */}
      <MetaBanner meta={dataset.meta} />

      {/* Header with Search & PWA Button */}
      <Header
        meta={dataset.meta}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        peso={peso}
        onPesoChange={setPeso}
      />

      {/* Categories Bar */}
      <CategoryFilters
        categories={categories}
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
        counts={categoryCounts}
      />

      {/* Main Grid Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-4">
        {filteredDrugs.length > 0 ? (
          <div
            id="drugGrid"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {filteredDrugs.map(f => {
              const numAmp = customAmpollas[f.id] || f.ampollasBase || 1;
              return (
                <DrugCard
                  key={f.id}
                  farmaco={f}
                  searchTerm={searchTerm}
                  meta={dataset.meta}
                  peso={peso}
                  numAmpollas={numAmp}
                  onAmpollasChange={n =>
                    setCustomAmpollas(prev => ({ ...prev, [f.id]: n }))
                  }
                  onSelect={setSelectedFarmaco}
                />
              );
            })}
          </div>
        ) : (
          <div
            id="emptyState"
            className="py-16 text-center flex flex-col items-center justify-center max-w-md mx-auto"
          >
            <div className="w-12 h-12 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 mb-3">
              <SearchX className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-white mb-1">
              No se encontraron fármacos
            </h3>
            <p className="text-xs text-slate-400 mb-4 font-mono">
              No hay resultados para "{searchTerm}" {activeCategory !== 'all' ? `en la categoría seleccionada` : ''}.
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setActiveCategory('all');
              }}
              className="px-4 py-2 text-xs font-mono font-medium rounded-lg bg-blue-600/80 text-white hover:bg-blue-500 transition-colors cursor-pointer"
            >
              Restablecer filtros
            </button>
          </div>
        )}
      </main>

      {/* Detail & Calculation Modal */}
      {selectedFarmaco && (
        <DrugModal
          farmaco={selectedFarmaco}
          meta={dataset.meta}
          peso={peso}
          numAmpollas={customAmpollas[selectedFarmaco.id] || selectedFarmaco.ampollasBase || 1}
          onAmpollasChange={n =>
            setCustomAmpollas(prev => ({ ...prev, [selectedFarmaco.id]: n }))
          }
          onPesoChange={setPeso}
          onClose={() => setSelectedFarmaco(null)}
        />
      )}

      {/* Offline Status Badge */}
      <OfflineIndicator />

      {/* Clinical Footer Disclaimer */}
      <FooterDisclaimer meta={dataset.meta} />
    </div>
  );
}
