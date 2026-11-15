import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import type { Language } from '../types/asha';

export const OfflineIndicator: React.FC<{ lang: Language }> = ({ lang }) => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="no-print fixed bottom-20 left-4 right-4 z-40 mx-auto flex max-w-md items-center gap-2.5 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-xs font-semibold text-amber-900 shadow-sm lg:bottom-6"
    >
      <WifiOff className="h-4 w-4 shrink-0 text-amber-700" />
      <span className="truncate">
        {lang === 'hi'
          ? 'ऑफ़लाइन मोड — सारा डेटा आपके फ़ोन में सुरक्षित है'
          : 'Offline Mode — All records are stored locally on your device'}
      </span>
    </div>
  );
};
