import React, { useEffect, useRef, useState } from 'react';
import { Camera, ClipboardList, Eye, EyeOff, KeyRound, ShieldCheck, Trash2, Upload, X } from 'lucide-react';
import type { AshaWorker, Language, PhcGroup } from '../types/asha';
import {
  decryptSensitiveText,
  encryptSensitiveText,
  maskAadhaar,
  maskBankAccount,
} from '../utils/cryptoAndExport';

interface CompressedPhotoResult {
  dataUrl: string;
  kb: number;
  originalKb: number;
  width: number;
  height: number;
}

/**
 * Self-contained image compression utility inside AshaWorkerSheet.
 * Downscales large camera/gallery photos via HTML5 Canvas and steps down JPEG quality
 * until the output fits efficiently in offline localStorage.
 */
async function compressAshaPhoto(
  file: File,
  maxDimension = 420,
  targetMaxKb = 45
): Promise<CompressedPhotoResult> {
  const originalKb = Math.max(1, Math.round(file.size / 1024));
  const objectUrl = URL.createObjectURL(file);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Failed to decode selected image'));
      image.src = objectUrl;
    });

    let { width, height } = img;
    if (width > maxDimension || height > maxDimension) {
      if (width >= height) {
        height = Math.max(1, Math.round((height * maxDimension) / width));
        width = maxDimension;
      } else {
        width = Math.max(1, Math.round((width * maxDimension) / height));
        height = maxDimension;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, width);
    canvas.height = Math.max(1, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context unavailable');
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const qualities = [0.68, 0.56, 0.44, 0.34];
    let bestDataUrl = canvas.toDataURL('image/jpeg', qualities[0]);
    let bestKb = Math.max(1, Math.round((bestDataUrl.length * 0.75) / 1024));

    for (let i = 1; i < qualities.length && bestKb > targetMaxKb; i++) {
      bestDataUrl = canvas.toDataURL('image/jpeg', qualities[i]);
      bestKb = Math.max(1, Math.round((bestDataUrl.length * 0.75) / 1024));
    }

    return {
      dataUrl: bestDataUrl,
      kb: bestKb,
      originalKb,
      width: canvas.width,
      height: canvas.height,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

interface AshaWorkerSheetProps {
  lang: Language;
  isOpen: boolean;
  groups: PhcGroup[];
  activeGroupId: string;
  initialData: AshaWorker | null;
  existingAshas?: AshaWorker[];
  onClose: () => void;
  onSave: (worker: AshaWorker) => void;
  onEnsureHospitalGroup?: (hospitalName: string, subCenterName?: string) => PhcGroup;
  onViewReport?: (ashaId: string) => void;
}

export const AshaWorkerSheet: React.FC<AshaWorkerSheetProps> = ({
  lang,
  isOpen,
  groups,
  activeGroupId,
  initialData,
  existingAshas = [],
  onClose,
  onSave,
  onEnsureHospitalGroup,
  onViewReport,
}) => {
  const hi = lang === 'hi';
  const photoInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [photoSizeKb, setPhotoSizeKb] = useState<number | null>(null);
  const [photoOriginalKb, setPhotoOriginalKb] = useState<number | null>(null);
  const [photoCompressing, setPhotoCompressing] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const [groupId, setGroupId] = useState(groups[0]?.id || '__new__');
  const [hospitalNameInput, setHospitalNameInput] = useState('');
  const [name, setName] = useState('');
  const [ashaCode, setAshaCode] = useState('');
  const [phone, setPhone] = useState('');
  const [husbandName, setHusbandName] = useState('');
  const [husbandPhone, setHusbandPhone] = useState('');

  const [subCenter, setSubCenter] = useState('');
  const [subCenterAddress, setSubCenterAddress] = useState('');
  const [awcName, setAwcName] = useState('');
  const [awcWorkerName, setAwcWorkerName] = useState('');
  const [awcWorkerPhone, setAwcWorkerPhone] = useState('');
  const [sathinName, setSathinName] = useState('');
  const [sathinPhone, setSathinPhone] = useState('');
  const [swachhKarmiName, setSwachhKarmiName] = useState('');
  const [swachhKarmiPhone, setSwachhKarmiPhone] = useState('');
  const [village, setVillage] = useState('');
  const [joiningDate, setJoiningDate] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [education, setEducation] = useState('');
  const [population, setPopulation] = useState('1000');
  const [families, setFamilies] = useState('200');

  const [anmName, setAnmName] = useState('');
  const [anmPhone, setAnmPhone] = useState('');
  const [choName, setChoName] = useState('');
  const [choPhone, setChoPhone] = useState('');

  const [aadhaarRaw, setAadhaarRaw] = useState('');
  const [janAadhaar, setJanAadhaar] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankRaw, setBankRaw] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [notes, setNotes] = useState('');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | undefined>(undefined);
  const [encryptPassphrase, setEncryptPassphrase] = useState('');
  const [decryptPassphrase, setDecryptPassphrase] = useState('');
  const [decryptedAadhaar, setDecryptedAadhaar] = useState<string | null>(null);
  const [decryptedBank, setDecryptedBank] = useState<string | null>(null);
  const [decryptError, setDecryptError] = useState<string | null>(null);
  const [decryptBusy, setDecryptBusy] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      const matchedGrp = groups.find((g) => g.id === initialData.groupId);
      setGroupId(matchedGrp ? matchedGrp.id : '__new__');
      setHospitalNameInput(initialData.hospitalName || matchedGrp?.name || '');
      setName(initialData.name);
      setAshaCode(initialData.ashaCode || '');
      setPhone(initialData.phone);
      setHusbandName(initialData.husbandName || '');
      setHusbandPhone(initialData.husbandPhone || '');
      setSubCenter(initialData.subCenter);
      setSubCenterAddress(initialData.subCenterAddress || '');
      setAwcName(initialData.awcName || '');
      setAwcWorkerName(initialData.awcWorkerName || '');
      setAwcWorkerPhone(initialData.awcWorkerPhone || '');
      setSathinName(initialData.sathinName || '');
      setSathinPhone(initialData.sathinPhone || '');
      setSwachhKarmiName(initialData.swachhKarmiName || '');
      setSwachhKarmiPhone(initialData.swachhKarmiPhone || '');
      setVillage(initialData.village);
      setJoiningDate(initialData.joiningDate);
      setDateOfBirth(initialData.dateOfBirth || '');
      setEducation(initialData.education || '');
      setPopulation(String(initialData.population));
      setFamilies(String(initialData.families));
      setAnmName(initialData.anmName);
      setAnmPhone(initialData.anmPhone || '');
      setChoName(initialData.choName);
      setChoPhone(initialData.choPhone || '');
      setAadhaarRaw(initialData.aadhaarMasked);
      setJanAadhaar(initialData.janAadhaar);
      setBankName(initialData.bankName || '');
      setBankRaw(initialData.bankAccountMasked);
      setIfsc(initialData.ifsc);
      setNotes(initialData.notes || '');
      setPhotoDataUrl(initialData.photoDataUrl);
      setPhotoSizeKb(
        initialData.photoDataUrl
          ? Math.max(1, Math.round((initialData.photoDataUrl.length * 0.75) / 1024))
          : null
      );
      setPhotoOriginalKb(null);
      setPhotoError(null);
      setEncryptPassphrase('');
      setDecryptPassphrase('');
      setDecryptedAadhaar(null);
      setDecryptedBank(null);
      setDecryptError(null);
    } else {
      const defaultGid =
        groups.length === 0
          ? '__new__'
          : activeGroupId !== 'all' && groups.some((g) => g.id === activeGroupId)
            ? activeGroupId
            : groups[0].id;
      const grp = groups.find((g) => g.id === defaultGid);
      setGroupId(defaultGid);
      setHospitalNameInput(grp?.name || '');
      setName('');
      setAshaCode('');
      setPhone('');
      setHusbandName('');
      setHusbandPhone('');
      setSubCenter(grp?.subCenters[0] || '');
      setSubCenterAddress('');
      setAwcName('');
      setAwcWorkerName('');
      setAwcWorkerPhone('');
      setSathinName('');
      setSathinPhone('');
      setSwachhKarmiName('');
      setSwachhKarmiPhone('');
      setVillage('');
      setJoiningDate(new Date().toISOString().slice(0, 10));
      setDateOfBirth('');
      setEducation('');
      setPopulation('1000');
      setFamilies('200');
      setAnmName('');
      setAnmPhone('');
      setChoName('');
      setChoPhone('');
      setAadhaarRaw('');
      setJanAadhaar('');
      setBankName('');
      setBankRaw('');
      setIfsc('');
      setNotes('');
      setPhotoDataUrl(undefined);
      setPhotoSizeKb(null);
      setPhotoOriginalKb(null);
      setPhotoError(null);
      setEncryptPassphrase('');
      setDecryptPassphrase('');
      setDecryptedAadhaar(null);
      setDecryptedBank(null);
      setDecryptError(null);
    }
  }, [isOpen, initialData, activeGroupId, groups]);

  if (!isOpen) return null;

  const selectedGroup = groups.find((g) => g.id === groupId);

  const normalizedPhone = phone.replace(/\D/g, '');
  const normalizedCode = ashaCode.trim().toLowerCase();
  const duplicateMatch = existingAshas.find((other) => {
    if (initialData && other.id === initialData.id) return false;
    const otherPhone = (other.phone || '').replace(/\D/g, '');
    const otherCode = (other.ashaCode || '').trim().toLowerCase();
    return (
      (normalizedPhone.length >= 10 && otherPhone === normalizedPhone) ||
      (normalizedCode.length > 0 && otherCode === normalizedCode)
    );
  });

  const handleDecryptRecords = async () => {
    if (!initialData || !decryptPassphrase.trim()) return;
    setDecryptError(null);
    setDecryptBusy(true);
    try {
      const pass = decryptPassphrase.trim();
      const decAadhaar = initialData.aadhaarEncrypted
        ? await decryptSensitiveText(initialData.aadhaarEncrypted, pass)
        : null;
      const decBank = initialData.bankAccountEncrypted
        ? await decryptSensitiveText(initialData.bankAccountEncrypted, pass)
        : null;
      setDecryptedAadhaar(decAadhaar);
      setDecryptedBank(decBank);
    } catch {
      setDecryptedAadhaar(null);
      setDecryptedBank(null);
      setDecryptError(
        hi
          ? 'गलत पासफ़्रेज़ — डिक्रिप्ट विफल। सही पासफ़्रेज़ डालें।'
          : 'Incorrect passphrase — decryption failed.'
      );
    } finally {
      setDecryptBusy(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPhotoError(null);
    setPhotoCompressing(true);
    try {
      const { dataUrl, kb, originalKb } = await compressAshaPhoto(file, 420, 45);
      setPhotoDataUrl(dataUrl);
      setPhotoSizeKb(kb);
      setPhotoOriginalKb(originalKb);
    } catch {
      setPhotoError(
        hi ? 'फ़ोटो प्रोसेस नहीं हो सकी, कृपया दूसरी छवि चुनें।' : 'Unable to process image, please try another photo.'
      );
    } finally {
      setPhotoCompressing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const aadhaarDigits = aadhaarRaw.replace(/\D/g, '');
    const aadhaarMasked =
      aadhaarRaw.startsWith('XXXX-') ? aadhaarRaw : maskAadhaar(aadhaarDigits || aadhaarRaw);
    const bankMasked = bankRaw.startsWith('XXXX') ? bankRaw : maskBankAccount(bankRaw);

    let aadhaarEncrypted = initialData?.aadhaarEncrypted;
    let bankAccountEncrypted = initialData?.bankAccountEncrypted;
    if (encryptPassphrase.trim()) {
      if (!aadhaarRaw.startsWith('XXXX-') && aadhaarDigits) {
        aadhaarEncrypted = await encryptSensitiveText(aadhaarDigits, encryptPassphrase.trim());
      }
      if (!bankRaw.startsWith('XXXX') && bankRaw.trim()) {
        bankAccountEncrypted = await encryptSensitiveText(bankRaw.trim(), encryptPassphrase.trim());
      }
    }

    let resolvedGroupId = groupId;
    let resolvedHospitalName =
      groups.find((g) => g.id === groupId)?.name || hospitalNameInput.trim();

    if (groupId === '__new__' || !groups.some((g) => g.id === groupId)) {
      const typedHosp = hospitalNameInput.trim() || (hi ? 'अस्पताल समूह' : 'Hospital Group');
      if (onEnsureHospitalGroup) {
        const ensured = onEnsureHospitalGroup(typedHosp, subCenter.trim());
        resolvedGroupId = ensured.id;
        resolvedHospitalName = ensured.name;
      } else {
        resolvedGroupId = `hosp-${Date.now()}`;
        resolvedHospitalName = typedHosp;
      }
    }

    onSave({
      id: initialData?.id || `asha-${Date.now()}`,
      groupId: resolvedGroupId,
      hospitalName: resolvedHospitalName,
      name: name.trim(),
      ashaCode: ashaCode.trim() || undefined,
      husbandName: husbandName.trim(),
      husbandPhone: husbandPhone.trim(),
      subCenter: subCenter.trim(),
      subCenterAddress: subCenterAddress.trim(),
      awcName: awcName.trim(),
      awcWorkerName: awcWorkerName.trim(),
      awcWorkerPhone: awcWorkerPhone.trim(),
      sathinName: sathinName.trim(),
      sathinPhone: sathinPhone.trim(),
      swachhKarmiName: swachhKarmiName.trim(),
      swachhKarmiPhone: swachhKarmiPhone.trim(),
      village: village.trim(),
      phone: phone.trim(),
      photoDataUrl,
      aadhaarMasked,
      aadhaarEncrypted,
      janAadhaar: janAadhaar.trim(),
      bankName: bankName.trim(),
      bankAccountMasked: bankMasked,
      bankAccountEncrypted,
      ifsc: ifsc.trim().toUpperCase(),
      population: Math.max(0, Number(population) || 0),
      families: Math.max(0, Number(families) || 0),
      anmName: anmName.trim(),
      anmPhone: anmPhone.trim(),
      choName: choName.trim(),
      choPhone: choPhone.trim(),
      joiningDate,
      dateOfBirth: dateOfBirth || undefined,
      education: education.trim() || undefined,
      notes: notes.trim() || undefined,
      status: initialData?.status || 'active',
      updatedAt: new Date().toISOString(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-t-3xl border border-slate-200 bg-white shadow-xl sm:rounded-2xl">
        <div className="mx-auto mt-3 h-1.5 w-10 rounded-full bg-slate-300 sm:hidden" />

        <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-900">
            {initialData
              ? hi ? 'आशा प्रोफ़ाइल संपादित करें' : 'Edit ASHA Profile'
              : hi ? 'आशा जोड़ें (पूर्ण प्रोफ़ाइल)' : 'Add ASHA Worker'}
          </h2>
          <div className="flex items-center gap-2">
            {initialData && onViewReport && (
              <button
                type="button"
                onClick={() => onViewReport(initialData.id)}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3 text-xs font-semibold text-teal-800 hover:bg-teal-100"
              >
                <ClipboardList className="h-3.5 w-3.5" />
                <span>{hi ? 'व्यक्तिगत रिपोर्ट' : 'Individual Report'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {/* Section 1: Personal & Husband Info */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-teal-800 border-b border-slate-100 pb-1.5">
              {hi ? '1. व्यक्तिगत व पति का विवरण' : '1. Personal & Spouse Details'}
            </h3>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex flex-col items-center gap-1.5 shrink-0">
                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 text-slate-500">
                  {photoDataUrl ? (
                    <img src={photoDataUrl} alt={name || 'ASHA'} className="h-full w-full object-cover" />
                  ) : (
                    <Camera className="h-6 w-6 text-slate-400" />
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={photoCompressing}
                    className="inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-teal-700/25 bg-teal-50 px-2 text-[11px] font-semibold text-teal-900 hover:bg-teal-100"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    <span>{hi ? 'कैमरा' : 'Cam'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={photoCompressing}
                    className="inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>{hi ? 'फ़ाइल' : 'File'}</span>
                  </button>
                  {photoDataUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoDataUrl(undefined);
                        setPhotoSizeKb(null);
                        setPhotoOriginalKb(null);
                        setPhotoError(null);
                      }}
                      aria-label="Remove photo"
                      className="inline-flex min-h-[34px] min-w-[34px] items-center justify-center rounded-lg border border-slate-200 text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <span className="text-[10px] font-medium text-slate-500 tabular-nums text-center">
                  {photoCompressing
                    ? hi ? 'कम्प्रेस हो रहा...' : 'Compressing...'
                    : photoError
                      ? <span className="text-rose-600">{photoError}</span>
                      : photoSizeKb
                        ? photoOriginalKb && photoOriginalKb > photoSizeKb
                          ? `${photoOriginalKb} KB → ${photoSizeKb} KB`
                          : `${hi ? 'कम्प्रेस्ड:' : 'Compressed:'} ${photoSizeKb} KB`
                        : hi ? 'ऑटो-कम्प्रेस (420px)' : 'Auto-compress (420px)'}
                </span>
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </div>

              <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    {hi ? 'अस्पताल / PHC का नाम चुनें या जोड़ें *' : 'Hospital / PHC Name *'}
                  </label>
                  <select
                    value={groupId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setGroupId(val);
                      if (val === '__new__') {
                        setHospitalNameInput('');
                      } else {
                        const found = groups.find((g) => g.id === val);
                        setHospitalNameInput(found?.name || '');
                      }
                    }}
                    className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                  >
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                    <option value="__new__">
                      {hi ? '+ नया अस्पताल नाम लिखें / जोड़ें' : '+ Add New Hospital Name'}
                    </option>
                  </select>
                  {groupId === '__new__' && (
                    <input
                      required
                      value={hospitalNameInput}
                      onChange={(e) => setHospitalNameInput(e.target.value)}
                      placeholder={hi ? 'नये अस्पताल / PHC का नाम लिखें' : 'Enter new Hospital / PHC name'}
                      className="mt-2 w-full min-h-[44px] rounded-xl border border-teal-300 bg-teal-50/40 px-3 py-2 text-sm text-slate-900"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    {hi ? 'आशा का पूरा नाम *' : 'ASHA Full Name *'}
                  </label>
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {hi ? 'आशा का मोबाइल नंबर' : 'ASHA Mobile Number'}
                </label>
                <input
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-200 px-3 py-2 text-sm tabular-nums text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {hi ? 'आशा के पति का नाम' : 'Husband Name'}
                </label>
                <input
                  value={husbandName}
                  onChange={(e) => setHusbandName(e.target.value)}
                  className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {hi ? 'पति का फोन नंबर' : 'Husband Phone Number'}
                </label>
                <input
                  type="tel"
                  inputMode="tel"
                  value={husbandPhone}
                  onChange={(e) => setHusbandPhone(e.target.value)}
                  className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-200 px-3 py-2 text-sm tabular-nums text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Sub-Center, AWC & Posting */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-teal-800 border-b border-slate-100 pb-1.5">
              {hi ? '2. सब सेंटर, एडब्ल्यूसी (AWC) व पदस्थापन' : '2. Sub-Center, AWC & Posting'}
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {hi ? 'सब सेंटर (उप-केंद्र) का नाम' : 'Sub-Center Name'}
                </label>
                <input
                  list="sc-suggestions"
                  value={subCenter}
                  onChange={(e) => setSubCenter(e.target.value)}
                  className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                />
                <datalist id="sc-suggestions">
                  {(selectedGroup?.subCenters || []).map((sc) => (
                    <option key={sc} value={sc} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {hi ? 'सब सेंटर का पता' : 'Sub-Center Address'}
                </label>
                <input
                  value={subCenterAddress}
                  onChange={(e) => setSubCenterAddress(e.target.value)}
                  placeholder={hi ? 'ग्राम / पंचायत / वार्ड पता' : 'Full Sub-Center address'}
                  className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {hi ? 'एडब्ल्यूसी (AWC / आंगनवाड़ी) का नाम' : 'AWC Name'}
                </label>
                <input
                  value={awcName}
                  onChange={(e) => setAwcName(e.target.value)}
                  placeholder={hi ? 'आंगनवाड़ी केंद्र...' : 'Anganwadi Center...'}
                  className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {hi ? 'गांव / वार्ड' : 'Village / Ward'}
                </label>
                <input
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {hi ? 'पदस्थापन की तारीख (जॉइनिंग डेट)' : 'Joining Date (Posting Date)'}
                </label>
                <input
                  type="date"
                  value={joiningDate}
                  onChange={(e) => setJoiningDate(e.target.value)}
                  className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-200 px-3 py-2 text-sm tabular-nums text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Section 3: ANM, CHO, AWC Worker, Sathin & SwachhKarmi Details */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-teal-800 border-b border-slate-100 pb-1.5">
              {hi
                ? '3. टीम व सहयोगी स्टाफ (ANM, CHO, AWC कार्यकर्ता, साथिन व स्वच्छकर्मी)'
                : '3. Field Team (ANM, CHO, AWC Worker, Sathin & SwachhKarmi)'}
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {hi ? 'एएनएम (ANM) का नाम' : 'ANM Name'}
                </label>
                <input
                  value={anmName}
                  onChange={(e) => setAnmName(e.target.value)}
                  className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {hi ? 'एएनएम (ANM) का नंबर' : 'ANM Phone Number'}
                </label>
                <input
                  type="tel"
                  inputMode="tel"
                  value={anmPhone}
                  onChange={(e) => setAnmPhone(e.target.value)}
                  className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-200 px-3 py-2 text-sm tabular-nums text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {hi ? 'सीएचओ (CHO) का नाम' : 'CHO Name'}
                </label>
                <input
                  value={choName}
                  onChange={(e) => setChoName(e.target.value)}
                  className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {hi ? 'सीएचओ (CHO) का नंबर' : 'CHO Phone Number'}
                </label>
                <input
                  type="tel"
                  inputMode="tel"
                  value={choPhone}
                  onChange={(e) => setChoPhone(e.target.value)}
                  className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-200 px-3 py-2 text-sm tabular-nums text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {hi ? 'AWC कार्यकर्ता (आंगनवाड़ी कार्यकर्ता) का नाम' : 'AWC Worker Name'}
                </label>
                <input
                  value={awcWorkerName}
                  onChange={(e) => setAwcWorkerName(e.target.value)}
                  className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {hi ? 'AWC कार्यकर्ता का नंबर' : 'AWC Worker Phone Number'}
                </label>
                <input
                  type="tel"
                  inputMode="tel"
                  value={awcWorkerPhone}
                  onChange={(e) => setAwcWorkerPhone(e.target.value)}
                  className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-200 px-3 py-2 text-sm tabular-nums text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {hi ? 'साथिन (Sathin) का नाम' : 'Sathin Name'}
                </label>
                <input
                  value={sathinName}
                  onChange={(e) => setSathinName(e.target.value)}
                  className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {hi ? 'साथिन (Sathin) का नंबर' : 'Sathin Phone Number'}
                </label>
                <input
                  type="tel"
                  inputMode="tel"
                  value={sathinPhone}
                  onChange={(e) => setSathinPhone(e.target.value)}
                  className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-200 px-3 py-2 text-sm tabular-nums text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {hi ? 'स्वच्छकर्मी / सचकर्मी का नाम' : 'SwachhKarmi / SachKarmi Name'}
                </label>
                <input
                  value={swachhKarmiName}
                  onChange={(e) => setSwachhKarmiName(e.target.value)}
                  className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {hi ? 'स्वच्छकर्मी / सचकर्मी का नंबर' : 'SwachhKarmi / SachKarmi Phone'}
                </label>
                <input
                  type="tel"
                  inputMode="tel"
                  value={swachhKarmiPhone}
                  onChange={(e) => setSwachhKarmiPhone(e.target.value)}
                  className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-200 px-3 py-2 text-sm tabular-nums text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Aadhaar, Jan Aadhaar & Bank Details */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-teal-800 border-b border-slate-100 pb-1.5">
              {hi ? '4. आधार, जन आधार व बैंक खाता विवरण' : '4. Aadhaar, Jan Aadhaar & Bank Account'}
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {hi ? 'आधार कार्ड नंबर' : 'Aadhaar Card Number'}
                </label>
                <input
                  value={aadhaarRaw}
                  onChange={(e) => setAadhaarRaw(e.target.value)}
                  placeholder="1234 5678 9012"
                  className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-200 px-3 py-2 font-mono text-sm tabular-nums text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {hi ? 'जन आधार कार्ड नंबर' : 'Jan Aadhaar Card Number'}
                </label>
                <input
                  value={janAadhaar}
                  onChange={(e) => setJanAadhaar(e.target.value)}
                  className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-200 px-3 py-2 font-mono text-sm text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {hi ? 'बैंक का नाम' : 'Bank Name'}
                </label>
                <input
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="SBI / BOB / RRB"
                  className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {hi ? 'अकाउंट नंबर' : 'Account Number'}
                </label>
                <input
                  value={bankRaw}
                  onChange={(e) => setBankRaw(e.target.value)}
                  className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-200 px-3 py-2 font-mono text-sm tabular-nums text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {hi ? 'आईएफएससी कोड (IFSC)' : 'IFSC Code'}
                </label>
                <input
                  value={ifsc}
                  onChange={(e) => setIfsc(e.target.value)}
                  placeholder="SBIN0031402"
                  className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-200 px-3 py-2 font-mono text-sm uppercase text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Other Essential Information */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-teal-800 border-b border-slate-100 pb-1.5">
              {hi ? '5. अन्य सभी आवश्यक जानकारी व सुरक्षा' : '5. Other Essential Information & Security'}
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {hi ? 'आशा ID / कोड' : 'ASHA Code'}
                </label>
                <input
                  value={ashaCode}
                  onChange={(e) => setAshaCode(e.target.value)}
                  className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {hi ? 'जनसंख्या' : 'Population'}
                </label>
                <input
                  type="number"
                  value={population}
                  onChange={(e) => setPopulation(e.target.value)}
                  className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-200 px-3 py-2 text-sm tabular-nums text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {hi ? 'परिवार संख्या' : 'Families'}
                </label>
                <input
                  type="number"
                  value={families}
                  onChange={(e) => setFamilies(e.target.value)}
                  className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-200 px-3 py-2 text-sm tabular-nums text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {hi ? 'जन्म तिथि' : 'Date of Birth'}
                </label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-200 px-2.5 py-2 text-xs tabular-nums text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {hi ? 'शैक्षणिक योग्यता' : 'Education'}
                </label>
                <input
                  value={education}
                  onChange={(e) => setEducation(e.target.value)}
                  placeholder={hi ? '8th / 10th / 12th / स्नातक' : '10th / 12th / Graduate'}
                  className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-teal-800">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>
                    {hi ? 'AES-GCM एन्क्रिप्शन पासफ़्रेज़ (वैकल्पिक)' : 'AES-GCM Passphrase (Optional)'}
                  </span>
                </label>
                <input
                  type="password"
                  value={encryptPassphrase}
                  onChange={(e) => setEncryptPassphrase(e.target.value)}
                  placeholder={hi ? 'आधार व खाता एन्क्रिप्ट करने हेतु' : 'Encrypts raw Aadhaar & Bank'}
                  className="mt-1 w-full min-h-[44px] rounded-xl border border-teal-200 bg-teal-50/40 px-3 py-2 text-sm text-slate-900"
                />
              </div>
            </div>

            {initialData && (initialData.aadhaarEncrypted || initialData.bankAccountEncrypted) && (
              <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-3 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-teal-900">
                    <KeyRound className="h-3.5 w-3.5" />
                    {hi
                      ? 'एन्क्रिप्टेड आधार / बैंक खाता सत्यापित कर देखें'
                      : 'Decrypt & Verify Encrypted Aadhaar / Bank'}
                  </span>
                  {(decryptedAadhaar !== null || decryptedBank !== null) && (
                    <button
                      type="button"
                      onClick={() => {
                        setDecryptedAadhaar(null);
                        setDecryptedBank(null);
                        setDecryptPassphrase('');
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900"
                    >
                      <EyeOff className="h-3.5 w-3.5" />
                      <span>{hi ? 'छुपाएं' : 'Hide'}</span>
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="password"
                    value={decryptPassphrase}
                    onChange={(e) => setDecryptPassphrase(e.target.value)}
                    placeholder={hi ? 'एन्क्रिप्शन पासफ़्रेज़ दर्ज करें' : 'Enter encryption passphrase'}
                    className="flex-1 min-w-[180px] min-h-[40px] rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900"
                  />
                  <button
                    type="button"
                    disabled={decryptBusy || !decryptPassphrase.trim()}
                    onClick={handleDecryptRecords}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-teal-700 px-3.5 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>{decryptBusy ? '...' : hi ? 'डिक्रिप्ट कर देखें' : 'Decrypt & View'}</span>
                  </button>
                </div>
                {decryptError && (
                  <p className="text-xs font-semibold text-rose-700">{decryptError}</p>
                )}
                {(decryptedAadhaar !== null || decryptedBank !== null) && (
                  <div className="grid grid-cols-1 gap-2 rounded-lg border border-teal-200 bg-white p-2.5 text-xs sm:grid-cols-2">
                    {decryptedAadhaar !== null && (
                      <div>
                        <span className="text-slate-500">{hi ? 'मूल आधार नंबर:' : 'Original Aadhaar:'}</span>{' '}
                        <strong className="font-mono text-slate-900 select-all">{decryptedAadhaar}</strong>
                      </div>
                    )}
                    {decryptedBank !== null && (
                      <div>
                        <span className="text-slate-500">{hi ? 'मूल बैंक खाता:' : 'Original Bank Acc:'}</span>{' '}
                        <strong className="font-mono text-slate-900 select-all">{decryptedBank}</strong>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                {hi ? 'अन्य टिप्पणी / विशेष जानकारी' : 'Other Remarks / Notes'}
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
              />
            </div>
          </div>

          {duplicateMatch && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs font-semibold text-amber-900">
              {hi
                ? `चेतावनी: मोबाइल नंबर या आशा कोड पहले से "${duplicateMatch.name}" (${duplicateMatch.subCenter}) के नाम से दर्ज है।`
                : `Duplicate Warning: Phone or ASHA Code already exists for "${duplicateMatch.name}" (${duplicateMatch.subCenter}).`}
            </div>
          )}

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
              {hi ? 'आशा प्रोफ़ाइल सेव करें' : 'Save ASHA Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
