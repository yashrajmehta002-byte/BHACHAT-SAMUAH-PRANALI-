import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import type { Language } from '../types/asha';

interface PWAInstallButtonProps {
  lang: Language;
  variant?: 'compact' | 'prominent';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ lang, variant = 'compact' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const installLabel = lang === 'hi' ? 'ऐप इंस्टॉल करें' : 'Install App';
  const installIosLabel = lang === 'hi' ? 'iPhone पर इंस्टॉल' : 'Install on iOS';

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={
          variant === 'prominent'
            ? 'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-800 whitespace-nowrap shrink-0'
            : 'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-teal-700/25 bg-teal-50 px-3.5 py-2 text-xs font-semibold text-teal-800 transition-colors hover:bg-teal-100 whitespace-nowrap shrink-0'
        }
      >
        <Download className="h-4 w-4 shrink-0" />
        <span>{installLabel}</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
        >
          <Smartphone className="h-4 w-4 shrink-0" />
          <span>{installIosLabel}</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 backdrop-blur-sm sm:items-center">
            <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-base font-semibold text-slate-900">
                  {lang === 'hi' ? 'iPhone / iPad पर इंस्टॉल करें' : 'Install on iPhone / iPad'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Close"
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <ol className="mt-3 space-y-2 text-sm leading-relaxed text-slate-600">
                <li>
                  {lang === 'hi'
                    ? '1. Safari के नीचे Share (शेयर) बटन दबाएं।'
                    : '1. Tap the Share button in the Safari toolbar.'}
                </li>
                <li>
                  {lang === 'hi'
                    ? '2. नीचे स्क्रॉल करके "Add to Home Screen" चुनें।'
                    : '2. Scroll down and tap "Add to Home Screen".'}
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full min-h-[44px] rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                {lang === 'hi' ? 'ठीक है' : 'Got it'}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
