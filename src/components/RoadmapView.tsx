import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  FileArchive,
  FileCode2,
  FolderOpen,
  Lock,
  RefreshCw,
  Share2,
  ShieldAlert,
  Trash2,
  Upload,
} from 'lucide-react';
import type { AppSettings, Language, PhcGroup, RoadmapStepState } from '../types/asha';
import {
  buildStandaloneWwwHtml,
  downloadAndroidProjectZip,
  generateAndroidProjectFiles,
} from '../utils/androidProjectGenerator';
import { PWAInstallButton } from './PWAInstallButton';

interface RoadmapViewProps {
  lang: Language;
  settings: AppSettings;
  groups: PhcGroup[];
  roadmap: RoadmapStepState;
  onToggleRoadmapStep: (stepId: string) => void;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  onOpenHospitalManager: () => void;
  onExportBackup: () => void;
  onShareBackup: () => void;
  onImportBackup: (file: File) => void;
  onClearAllData: () => void;
  onLockNow: () => void;
}

const ROADMAP_PHASES = [
  {
    id: 'phase-0',
    weekHi: 'सप्ताह 1',
    weekEn: 'Week 1',
    titleHi: '0. APK और फ़ोन जांच',
    titleEn: '0. APK Build & Phone Verification',
    criteriaHi: 'मापदंड: सारी सुविधाएं असली फ़ोन पर बिना त्रुटि चलें',
    criteriaEn: 'Exit Criteria: All native & offline features run error-free on a real phone',
    tasks: [
      { id: 'p0-repo', hi: 'Private GitHub repo बनाकर Actions → Build APK से AshaManagement.apk निकालना', en: 'Create private GitHub repo and build AshaManagement.apk via Actions' },
      { id: 'p0-device', hi: 'असली Android फ़ोन पर फ़िंगरप्रिंट, कैमरा, प्रिंट/PDF, WhatsApp, SMS और बैकअप-वापसी जांचना', en: 'Test biometric lock, camera, print/PDF, WhatsApp, SMS & backup restore on real device' },
      { id: 'p0-build', hi: 'बग सुधार व v1.0 साइनिंग कुंजी (asha-release.jks) की 3 सुरक्षित कॉपी रखना', en: 'Fix device bugs and save 3 secure copies of app/asha-release.jks' },
    ],
  },
  {
    id: 'phase-1',
    weekHi: 'सप्ताह 2',
    weekEn: 'Week 2',
    titleHi: '1. डेटा भरना (PHC सोम)',
    titleEn: '1. Data Onboarding (PHC Som)',
    criteriaHi: 'मापदंड: 23 आशा दर्ज; बैकअप फ़ाइल बन रही हो',
    criteriaEn: 'Exit Criteria: 23 ASHAs onboarded across 8 sub-centers; auto-backup active',
    tasks: [
      { id: 'p1-group', hi: 'PHC सोम का समूह बनाना (MOIC/SHS नाम, छुट्टी सीमा, क्लेम तारीख, सेक्टर मीटिंग दिन)', en: 'Configure PHC Som group (MOIC/SHS, leave limit, claim date, sector meeting day)' },
      { id: 'p1-ashas', hi: '8 उप-केंद्रों की सभी 23 आशा की प्रोफ़ाइल, फ़ोटो, आधार/जन-आधार व बैंक विवरण भरना', en: 'Enter all 23 ASHA profiles across 8 sub-centers with photos and IDs' },
    ],
  },
  {
    id: 'phase-2',
    weekHi: 'सप्ताह 3–6',
    weekEn: 'Weeks 3–6',
    titleHi: '2. PHC सोम पायलट (1 माह)',
    titleEn: '2. Live Field Pilot (1 Month)',
    criteriaHi: 'मापदंड: एक माह का डेटा बिना हाथ से सुधार के सही रिपोर्ट दे',
    criteriaEn: 'Exit Criteria: 1 full month produces accurate Excel/Word/PDF reports without manual fixes',
    tasks: [
      { id: 'p2-attendance', hi: 'सेक्टर बैठक की बल्क व व्यक्तिगत उपस्थिति (आने-जाने के समय सहित) चलाना', en: 'Run live bulk/individual sector meeting attendance with in/out times' },
      { id: 'p2-claims', hi: 'मासिक क्लेम वाउचर जमा, देरी की पहचान, छुट्टी सीमा व नोटिस वास्तविक काम में जांचना', en: 'Verify monthly claim vouchers, delay flags, leave limits & notices in real work' },
      { id: 'p2-audit', hi: 'पायलट के दौरान पुराने कागज़ी रजिस्टर से रिपोर्ट का मिलान करना', en: 'Cross-verify digital reports against existing paper registers' },
    ],
  },
  {
    id: 'phase-3',
    weekHi: 'सप्ताह 7–8',
    weekEn: 'Weeks 7–8',
    titleHi: '3. सुधार और v1.1',
    titleEn: '3. Hardening & v1.1 Release',
    criteriaHi: 'मापदंड: अपडेट बटन से नया वर्ज़न बिना डेटा खोए इंस्टॉल हो',
    criteriaEn: 'Exit Criteria: In-app update installs v1.1 over v1.0 with zero data loss',
    tasks: [
      { id: 'p3-crypto', hi: 'आधार और बैंक डेटा का AES-GCM एन्क्रिप्शन व डिक्रिप्शन सत्यापन सक्रिय करना', en: 'Enable AES-GCM local encryption & passphrase verification for Aadhaar & Bank records' },
      { id: 'p3-drive', hi: 'बैकअप फ़ाइल (.json) नियमित रूप से Drive / WhatsApp पर सुरक्षित रखना', en: 'Archive asha_backup.json regularly to Google Drive or WhatsApp' },
      { id: 'p3-ota', hi: 'GitHub tag v1.1 से version.json और इन-ऐप ऑटो-अपडेट सत्यापित करना', en: 'Publish v1.1 GitHub Release and verify seamless OTA update via version.json' },
    ],
  },
  {
    id: 'phase-4',
    weekHi: 'सप्ताह 9–12',
    weekEn: 'Weeks 9–12',
    titleHi: '4. नई सुविधाएं व विस्तार',
    titleEn: '4. Advanced Features & Multi-PHC Scale',
    criteriaHi: 'मापदंड: दूसरा समूह जुड़ने पर पहले का डेटा अलग और सुरक्षित रहे',
    criteriaEn: 'Exit Criteria: Adding a 2nd PHC isolates data cleanly & powers combined dashboard',
    tasks: [
      { id: 'p4-headcount', hi: 'हेड काउंट सर्वे (0-16 वर्ष व गर्भवती/धात्री) और कुल योग रिपोर्ट लागू करना', en: 'Deploy Head Count Survey (0-16 yrs & Pregnant/Dhatri) analytics' },
      { id: 'p4-multi', hi: 'दूसरे PHC का समूह जोड़ना और सभी समूहों का समेकित डैशबोर्ड चलाना', en: 'Onboard 2nd PHC group and validate All-Groups Combined Dashboard' },
      { id: 'p4-qrpdf', hi: 'लेटरहेड और स्कैन-सक्षम QR सत्यापन वाला A4 हिंदी PDF नोटिस लागू करना', en: 'Finalize official Hindi letterhead A4 PDF notices with scannable ISO QR verification' },
    ],
  },
];

const RISKS = [
  {
    riskHi: 'फ़ोन खोना या खराब होना',
    riskEn: 'Lost or damaged phone',
    impactHi: 'पूरा रिकॉर्ड चला जाए',
    impactEn: 'Complete data loss',
    mitigationHi: 'हर सप्ताह asha_backup.json डाउनलोड करें व Google Drive / WhatsApp पर सुरक्षित कॉपी भेजें',
    mitigationEn: 'Export asha_backup.json weekly and share a copy to Google Drive / WhatsApp',
  },
  {
    riskHi: 'साइनिंग कुंजी (asha-release.jks) खोना',
    riskEn: 'Losing signing key (asha-release.jks)',
    impactHi: 'नया APK पुराने ऐप पर इंस्टॉल न हो',
    impactEn: 'Future updates cannot install over v1.0',
    mitigationHi: 'Private GitHub repo + Google Drive + Pen-drive में 3 कॉपी और पासवर्ड अलग से रखें',
    mitigationEn: 'Keep 3 copies (Private Repo, Drive, USB) with password stored separately',
  },
  {
    riskHi: 'आधार / बैंक डेटा का रिसाव',
    riskEn: 'Aadhaar / Bank data exposure',
    impactHi: 'निजता का उल्लंघन',
    impactEn: 'Privacy breach',
    mitigationHi: 'कस्टम PIN लॉक, रिपोर्ट में केवल आख़िरी 4 अंक, और पासफ़्रेज़ आधारित AES-GCM एन्क्रिप्शन',
    mitigationEn: 'Custom PIN lock, masked last-4 digits in reports, and AES-GCM encryption',
  },
];

export const RoadmapView: React.FC<RoadmapViewProps> = ({
  lang,
  settings,
  groups,
  roadmap,
  onToggleRoadmapStep,
  onUpdateSettings,
  onOpenHospitalManager,
  onExportBackup,
  onShareBackup,
  onImportBackup,
  onClearAllData,
  onLockNow,
}) => {
  const hi = lang === 'hi';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedPath, setSelectedPath] = useState('app/build.gradle.kts');
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [zipBusy, setZipBusy] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [showRoadmapChecklist, setShowRoadmapChecklist] = useState(false);

  const projectConfig = useMemo(
    () => ({
      applicationId: settings.applicationId || 'com.ashamanagement.app',
      versionName: settings.versionName || '1.0.0',
      versionCode: Number(settings.versionCode) || 1,
      updateJsonUrl: settings.updateJsonUrl || '',
    }),
    [settings.applicationId, settings.versionName, settings.versionCode, settings.updateJsonUrl]
  );

  const generatedFiles = useMemo(() => generateAndroidProjectFiles(projectConfig), [projectConfig]);
  const activeFile = useMemo(
    () => generatedFiles.find((f) => f.path === selectedPath) || generatedFiles[0],
    [generatedFiles, selectedPath]
  );

  const totalTasks = ROADMAP_PHASES.reduce((acc, p) => acc + p.tasks.length, 0);
  const doneTasks = ROADMAP_PHASES.reduce(
    (acc, p) => acc + p.tasks.filter((t) => roadmap.completedIds.includes(t.id)).length,
    0
  );

  const handleDownloadZip = async () => {
    setZipBusy(true);
    try {
      await downloadAndroidProjectZip(projectConfig);
    } finally {
      setZipBusy(false);
    }
  };

  const handleDownloadHtmlOnly = () => {
    const html = buildStandaloneWwwHtml(projectConfig);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'index.html';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleCopyFile = async () => {
    if (!activeFile) return;
    await navigator.clipboard.writeText(activeFile.content);
    setCopiedPath(activeFile.path);
    setTimeout(() => setCopiedPath(null), 1800);
  };

  return (
    <div className="space-y-6">
      {/* 1. Primary Settings: Backup, Security PIN, Hospital Manager & Safe Reset */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {hi ? 'ऐप सेटिंग्स, डेटा बैकअप व सुरक्षा' : 'App Settings, Backup & Security'}
            </h2>
            <p className="mt-0.5 text-xs text-slate-600">
              {settings.lastBackupAt
                ? `${hi ? 'अंतिम JSON बैकअप:' : 'Last JSON Backup:'} ${new Date(settings.lastBackupAt).toLocaleString()}`
                : hi
                  ? 'अभी तक कोई JSON बैकअप डाउनलोड नहीं हुआ है — नियमित बैकअप सेव रखें।'
                  : 'No local JSON backup exported yet — export a backup regularly.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onOpenHospitalManager}
              className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-teal-700/30 bg-teal-50 px-3.5 text-xs font-semibold text-teal-900 hover:bg-teal-100"
            >
              <Building2 className="h-4 w-4" />
              <span>
                {hi ? `नया अस्पताल / PHC समूह जोड़ें (${groups.length})` : `Add / Manage Hospital Group (${groups.length})`}
              </span>
            </button>
            <PWAInstallButton lang={lang} variant="compact" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {/* Backup & Restore */}
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <p className="text-xs font-bold text-slate-800">
              {hi ? 'JSON बैकअप, शेयर (Drive / WhatsApp) व रीस्टोर' : 'JSON Backup, Share (Drive / WhatsApp) & Restore'}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onExportBackup}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 text-xs font-semibold text-white hover:bg-slate-800"
              >
                <Download className="h-3.5 w-3.5" />
                <span>asha_backup.json</span>
              </button>
              <button
                type="button"
                onClick={onShareBackup}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span>{hi ? 'Drive / WhatsApp पर भेजें' : 'Share to Drive / WhatsApp'}</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>{hi ? 'रीस्टोर (.json)' : 'Restore (.json)'}</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onImportBackup(file);
                  e.target.value = '';
                }}
              />
            </div>
            <p className="text-[11px] text-slate-500">
              {hi
                ? 'सलाह: फ़ोन बदलने या अनइंस्टॉल से पहले ऊपर "Drive / WhatsApp पर भेजें" या "asha_backup.json" से फाइल सुरक्षित रख लें।'
                : 'Tip: Export or share asha_backup.json to your Google Drive / WhatsApp before changing phones.'}
            </p>
          </div>

          {/* PIN Lock & Safe Reset */}
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <p className="text-xs font-bold text-slate-800">
              {hi ? 'ऐप पिन लॉक व सुरक्षित रीसेट' : 'App PIN Lock & Safe Reset'}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex min-h-[40px] cursor-pointer items-center gap-2 text-xs font-medium text-slate-800">
                <input
                  type="checkbox"
                  checked={settings.pinEnabled}
                  onChange={(e) => onUpdateSettings({ pinEnabled: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-teal-700"
                />
                <span>{hi ? '4-अंकीय स्क्रीन लॉक' : '4-Digit App PIN Lock'}</span>
              </label>
              {settings.pinEnabled && (
                <>
                  <input
                    type="password"
                    maxLength={4}
                    inputMode="numeric"
                    value={settings.pinCode}
                    onChange={(e) =>
                      onUpdateSettings({ pinCode: e.target.value.replace(/\D/g, '').slice(0, 4) })
                    }
                    className="w-20 min-h-[40px] rounded-xl border border-slate-200 bg-white px-2 text-center font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={onLockNow}
                    className="inline-flex min-h-[40px] items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    <span>{hi ? 'लॉक करें' : 'Lock Now'}</span>
                  </button>
                </>
              )}
              {!confirmResetOpen && (
                <button
                  type="button"
                  onClick={() => setConfirmResetOpen(true)}
                  className="ml-auto inline-flex min-h-[40px] items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-800 hover:bg-rose-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>{hi ? 'डेटा साफ़ करें' : 'Reset Data'}</span>
                </button>
              )}
            </div>

            {settings.pinEnabled && settings.pinCode === '1234' && (
              <p className="text-[11px] font-semibold text-amber-800">
                {hi
                  ? 'सुरक्षा चेतावनी: कृपया डिफ़ॉल्ट पिन "1234" को अपने निजी 4-अंकीय पिन से बदलें।'
                  : 'Security Warning: Please change the default PIN "1234" to a private 4-digit PIN.'}
              </p>
            )}

            {confirmResetOpen && (
              <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 space-y-2">
                <p className="flex items-center gap-1.5 text-xs font-bold text-rose-900">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-700" />
                  <span>
                    {hi
                      ? 'सावधान: इससे सभी अस्पताल, आशा, बैठक, क्लेम व नोटिस हमेशा के लिए मिट जाएंगे!'
                      : 'Warning: This will permanently erase all hospitals, ASHAs, meetings, claims & notices!'}
                  </span>
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmResetOpen(false)}
                    className="min-h-[36px] rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700"
                  >
                    {hi ? 'रद्द करें' : 'Cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClearAllData();
                      setConfirmResetOpen(false);
                    }}
                    className="min-h-[36px] rounded-lg bg-rose-700 px-3 text-xs font-semibold text-white hover:bg-rose-800"
                  >
                    {hi ? 'हाँ, पूरा डेटा मिटाएं' : 'Confirm Erase All'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 2. Android APK Exporter & OTA Config */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {hi ? 'Android APK प्रोजेक्ट (.zip) व वर्ज़न सेटिंग्स' : 'Android APK Project (.zip) & OTA Versioning'}
            </h3>
            <p className="mt-1 text-xs text-slate-600">
              AGP 8.7.3 · Kotlin 2.0.21 · Android SDK 34 · Gradle 8.9 · Biometric + Full Offline App
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={handleDownloadZip}
              disabled={zipBusy}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 whitespace-nowrap"
            >
              <FileArchive className="h-4 w-4" />
              <span>{zipBusy ? '...' : hi ? 'पूरा Android प्रोजेक्ट (.zip)' : 'Download Android Project (.zip)'}</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadHtmlOnly}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              <Download className="h-4 w-4" />
              <span>www/index.html</span>
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-200 pt-4 sm:grid-cols-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700">Version Name</label>
            <input
              value={settings.versionName}
              onChange={(e) => onUpdateSettings({ versionName: e.target.value })}
              className="mt-1 w-full min-h-[40px] rounded-xl border border-slate-200 px-3 font-mono text-xs tabular-nums"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">Version Code</label>
            <input
              type="number"
              min={1}
              value={settings.versionCode}
              onChange={(e) => onUpdateSettings({ versionCode: Math.max(1, Number(e.target.value) || 1) })}
              className="mt-1 w-full min-h-[40px] rounded-xl border border-slate-200 px-3 font-mono text-xs tabular-nums"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700">
              {hi ? 'OTA अपडेट लिंक (version.json)' : 'OTA Update URL (version.json)'}
            </label>
            <div className="mt-1 flex gap-2">
              <input
                type="url"
                value={settings.updateJsonUrl}
                onChange={(e) => onUpdateSettings({ updateJsonUrl: e.target.value })}
                placeholder="https://github.com/user/asha-management/releases/latest/download/version.json"
                className="w-full min-h-[40px] rounded-xl border border-slate-200 px-3 text-xs"
              />
              <span className="inline-flex items-center px-2 text-xs text-slate-400">
                <RefreshCw className="h-4 w-4" />
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. File Inspector */}
      <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3.5">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <CheckCircle2 className="h-4 w-4 text-teal-700" />
            <span>{hi ? 'Android प्रोजेक्ट फ़ाइल प्रीव्यू' : 'Android Project File Preview'}</span>
          </div>
          <button
            type="button"
            onClick={handleCopyFile}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800"
          >
            {copiedPath === activeFile?.path ? <Check className="h-3.5 w-3.5 text-teal-700" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copiedPath === activeFile?.path ? (hi ? 'कॉपी हो गया' : 'Copied') : (hi ? 'कॉपी करें' : 'Copy')}</span>
          </button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12">
          <div className="max-h-64 overflow-y-auto border-b border-slate-200 bg-slate-50 p-2 lg:col-span-4 lg:max-h-[340px] lg:border-b-0 lg:border-r">
            {generatedFiles.map((file) => (
              <button
                key={file.path}
                type="button"
                onClick={() => setSelectedPath(file.path)}
                className={`flex min-h-[40px] w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs font-mono ${
                  file.path === activeFile?.path
                    ? 'bg-teal-700 font-semibold text-white'
                    : 'text-slate-700 hover:bg-slate-200/60'
                }`}
              >
                {file.path.includes('/') ? <FileCode2 className="h-3.5 w-3.5 shrink-0" /> : <FolderOpen className="h-3.5 w-3.5 shrink-0" />}
                <span className="truncate">{file.path}</span>
              </button>
            ))}
          </div>
          <div className="max-h-[340px] overflow-auto bg-slate-900 p-4 lg:col-span-8">
            <pre className="font-mono text-xs leading-relaxed text-slate-100 whitespace-pre">
              {activeFile?.content}
            </pre>
          </div>
        </div>
      </section>

      {/* 4. Collapsible Implementation Roadmap & Risk Reference (Secondary Developer/Admin Reference) */}
      <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <button
          type="button"
          onClick={() => setShowRoadmapChecklist((v) => !v)}
          className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-slate-50"
        >
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {hi
                ? `कार्यान्वयन रोडमैप व जोखिम रजिस्टर (${doneTasks}/${totalTasks} पूर्ण)`
                : `Implementation Roadmap & Risk Register (${doneTasks}/${totalTasks} Done)`}
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {hi
                ? 'PHC पायलट रोलआउट और APK सत्यापन की चरणबद्ध चेकलिस्ट देखने के लिए क्लिक करें'
                : 'Click to expand phased rollout checklist and data safety risk register'}
            </p>
          </div>
          {showRoadmapChecklist ? (
            <ChevronUp className="h-5 w-5 text-slate-500 shrink-0" />
          ) : (
            <ChevronDown className="h-5 w-5 text-slate-500 shrink-0" />
          )}
        </button>

        {showRoadmapChecklist && (
          <div className="border-t border-slate-200 p-5 space-y-6">
            <div className="space-y-4">
              {ROADMAP_PHASES.map((phase) => (
                <div key={phase.id} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h4 className="text-sm font-bold text-slate-900">
                      {hi ? phase.titleHi : phase.titleEn}
                    </h4>
                    <span className="text-xs font-semibold text-teal-700 tabular-nums">
                      {hi ? phase.weekHi : phase.weekEn}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-600">
                    {hi ? phase.criteriaHi : phase.criteriaEn}
                  </p>
                  <div className="mt-3 space-y-2">
                    {phase.tasks.map((task) => {
                      const checked = roadmap.completedIds.includes(task.id);
                      return (
                        <button
                          key={task.id}
                          type="button"
                          onClick={() => onToggleRoadmapStep(task.id)}
                          className={`flex min-h-[42px] w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                            checked
                              ? 'border-teal-200 bg-teal-50/70 text-teal-950'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                              checked ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-300 bg-white'
                            }`}
                          >
                            {checked && <Check className="h-3.5 w-3.5" />}
                          </span>
                          <span className={checked ? 'line-through opacity-80' : ''}>
                            {hi ? task.hi : task.en}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5">
                <ShieldAlert className="h-4 w-4 text-amber-700" />
                <h4 className="text-sm font-bold text-slate-900">
                  {hi ? 'जोखिम और समाधान रजिस्टर' : 'Risk & Mitigation Register'}
                </h4>
              </div>
              <div className="divide-y divide-slate-200/70">
                {RISKS.map((r, i) => (
                  <div key={i} className="py-3">
                    <p className="text-xs font-bold text-slate-900">{hi ? r.riskHi : r.riskEn}</p>
                    <p className="mt-0.5 text-xs text-rose-700">{hi ? r.impactHi : r.impactEn}</p>
                    <p className="mt-1 text-xs text-slate-600">{hi ? r.mitigationHi : r.mitigationEn}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
