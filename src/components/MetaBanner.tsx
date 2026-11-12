import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { MetaData } from '../types';

interface MetaBannerProps {
  meta: MetaData;
}

export const MetaBanner: React.FC<MetaBannerProps> = ({ meta }) => {
  const aprobado = !!meta.fechaAprobacion;

  return (
    <div
      id="metaBar"
      className={`w-full px-4 py-2 text-xs font-mono text-center leading-relaxed border-b transition-colors ${
        aprobado
          ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
          : 'bg-red-950/40 text-red-300 border-red-500/40'
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 flex-wrap">
        {aprobado ? (
          <>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 inline shrink-0" />
            <span>
              Dataset <b>v{meta.version}</b> · aprobado el {meta.fechaAprobacion} por{' '}
              {meta.farmaceuticoResponsable || '—'} · próxima revisión{' '}
              {meta.proximaRevision || '—'}
            </span>
          </>
        ) : (
          <>
            <AlertTriangle className="w-3.5 h-3.5 text-red-400 inline shrink-0" />
            <span>
              ⚠ <b>{meta.estado || 'BORRADOR — NO VALIDADO'}</b> · v{meta.version} · generado{' '}
              {meta.fechaGeneracion || '—'} ·{' '}
              <span className="font-bold underline uppercase">NO USAR EN PACIENTES</span>
            </span>
          </>
        )}
      </div>
    </div>
  );
};
