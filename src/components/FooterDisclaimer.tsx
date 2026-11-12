import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { MetaData } from '../types';

interface FooterDisclaimerProps {
  meta: MetaData;
}

export const FooterDisclaimer: React.FC<FooterDisclaimerProps> = ({ meta }) => {
  return (
    <footer className="mt-12 border-t border-slate-800/80 bg-[#0a0d12] px-4 py-8 text-slate-400">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start gap-4 text-xs font-mono leading-relaxed">
        <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div className="space-y-1.5 flex-1">
          <p className="text-slate-300 font-semibold uppercase tracking-wider text-[11px]">
            Aviso de Seguridad Clínica y Uso Previsto
          </p>
          <p className="text-slate-400 text-[11.5px] leading-relaxed">
            {meta.usoPrevisto ||
              `Borrador de prueba para Herramienta de apoyo a la preparación de perfusiones en pacientes ADULTOS por personal sanitario del SUC. NO sustituye a la prescripción facultativa ni a la ficha técnica. Requiere verificación por parte de un comité de expertos. NO válida para pacientes pediátricos ni de peso inferior a ${meta.pesoMin} kg.`}
          </p>
          <div className="pt-2 text-[10.5px] text-slate-400 flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-900">
            <span>Versión: {meta.version}</span>
            <span>Estándar: {meta.volumenEstandar} mL</span>
            <span>Rango peso: {meta.pesoMin}–{meta.pesoMax} kg</span>
            <span>Resolución bomba: {meta.resolucionBomba} mL/h</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
