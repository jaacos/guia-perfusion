import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      id="offlineIndicator"
      className="fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-lg bg-amber-600/95 border border-amber-400/40 px-3.5 py-2 text-xs font-mono text-white shadow-xl backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      <WifiOff className="w-4 h-4 text-amber-100 animate-pulse" />
      <span>Modo Offline activo · Datos en caché local</span>
    </div>
  );
};
