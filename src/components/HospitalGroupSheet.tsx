import React, { useEffect, useState } from 'react';
import { Building2, X } from 'lucide-react';
import type { Language, PhcGroup } from '../types/asha';

interface HospitalGroupSheetProps {
  lang: Language;
  isOpen: boolean;
  initialData: PhcGroup | null;
  onClose: () => void;
  onSave: (group: PhcGroup) => void;
}

export const HospitalGroupSheet: React.FC<HospitalGroupSheetProps> = ({
  lang,
  isOpen,
  initialData,
  onClose,
  onSave,
}) => {
  const hi = lang === 'hi';
  const [name, setName] = useState('');
  const [moicName, setMoicName] = useState('');
  const [shsName, setShsName] = useState('');
  const [annualLeaveLimit, setAnnualLeaveLimit] = useState('12');
  const [claimDueDay, setClaimDueDay] = useState('5');
  const [sectorMeetingDay, setSectorMeetingDay] = useState('गुरुवार (Thursday)');
  const [subCentersText, setSubCentersText] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      setName(initialData.name);
      setMoicName(initialData.moicName);
      setShsName(initialData.shsName);
      setAnnualLeaveLimit(String(initialData.annualLeaveLimit));
      setClaimDueDay(String(initialData.claimDueDay));
      setSectorMeetingDay(initialData.sectorMeetingDay);
      setSubCentersText(initialData.subCenters.join(', '));
    } else {
      setName('');
      setMoicName('');
      setShsName('');
      setAnnualLeaveLimit('12');
      setClaimDueDay('5');
      setSectorMeetingDay(hi ? 'गुरुवार (Thursday)' : 'Thursday');
      setSubCentersText('');
    }
  }, [isOpen, initialData, hi]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const parsedSubCenters = subCentersText
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    onSave({
      id: initialData?.id || `hosp-${Date.now()}`,
      name: name.trim(),
      moicName: moicName.trim() || 'MOIC',
      shsName: shsName.trim() || 'SHS',
      annualLeaveLimit: Math.max(1, Number(annualLeaveLimit) || 12),
      claimDueDay: Math.min(28, Math.max(1, Number(claimDueDay) || 5)),
      sectorMeetingDay: sectorMeetingDay.trim() || (hi ? 'गुरुवार' : 'Thursday'),
      subCenters: parsedSubCenters.length > 0 ? parsedSubCenters : ['SC Main'],
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-xl flex-col rounded-t-3xl border border-slate-200 bg-white shadow-xl sm:rounded-2xl">
        <div className="mx-auto mt-3 h-1.5 w-10 rounded-full bg-slate-300 sm:hidden" />

        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
              <Building2 className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              {initialData
                ? hi
                  ? 'अस्पताल समूह संपादित करें'
                  : 'Edit Hospital Group'
                : hi
                  ? 'नया अस्पताल-वार आशा समूह बनाएं'
                  : 'Create Hospital-Wise ASHA Group'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              {hi ? 'अस्पताल / PHC / CHC का नाम *' : 'Hospital / PHC / CHC Name *'}
            </label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={hi ? 'उदा. PHC सोम / CHC झाड़ोल / PHC कोल्यारी' : 'e.g. PHC Som / CHC Jhadol'}
              className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                {hi ? 'चिकित्सा अधिकारी (MOIC) का नाम' : 'MOIC Name'}
              </label>
              <input
                value={moicName}
                onChange={(e) => setMoicName(e.target.value)}
                placeholder={hi ? 'डॉ. राजेश मीणा' : 'Dr. Name'}
                className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                {hi ? 'SHS / आशा सुपरवाइज़र का नाम' : 'SHS / ASHA Supervisor Name'}
              </label>
              <input
                value={shsName}
                onChange={(e) => setShsName(e.target.value)}
                placeholder={hi ? 'सुपरवाइज़र का नाम' : 'Supervisor Name'}
                className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                {hi ? 'सालाना छुट्टी सीमा (दिन)' : 'Annual Leave Limit'}
              </label>
              <input
                type="number"
                min={1}
                max={60}
                value={annualLeaveLimit}
                onChange={(e) => setAnnualLeaveLimit(e.target.value)}
                className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-200 px-3 py-2 text-sm tabular-nums text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                {hi ? 'क्लेम जमा अंतिम तारीख' : 'Claim Due Day (1-28)'}
              </label>
              <input
                type="number"
                min={1}
                max={28}
                value={claimDueDay}
                onChange={(e) => setClaimDueDay(e.target.value)}
                className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-200 px-3 py-2 text-sm tabular-nums text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                {hi ? 'सेक्टर मीटिंग दिन' : 'Sector Meeting Day'}
              </label>
              <input
                value={sectorMeetingDay}
                onChange={(e) => setSectorMeetingDay(e.target.value)}
                placeholder={hi ? 'गुरुवार' : 'Thursday'}
                className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">
              {hi ? 'सब सेंटर (उप-केंद्र) सूची — कॉमा (,) से अलग लिखें' : 'Sub-Centers List (comma-separated)'}
            </label>
            <textarea
              rows={3}
              value={subCentersText}
              onChange={(e) => setSubCentersText(e.target.value)}
              placeholder={hi ? 'SC सोम, SC कोल्यारी, SC ओगणा, SC झाड़ोल' : 'SC Main, SC East, SC West'}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              {hi
                ? 'यहाँ जोड़े गए सब-सेंटर सीधे "आशा जोड़ें" और "हेड काउंट" फ़ॉर्म में सुझाव के रूप में दिखेंगे।'
                : 'Sub-centers listed here automatically appear in Add ASHA and Head Count forms.'}
            </p>
          </div>

          <div className="flex items-center gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {hi ? 'रद्द करें' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="min-h-[44px] flex-1 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800"
            >
              {initialData
                ? hi
                  ? 'बदलाव सेव करें'
                  : 'Update Hospital Group'
                : hi
                  ? 'अस्पताल समूह बनाएं'
                  : 'Create Hospital Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
