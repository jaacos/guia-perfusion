import React, { useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  return (
    <>
      {isInstallable && (
        <button
          id="pwaInstallBtn"
          onClick={install}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium rounded-lg bg-blue-600/90 text-white hover:bg-blue-500 transition-colors shadow-sm cursor-pointer"
          title="Instalar como aplicación en este dispositivo"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Instalar App</span>
        </button>
      )}

      {isIOS && (
        <button
          id="pwaInstallIOSBtn"
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium rounded-lg border border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-blue-400" />
          <span>Instalar en iOS</span>
        </button>
      )}

      {showIOSGuide && (
        <div
          id="iosGuideModal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          onClick={() => setShowIOSGuide(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-[#111620] border border-blue-500/30 p-5 shadow-2xl text-slate-200 relative"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setShowIOSGuide(false)}
              className="absolute top-3 right-3 text-slate-400 hover:text-white p-1"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 mb-3">
              <Share className="w-5 h-5 text-blue-400" />
              <h3 className="text-base font-semibold text-white">Instalar en iPhone / iPad</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Para disponer de la <strong>Guía de Perfusión SUC</strong> 100% offline en emergencias:
            </p>
            <ol className="text-xs text-slate-300 space-y-2.5 list-decimal list-inside bg-slate-900/60 p-3 rounded-lg border border-slate-800 font-mono">
              <li>Pulsa el botón <strong>Compartir</strong> en la barra inferior de Safari.</li>
              <li>Desliza y selecciona <strong>«Añadir a pantalla de inicio»</strong>.</li>
              <li>Confirma en <strong>Añadir</strong> para tener acceso rápido directo.</li>
            </ol>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-4 w-full py-2 text-xs font-mono font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};
