import React, { useState } from 'react';
import { Lock, Delete } from 'lucide-react';
import type { Language } from '../types/asha';

interface PinLockScreenProps {
  lang: Language;
  expectedPin: string;
  onUnlock: () => void;
}

export const PinLockScreen: React.FC<PinLockScreenProps> = ({ lang, expectedPin, onUnlock }) => {
  const [entered, setEntered] = useState('');
  const [error, setError] = useState(false);

  const handleDigit = (digit: string) => {
    if (entered.length >= 4) return;
    const next = entered + digit;
    setEntered(next);
    setError(false);

    if (next.length === 4) {
      if (next === expectedPin) {
        onUnlock();
      } else {
        setTimeout(() => {
          setEntered('');
          setError(true);
        }, 180);
      }
    }
  };

  const handleBackspace = () => {
    setEntered((prev) => prev.slice(0, -1));
    setError(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-xs rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
          <Lock className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-lg font-bold text-slate-900">
          {lang === 'hi' ? 'हॉस्पिटल मैनेजमेंट ऐप लॉक है' : 'Hospital Management App Locked'}
        </h1>
        <p className="mt-1 text-xs text-slate-600">
          {lang === 'hi' ? 'रजिस्टर खोलने के लिए 4-अंकीय पिन दर्ज करें' : 'Enter your 4-digit PIN to unlock'}
        </p>

        <div className="mt-5 flex items-center justify-center gap-3">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`h-3.5 w-3.5 rounded-full border transition-colors ${
                entered.length > idx
                  ? 'border-teal-700 bg-teal-700'
                  : 'border-slate-300 bg-slate-100'
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="mt-3 text-xs font-medium text-rose-700" role="alert">
            {lang === 'hi' ? 'गलत पिन। कृपया पुनः प्रयास करें।' : 'Incorrect PIN. Please try again.'}
          </p>
        )}

        <div className="mt-6 grid grid-cols-3 gap-2.5">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              className="flex min-h-[48px] items-center justify-center rounded-xl border border-slate-200 bg-white text-lg font-semibold text-slate-900 tabular-nums transition-colors hover:bg-slate-50 active:bg-slate-100"
            >
              {digit}
            </button>
          ))}
          <div />
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="flex min-h-[48px] items-center justify-center rounded-xl border border-slate-200 bg-white text-lg font-semibold text-slate-900 tabular-nums transition-colors hover:bg-slate-50 active:bg-slate-100"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            aria-label="Delete digit"
            className="flex min-h-[48px] items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 transition-colors hover:bg-slate-100"
          >
            <Delete className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
