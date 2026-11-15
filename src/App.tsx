import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  CalendarCheck,
  ClipboardList,
  Download,
  Edit3,
  FileArchive,
  Home,
  Languages,
  MessageSquare,
  Phone,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import type {
  ActiveTab,
  AppSettings,
  AshaWorker,
  ClaimRecord,
  HeadCountEntry,
  LeaveRecord,
  MeetingSession,
  NoticeItem,
  PhcBackupPayload,
  PhcGroup,
  RoadmapStepState,
} from './types/asha';
import {
  buildPhcBackupPayload,
  getPhcSomPilotStarter,
  phcStore,
} from './data/phcStorage';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PinLockScreen } from './components/PinLockScreen';
import { AshaWorkerSheet } from './components/AshaWorkerSheet';
import { HospitalGroupSheet } from './components/HospitalGroupSheet';
import { PhcOperationsView } from './components/PhcOperationsView';
import { ReportsView, type NoticeDraftPrefill } from './components/ReportsView';
import { ReportShareBar } from './components/ReportShareBar';
import { RoadmapView } from './components/RoadmapView';
import { downloadExcelCsv, downloadWordDoc, escapeHtml, triggerBlobDownload } from './utils/cryptoAndExport';
import { downloadTablePdf } from './utils/pdfGenerator';

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(() => phcStore.loadSettings());
  const [groups, setGroups] = useState<PhcGroup[]>(() => phcStore.loadGroups());
  const [ashas, setAshas] = useState<AshaWorker[]>(() => phcStore.loadAshas());
  const [meetings, setMeetings] = useState<MeetingSession[]>(() => phcStore.loadMeetings());
  const [leaves, setLeaves] = useState<LeaveRecord[]>(() => phcStore.loadLeaves());
  const [claims, setClaims] = useState<ClaimRecord[]>(() => phcStore.loadClaims());
  const [headCounts, setHeadCounts] = useState<HeadCountEntry[]>(() => phcStore.loadHeadCounts());
  const [notices, setNotices] = useState<NoticeItem[]>(() => phcStore.loadNotices());
  const [roadmap, setRoadmap] = useState<RoadmapStepState>(() => phcStore.loadRoadmap());

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [unlocked, setUnlocked] = useState<boolean>(() => !phcStore.loadSettings().pinEnabled);

  const [searchQuery, setSearchQuery] = useState('');
  const [subCenterFilter, setSubCenterFilter] = useState('all');
  const [awcFilter, setAwcFilter] = useState('all');

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingAsha, setEditingAsha] = useState<AshaWorker | null>(null);
  const [ashaTargetGroupId, setAshaTargetGroupId] = useState<string | null>(null);
  const [groupSheetOpen, setGroupSheetOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<PhcGroup | null>(null);
  const [reportPreselectedAshaId, setReportPreselectedAshaId] = useState<string | null>(null);
  const [reportPreferredSubTab, setReportPreferredSubTab] = useState<'date_report' | 'asha_report' | 'notices' | null>(null);
  const [preselectedNoticeDraft, setPreselectedNoticeDraft] = useState<NoticeDraftPrefill | null>(null);
  const [confirmDeleteGroupId, setConfirmDeleteGroupId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const quickRestoreRef = useRef<HTMLInputElement>(null);
  const csvImportRef = useRef<HTMLInputElement>(null);

  const lang = settings.language;
  const hi = lang === 'hi';

  useEffect(() => {
    phcStore.saveSettings(settings);
    document.documentElement.lang = settings.language;
  }, [settings]);

  useEffect(() => phcStore.saveGroups(groups), [groups]);
  useEffect(() => phcStore.saveAshas(ashas), [ashas]);
  useEffect(() => phcStore.saveMeetings(meetings), [meetings]);
  useEffect(() => phcStore.saveLeaves(leaves), [leaves]);
  useEffect(() => phcStore.saveClaims(claims), [claims]);
  useEffect(() => phcStore.saveHeadCounts(headCounts), [headCounts]);
  useEffect(() => phcStore.saveNotices(notices), [notices]);
  useEffect(() => phcStore.saveRoadmap(roadmap), [roadmap]);

  useEffect(() => {
    const onQuotaError = () => {
      setStatusMessage(
        settings.language === 'hi'
          ? 'चेतावनी: डिवाइस स्टोरेज सीमा (5MB) भर गई है। तुरंत asha_backup.json डाउनलोड करें!'
          : 'Storage Warning: Browser 5MB localStorage limit reached. Export asha_backup.json now!'
      );
    };
    window.addEventListener('phc-storage-error', onQuotaError);
    return () => window.removeEventListener('phc-storage-error', onQuotaError);
  }, [settings.language]);

  const notify = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const updateSettings = (patch: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  };

  const handleLoadPilotStarter = () => {
    const starter = getPhcSomPilotStarter();
    setGroups(starter.groups);
    setAshas(starter.ashas);
    setMeetings(starter.meetings);
    setLeaves(starter.leaves);
    setClaims(starter.claims);
    setHeadCounts(starter.headCounts);
    setNotices(starter.notices);
    updateSettings({ activeGroupId: 'phc-som' });
    notify(
      hi
        ? 'PHC सोम (8 उप-केंद्र, 23 आशा) पायलट डेटा लोड हो गया।'
        : 'PHC Som pilot data (8 sub-centers, 23 ASHAs) loaded.'
    );
  };

  const handleSaveAsha = (worker: AshaWorker) => {
    setAshas((prev) => {
      const exists = prev.some((w) => w.id === worker.id);
      return exists ? prev.map((w) => (w.id === worker.id ? worker : w)) : [worker, ...prev];
    });
    setEditingAsha(null);
    setAshaTargetGroupId(null);
  };

  const handleEnsureHospitalGroup = (hospitalName: string, subCenterName?: string): PhcGroup => {
    const cleanName = hospitalName.trim();
    const existing = groups.find(
      (g) => g.name.trim().toLowerCase() === cleanName.toLowerCase()
    );
    if (existing) {
      if (subCenterName && !existing.subCenters.includes(subCenterName)) {
        const updated = { ...existing, subCenters: [...existing.subCenters, subCenterName] };
        setGroups((prev) => prev.map((g) => (g.id === existing.id ? updated : g)));
        return updated;
      }
      return existing;
    }
    const created: PhcGroup = {
      id: `hosp-${Date.now()}`,
      name: cleanName,
      moicName: 'MOIC',
      shsName: 'SHS',
      annualLeaveLimit: 12,
      claimDueDay: 5,
      sectorMeetingDay: hi ? 'गुरुवार (Thursday)' : 'Thursday',
      subCenters: subCenterName ? [subCenterName] : ['SC Main'],
    };
    setGroups((prev) => [...prev, created]);
    updateSettings({ activeGroupId: created.id });
    return created;
  };

  const handleSaveGroup = (grp: PhcGroup) => {
    const exists = groups.some((g) => g.id === grp.id);
    setGroups((prev) =>
      exists ? prev.map((g) => (g.id === grp.id ? grp : g)) : [...prev, grp]
    );
    if (!exists) {
      updateSettings({ activeGroupId: grp.id });
    }
    setEditingGroup(null);
    notify(
      hi
        ? `${grp.name} अस्पताल समूह ${exists ? 'अपडेट हो गया' : 'बनाया गया'}।`
        : `${grp.name} hospital group ${exists ? 'updated' : 'created'}.`
    );
  };

  const handleDeleteGroup = (groupId: string) => {
    const target = groups.find((g) => g.id === groupId);
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
    setAshas((prev) => prev.filter((a) => a.groupId !== groupId));
    setMeetings((prev) => prev.filter((m) => m.groupId !== groupId));
    setLeaves((prev) => prev.filter((l) => l.groupId !== groupId));
    setClaims((prev) => prev.filter((c) => c.groupId !== groupId));
    setHeadCounts((prev) => prev.filter((hc) => hc.groupId !== groupId));
    setNotices((prev) => prev.filter((n) => n.groupId !== groupId));
    setConfirmDeleteGroupId(null);
    if (settings.activeGroupId === groupId) {
      updateSettings({ activeGroupId: 'all' });
    }
    notify(
      hi
        ? `${target?.name || 'अस्पताल समूह'} और उससे जुड़ा डेटा हटाया गया।`
        : `${target?.name || 'Hospital group'} and its linked records removed.`
    );
  };

  const handleDownloadSampleCsv = () => {
    const headers = [
      'Hospital Name',
      'ASHA Name',
      'Phone',
      'Sub-Center',
      'AWC Name',
      'AWC Worker Name',
      'AWC Worker Phone',
      'Sathin Name',
      'Sathin Phone',
      'SwachhKarmi Name',
      'SwachhKarmi Phone',
      'Husband Name',
      'Husband Phone',
      'Village',
      'Population',
      'Families',
    ];
    const sampleRows = [
      [
        groups[0]?.name || 'PHC सोम',
        'रेखा मीणा',
        '9829011223',
        groups[0]?.subCenters[0] || 'SC सोम',
        'AWC सोम-1',
        'सरोज देवी',
        '9829022334',
        'कविता बाई',
        '9829033445',
        'रमेश कुमार',
        '9829044556',
        'महेश मीणा',
        '9829055667',
        'सोम',
        '1050',
        '210',
      ],
    ];
    downloadExcelCsv('ASHA_Bulk_Import_Template.csv', headers, sampleRows);
    notify(hi ? 'नमूना CSV टेम्पलेट डाउनलोड हो गया।' : 'Sample CSV template downloaded.');
  };

  const parseCsvLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const handleImportAshasCsv = async (file: File) => {
    try {
      const rawText = (await file.text()).replace(/^\uFEFF/, '');
      const lines = rawText.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) {
        notify(hi ? 'CSV फ़ाइल में कोई डेटा पंक्ति नहीं मिली।' : 'No data rows found in CSV file.');
        return;
      }
      const existingPhones = new Set(
        ashas.map((a) => (a.phone || '').replace(/\D/g, '')).filter((p) => p.length >= 10)
      );
      const localGroups = [...groups];
      const imported: AshaWorker[] = [];
      let skipped = 0;

      for (let idx = 1; idx < lines.length; idx++) {
        const cols = parseCsvLine(lines[idx]);
        const hospName = (cols[0] || groups[0]?.name || 'PHC मुख्य').trim();
        const ashaName = (cols[1] || '').trim();
        if (!ashaName) continue;
        const phone = (cols[2] || '').trim();
        const cleanDigits = phone.replace(/\D/g, '');
        if (cleanDigits.length >= 10 && existingPhones.has(cleanDigits)) {
          skipped++;
          continue;
        }
        if (cleanDigits.length >= 10) existingPhones.add(cleanDigits);

        const sc = (cols[3] || 'SC Main').trim();
        let grp = localGroups.find((g) => g.name.trim().toLowerCase() === hospName.toLowerCase());
        if (!grp) {
          grp = {
            id: `hosp-${Date.now()}-${idx}`,
            name: hospName,
            moicName: 'MOIC',
            shsName: 'SHS',
            annualLeaveLimit: 12,
            claimDueDay: 5,
            sectorMeetingDay: hi ? 'गुरुवार (Thursday)' : 'Thursday',
            subCenters: [sc],
          };
          localGroups.push(grp);
        } else if (sc && !grp.subCenters.includes(sc)) {
          grp = { ...grp, subCenters: [...grp.subCenters, sc] };
          const gIdx = localGroups.findIndex((g) => g.id === grp!.id);
          if (gIdx >= 0) localGroups[gIdx] = grp;
        }

        imported.push({
          id: `asha-${Date.now()}-${idx}`,
          groupId: grp.id,
          hospitalName: grp.name,
          name: ashaName,
          phone,
          subCenter: sc,
          subCenterAddress: '',
          awcName: (cols[4] || '').trim(),
          awcWorkerName: (cols[5] || '').trim(),
          awcWorkerPhone: (cols[6] || '').trim(),
          sathinName: (cols[7] || '').trim(),
          sathinPhone: (cols[8] || '').trim(),
          swachhKarmiName: (cols[9] || '').trim(),
          swachhKarmiPhone: (cols[10] || '').trim(),
          husbandName: (cols[11] || '').trim(),
          husbandPhone: (cols[12] || '').trim(),
          village: (cols[13] || sc).trim(),
          population: Math.max(0, Number(cols[14]) || 1000),
          families: Math.max(0, Number(cols[15]) || 200),
          aadhaarMasked: '',
          janAadhaar: '',
          bankName: '',
          bankAccountMasked: '',
          ifsc: '',
          anmName: '',
          anmPhone: '',
          choName: '',
          choPhone: '',
          joiningDate: new Date().toISOString().slice(0, 10),
          status: 'active',
          updatedAt: new Date().toISOString(),
        });
      }

      if (imported.length > 0) {
        setGroups(localGroups);
        setAshas((prev) => [...imported, ...prev]);
        notify(
          hi
            ? `${imported.length} आशा कार्यकर्ता CSV से जोड़ी गईं${skipped > 0 ? ` (${skipped} डुप्लिकेट छोड़ी गईं)` : ''}।`
            : `Imported ${imported.length} ASHAs from CSV${skipped > 0 ? ` (${skipped} duplicates skipped)` : ''}.`
        );
      } else {
        notify(hi ? 'कोई नई आशा नहीं जुड़ी (सभी डुप्लिकेट थीं)।' : 'No new ASHAs added (all duplicates).');
      }
    } catch {
      notify(hi ? 'CSV पढ़ने में त्रुटि हुई।' : 'Failed to parse CSV file.');
    }
  };

  const handleExportBackup = () => {
    const nowIso = new Date().toISOString();
    const nextSettings = { ...settings, lastBackupAt: nowIso };
    setSettings(nextSettings);
    const payload = buildPhcBackupPayload({
      settings: nextSettings,
      groups,
      ashas,
      meetings,
      leaves,
      claims,
      headCounts,
      notices,
      roadmap,
    });
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    triggerBlobDownload(blob, 'asha_backup.json');
    notify(hi ? 'asha_backup.json डाउनलोड हो गया।' : 'asha_backup.json exported.');
  };

  const handleShareBackup = async () => {
    const payload = buildPhcBackupPayload({
      settings,
      groups,
      ashas,
      meetings,
      leaves,
      claims,
      headCounts,
      notices,
      roadmap,
    });
    const file = new File([JSON.stringify(payload, null, 2)], 'asha_backup.json', {
      type: 'application/json',
    });
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ title: 'Hospital Management App Backup', files: [file] });
        return;
      } catch {
        // fallback
      }
    }
    handleExportBackup();
  };

  const handleImportBackup = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Partial<PhcBackupPayload>;
      if (Array.isArray(parsed.groups)) setGroups(parsed.groups);
      if (Array.isArray(parsed.ashas)) setAshas(parsed.ashas);
      if (Array.isArray(parsed.meetings)) setMeetings(parsed.meetings);
      if (Array.isArray(parsed.leaves)) setLeaves(parsed.leaves);
      if (Array.isArray(parsed.claims)) setClaims(parsed.claims);
      if (Array.isArray(parsed.headCounts)) setHeadCounts(parsed.headCounts);
      if (Array.isArray(parsed.notices)) setNotices(parsed.notices);
      if (parsed.roadmap) setRoadmap(parsed.roadmap);
      if (parsed.settings) setSettings((prev) => ({ ...prev, ...parsed.settings }));
      notify(hi ? 'बैकअप सफलतापूर्वक वापस आ गया।' : 'Backup restored successfully.');
    } catch {
      notify(hi ? 'अमान्य बैकअप फ़ाइल।' : 'Invalid backup file.');
    }
  };

  const handleClearAllData = () => {
    setGroups([]);
    setAshas([]);
    setMeetings([]);
    setLeaves([]);
    setClaims([]);
    setHeadCounts([]);
    setNotices([]);
    updateSettings({ activeGroupId: 'all' });
    notify(hi ? 'सारा स्थानीय डेटा साफ़ किया गया।' : 'All local data cleared.');
  };

  const scopedAshas = useMemo(() => {
    const list =
      settings.activeGroupId === 'all'
        ? ashas
        : ashas.filter((a) => a.groupId === settings.activeGroupId);
    return list;
  }, [ashas, settings.activeGroupId]);

  const filteredAshas = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return scopedAshas.filter((a) => {
      if (subCenterFilter !== 'all' && a.subCenter !== subCenterFilter) return false;
      if (awcFilter !== 'all' && a.awcName !== awcFilter) return false;
      if (!q) return true;
      const hName = a.hospitalName || groups.find((g) => g.id === a.groupId)?.name || '';
      return (
        a.name.toLowerCase().includes(q) ||
        hName.toLowerCase().includes(q) ||
        (a.husbandName || '').toLowerCase().includes(q) ||
        (a.husbandPhone || '').includes(q) ||
        a.subCenter.toLowerCase().includes(q) ||
        (a.subCenterAddress || '').toLowerCase().includes(q) ||
        (a.awcName || '').toLowerCase().includes(q) ||
        (a.awcWorkerName || '').toLowerCase().includes(q) ||
        (a.awcWorkerPhone || '').includes(q) ||
        (a.sathinName || '').toLowerCase().includes(q) ||
        (a.sathinPhone || '').includes(q) ||
        (a.swachhKarmiName || '').toLowerCase().includes(q) ||
        (a.swachhKarmiPhone || '').includes(q) ||
        (a.anmName || '').toLowerCase().includes(q) ||
        (a.choName || '').toLowerCase().includes(q) ||
        a.village.toLowerCase().includes(q) ||
        a.phone.includes(q) ||
        a.janAadhaar.toLowerCase().includes(q) ||
        (a.bankName || '').toLowerCase().includes(q)
      );
    });
  }, [scopedAshas, subCenterFilter, awcFilter, searchQuery, groups]);

  const subCentersList = useMemo(() => {
    const set = new Set<string>();
    scopedAshas.forEach((a) => {
      if (a.subCenter) set.add(a.subCenter);
    });
    return Array.from(set);
  }, [scopedAshas]);

  const awcList = useMemo(() => {
    const set = new Set<string>();
    scopedAshas
      .filter((a) => subCenterFilter === 'all' || a.subCenter === subCenterFilter)
      .forEach((a) => {
        if (a.awcName) set.add(a.awcName);
      });
    return Array.from(set);
  }, [scopedAshas, subCenterFilter]);

  const metrics = useMemo(() => {
    const scopedClaims =
      settings.activeGroupId === 'all'
        ? claims
        : claims.filter((c) => c.groupId === settings.activeGroupId);
    const scopedMeetingsCount =
      settings.activeGroupId === 'all'
        ? meetings.length
        : meetings.filter((m) => m.groupId === settings.activeGroupId).length;
    const scopedNoticesCount =
      settings.activeGroupId === 'all'
        ? notices.length
        : notices.filter((n) => n.groupId === settings.activeGroupId).length;
    const totalPopulation = scopedAshas.reduce((sum, a) => sum + (a.population || 0), 0);
    const totalFamilies = scopedAshas.reduce((sum, a) => sum + (a.families || 0), 0);
    const delayedClaims = scopedClaims.filter((c) => c.isDelayed).length;
    const totalVouchers = scopedClaims.length;
    const submittedVouchers = scopedClaims.filter((c) => c.status !== 'pending').length;

    return {
      ashaCount: scopedAshas.length,
      totalPopulation,
      totalFamilies,
      delayedClaims,
      totalVouchers,
      submittedVouchers,
      scopedMeetingsCount,
      scopedNoticesCount,
    };
  }, [scopedAshas, claims, meetings, notices, settings.activeGroupId]);

  const attentionAlerts = useMemo(() => {
    const alerts: {
      asha: AshaWorker;
      hospitalName: string;
      absentCount: number;
      delayedCount: number;
    }[] = [];

    scopedAshas.forEach((a) => {
      const absentCount = meetings.filter((m) =>
        m.attendance.some((e) => e.ashaId === a.id && !e.present)
      ).length;
      const delayedCount = claims.filter((c) => c.ashaId === a.id && c.isDelayed).length;
      if (absentCount > 0 || delayedCount > 0) {
        const hospitalName = a.hospitalName || groups.find((g) => g.id === a.groupId)?.name || 'PHC';
        alerts.push({ asha: a, hospitalName, absentCount, delayedCount });
      }
    });
    return alerts.slice(0, 6);
  }, [scopedAshas, meetings, claims, groups]);

  const backupDue =
    ashas.length > 0 &&
    (!settings.lastBackupAt ||
      Date.now() - new Date(settings.lastBackupAt).getTime() > 7 * 24 * 60 * 60 * 1000);

  if (!unlocked && settings.pinEnabled) {
    return (
      <PinLockScreen
        lang={lang}
        expectedPin={settings.pinCode || '1234'}
        onUnlock={() => setUnlocked(true)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 lg:pb-10">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="no-print sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6">
          {/* Zone 1: Brand Title */}
          <a
            href="#dashboard"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('dashboard');
            }}
            className="text-lg font-bold tracking-tight text-teal-800 whitespace-nowrap shrink-0"
          >
            {hi ? 'हॉस्पिटल मैनेजमेंट ऐप' : 'Hospital Management App'}
          </a>

          {/* Zone 2: 5 Concise Single-Line Nav Links */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-600">
            {(
              [
                { id: 'dashboard', label: hi ? 'डैशबोर्ड' : 'Dashboard' },
                { id: 'ashas', label: hi ? 'आशा प्रोफ़ाइल' : 'ASHAs' },
                { id: 'operations', label: hi ? 'संचालन' : 'Operations' },
                { id: 'reports', label: hi ? 'रिपोर्ट व नोटिस' : 'Reports' },
                { id: 'roadmap', label: hi ? 'सेटिंग्स व APK' : 'Settings & APK' },
              ] as const
            ).map((nav) => (
              <button
                key={nav.id}
                type="button"
                onClick={() => setActiveTab(nav.id)}
                className={`py-1 transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === nav.id
                    ? 'font-semibold text-teal-800 underline decoration-teal-700 decoration-2 underline-offset-8'
                    : 'hover:text-slate-900'
                }`}
              >
                {nav.label}
              </button>
            ))}
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => {
                setEditingAsha(null);
                setAshaTargetGroupId(null);
                setSheetOpen(true);
              }}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-teal-700 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-teal-800 whitespace-nowrap shrink-0"
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span>{hi ? 'आशा जोड़ें' : 'Add ASHA'}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* Workspace Utility Toolbar */}
        <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 text-balance">
              {activeTab === 'dashboard' && (hi ? 'PHC व समूह डैशबोर्ड' : 'PHC & Consolidated Dashboard')}
              {activeTab === 'ashas' && (hi ? 'आशा कार्यकर्ता प्रोफ़ाइल' : 'ASHA Worker Profiles')}
              {activeTab === 'operations' && (hi ? 'बैठक, छुट्टी, क्लेम व सर्वे' : 'Meetings, Leaves, Claims & Survey')}
              {activeTab === 'reports' && (hi ? 'तारीख-वार रिपोर्ट व QR नोटिस' : 'Reports & Official QR Notices')}
              {activeTab === 'roadmap' && (hi ? 'सेटिंग्स, बैकअप, सुरक्षा व APK बिल्ड' : 'Settings, Security, Backup & APK')}
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              {hi
                ? 'ऑफ़लाइन-फ़र्स्ट हॉस्पिटल व आशा प्रबंधन · PDF, Excel, Word, WhatsApp, SMS व APK रेडी'
                : 'Offline-first Hospital & ASHA management · PDF, Excel, Word, WhatsApp, SMS & APK ready'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {groups.length > 0 && (
              <select
                value={settings.activeGroupId}
                onChange={(e) => {
                  updateSettings({ activeGroupId: e.target.value });
                  setSubCenterFilter('all');
                  setAwcFilter('all');
                }}
                aria-label="Select PHC Group"
                className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800"
              >
                <option value="all">{hi ? 'सभी समूह (समेकित डैशबोर्ड)' : 'All Groups (Combined)'}</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            )}

            <PWAInstallButton lang={lang} variant="compact" />
            <button
              type="button"
              onClick={() => updateSettings({ language: lang === 'hi' ? 'en' : 'hi' })}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              <Languages className="h-4 w-4 shrink-0" />
              <span>{hi ? 'English' : 'हिन्दी'}</span>
            </button>
          </div>
        </div>

        {statusMessage && (
          <div className="no-print mb-5 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-medium text-teal-900">
            {statusMessage}
          </div>
        )}

        {backupDue && (
          <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-900">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700" />
              {hi
                ? 'डेटा सुरक्षा अनुस्मारक: 7 दिनों से स्थानीय JSON बैकअप डाउनलोड नहीं हुआ है।'
                : 'Backup Reminder: No local JSON backup exported in the last 7 days.'}
            </span>
            <button
              type="button"
              onClick={handleExportBackup}
              className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg bg-amber-700 px-3 text-xs font-semibold text-white hover:bg-amber-800 whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{hi ? 'अभी बैकअप लें' : 'Export Backup'}</span>
            </button>
          </div>
        )}

        {/* VIEW 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                <p className="text-xs font-medium text-slate-500">
                  {hi ? 'पंजीकृत आशा कार्यकर्ता' : 'Registered ASHAs'}
                </p>
                <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums sm:text-3xl">
                  {metrics.ashaCount}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                <p className="text-xs font-medium text-slate-500">
                  {hi ? 'कुल जनसंख्या / परिवार' : 'Population / Families'}
                </p>
                <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums sm:text-3xl">
                  {metrics.totalPopulation.toLocaleString('en-IN')}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                <p className="text-xs font-medium text-slate-500">
                  {hi ? 'क्लेम वाउचर जमा / देरी' : 'Claim Vouchers / Delayed'}
                </p>
                <p className="mt-2 text-2xl font-bold text-amber-700 tabular-nums sm:text-3xl">
                  {metrics.submittedVouchers}{' '}
                  <span className="text-xs font-semibold text-slate-500">
                    ({metrics.delayedClaims} {hi ? 'देरी' : 'late'})
                  </span>
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                <p className="text-xs font-medium text-slate-500">
                  {hi ? 'सेक्टर बैठकें / A4 नोटिस' : 'Meetings / A4 Notices'}
                </p>
                <p className="mt-2 text-2xl font-bold text-teal-700 tabular-nums sm:text-3xl">
                  {metrics.scopedMeetingsCount}{' '}
                  <span className="text-xs font-semibold text-slate-500">
                    / {metrics.scopedNoticesCount} {hi ? 'नोटिस' : 'notices'}
                  </span>
                </p>
              </div>
            </div>

            {groups.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
                <div className="max-w-2xl space-y-3">
                  <h2 className="text-lg font-bold text-slate-900">
                    {hi ? 'PHC सोम पायलट से शुरुआत करें या बैकअप वापस लाएं' : 'Start with PHC Som Pilot or Restore Backup'}
                  </h2>
                  <p className="text-sm leading-relaxed text-slate-600">
                    {hi
                      ? 'रोडमैप के चरण 1 के अनुसार PHC सोम समूह (8 उप-केंद्र, 23 आशा, सेक्टर बैठक, छुट्टी, क्लेम और हेड काउंट) एक क्लिक में लोड करें, या अपनी asha_backup.json फ़ाइल वापस लाएं।'
                      : 'Load the Phase 1 PHC Som pilot dataset (8 sub-centers, 23 ASHAs, sector meetings, leaves, claims & head count) in one click, or restore your existing asha_backup.json.'}
                  </p>
                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingGroup(null);
                        setGroupSheetOpen(true);
                      }}
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 whitespace-nowrap"
                    >
                      <Plus className="h-4 w-4" />
                      <span>{hi ? 'नया अस्पताल समूह बनाएं' : 'Create Hospital Group'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleLoadPilotStarter}
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-teal-700/30 bg-teal-50 px-4 py-2.5 text-sm font-semibold text-teal-900 hover:bg-teal-100 whitespace-nowrap"
                    >
                      <Building2 className="h-4 w-4" />
                      <span>{hi ? 'PHC सोम (23 आशा) लोड करें' : 'Load PHC Som (23 ASHAs)'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => quickRestoreRef.current?.click()}
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                    >
                      <Upload className="h-4 w-4" />
                      <span>{hi ? 'बैकअप वापस लाएं (.json)' : 'Restore Backup (.json)'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('roadmap')}
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-100 whitespace-nowrap"
                    >
                      <FileArchive className="h-4 w-4" />
                      <span>{hi ? 'रोडमैप व APK बिल्ड देखें' : 'View Roadmap & APK Build'}</span>
                    </button>
                    <input
                      ref={quickRestoreRef}
                      type="file"
                      accept=".json,application/json"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImportBackup(file);
                        e.target.value = '';
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                {/* Multi-Group Consolidated Summary & Hospital-Wise Management */}
                <section className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-8">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                    <div>
                      <h2 className="text-base font-bold text-slate-900">
                        {hi ? 'अस्पताल-वार आशा समूह प्रबंधन' : 'Hospital-Wise ASHA Group Management'}
                      </h2>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {hi
                          ? 'नए अस्पताल समूह जोड़ें, MOIC/SHS नियम बदलें, या सीधे किसी अस्पताल की आशा सूची खोलें।'
                          : 'Create hospital groups, configure MOIC/SHS rules, or open any hospital roster.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingGroup(null);
                        setGroupSheetOpen(true);
                      }}
                      className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-teal-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-teal-800 whitespace-nowrap"
                    >
                      <Plus className="h-4 w-4" />
                      <span>{hi ? 'नया अस्पताल समूह' : 'Add Hospital Group'}</span>
                    </button>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {groups.map((grp) => {
                      const grpAshas = ashas.filter((a) => a.groupId === grp.id);
                      const grpDelayed = claims.filter((c) => c.groupId === grp.id && c.isDelayed).length;
                      return (
                        <div key={grp.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-bold text-slate-900">{grp.name}</p>
                              <span className="text-xs font-semibold text-teal-700 tabular-nums">
                                · {grpAshas.length} {hi ? 'आशा' : 'ASHAs'} · {grp.subCenters.length}{' '}
                                {hi ? 'उप-केंद्र' : 'SC'}
                              </span>
                            </div>
                            <p className="mt-0.5 text-xs text-slate-600 tabular-nums">
                              {grp.moicName} · {grp.shsName}
                            </p>
                            <p className="mt-0.5 text-[11px] text-slate-500 tabular-nums">
                              {hi ? 'छुट्टी सीमा:' : 'Leave Limit:'} {grp.annualLeaveLimit} ·{' '}
                              {hi ? 'क्लेम तिथि:' : 'Claim Day:'} {grp.claimDueDay} · {grp.sectorMeetingDay} ·{' '}
                              {grpDelayed > 0
                                ? `${grpDelayed} ${hi ? 'देरी वाले क्लेम' : 'delayed claims'}`
                                : hi
                                  ? 'समय पर क्लेम'
                                  : 'On-time claims'}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                updateSettings({ activeGroupId: grp.id });
                                setSubCenterFilter('all');
                                setActiveTab('ashas');
                              }}
                              className="inline-flex min-h-[38px] items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                            >
                              <Users className="h-3.5 w-3.5 text-teal-700" />
                              <span>{hi ? 'आशा देखें' : 'View ASHAs'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingAsha(null);
                                setAshaTargetGroupId(grp.id);
                                setSheetOpen(true);
                              }}
                              className="inline-flex min-h-[38px] items-center gap-1 rounded-lg border border-teal-700/25 bg-teal-50 px-2.5 text-xs font-semibold text-teal-900 hover:bg-teal-100 whitespace-nowrap"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              <span>{hi ? 'आशा जोड़ें' : 'Add ASHA'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingGroup(grp);
                                setGroupSheetOpen(true);
                              }}
                              aria-label="Edit Hospital Group"
                              className="flex min-h-[38px] min-w-[38px] items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            {confirmDeleteGroupId === grp.id ? (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteGroup(grp.id)}
                                  className="min-h-[38px] rounded-lg bg-rose-600 px-2.5 text-xs font-semibold text-white hover:bg-rose-700"
                                >
                                  {hi ? `हाँ हटाएँ (${grpAshas.length})` : `Confirm (${grpAshas.length})`}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteGroupId(null)}
                                  className="min-h-[38px] rounded-lg border border-slate-200 px-2 text-xs font-semibold text-slate-600"
                                >
                                  {hi ? 'रद्द' : 'No'}
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteGroupId(grp.id)}
                                aria-label="Delete Hospital Group"
                                className="flex min-h-[38px] min-w-[38px] items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-rose-50 hover:text-rose-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* Quick Operations & Roadmap Links */}
                <aside className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-4 space-y-3">
                  <h2 className="text-base font-bold text-slate-900">
                    {hi ? 'पायलट व दैनिक कार्य' : 'Pilot & Daily Shortcuts'}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab('operations')}
                    className="flex min-h-[46px] w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-2.5 text-left text-xs font-semibold text-slate-800 hover:bg-slate-50"
                  >
                    <span>{hi ? 'सेक्टर बैठक बल्क उपस्थिति' : 'Sector Meeting Bulk Attendance'}</span>
                    <CalendarCheck className="h-4 w-4 text-teal-700" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReportPreferredSubTab('asha_report');
                      setActiveTab('reports');
                    }}
                    className="flex min-h-[46px] w-full items-center justify-between rounded-xl border border-teal-700/30 bg-teal-50 px-4 py-2.5 text-left text-xs font-semibold text-teal-900 hover:bg-teal-100"
                  >
                    <span>{hi ? 'आशा-वार पूर्ण रिपोर्ट (बैठक, नोटिस, हेडकाउंट)' : 'ASHA-Wise Complete Report'}</span>
                    <Users className="h-4 w-4 text-teal-700" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('reports')}
                    className="flex min-h-[46px] w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-2.5 text-left text-xs font-semibold text-slate-800 hover:bg-slate-50"
                  >
                    <span>{hi ? 'आधिकारिक A4 हिंदी PDF नोटिस व Excel' : 'Official A4 Hindi PDF Notice & Excel'}</span>
                    <ClipboardList className="h-4 w-4 text-teal-700" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('roadmap')}
                    className="flex min-h-[46px] w-full items-center justify-between rounded-xl border border-teal-700/20 bg-teal-50 px-4 py-2.5 text-left text-xs font-semibold text-teal-900 hover:bg-teal-100"
                  >
                    <span>{hi ? '12-सप्ताह रोडमैप व APK (.zip)' : '12-Week Roadmap & APK (.zip)'}</span>
                    <FileArchive className="h-4 w-4 text-teal-700" />
                  </button>

                  {attentionAlerts.length > 0 && (
                    <div className="border-t border-slate-200 pt-3 space-y-2">
                      <p className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        <span>{hi ? '1-क्लिक नोटिस अलर्ट (अनुपस्थिति / देरी)' : '1-Click Notice Alerts'}</span>
                      </p>
                      <div className="space-y-1.5">
                        {attentionAlerts.map((item) => {
                          const reasonText =
                            item.absentCount > 0
                              ? 'बैठक / ट्रेनिंग में अनुपस्थिति का स्पष्टीकरण'
                              : 'मासिक क्लेम फ़ॉर्म देरी से जमा करने हेतु';
                          return (
                            <div
                              key={item.asha.id}
                              className="flex items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2"
                            >
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-900 truncate">{item.asha.name}</p>
                                <p className="text-[10px] text-amber-800 tabular-nums">
                                  {item.absentCount > 0 ? `${item.absentCount} अनुपस्थिति` : ''}
                                  {item.absentCount > 0 && item.delayedCount > 0 ? ' · ' : ''}
                                  {item.delayedCount > 0 ? `${item.delayedCount} देरी वाउचर` : ''}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setPreselectedNoticeDraft({
                                    groupId: item.asha.groupId,
                                    ashaId: item.asha.id,
                                    reason: reasonText,
                                    title:
                                      item.absentCount > 0
                                        ? `बैठक अनुपस्थिति स्पष्टीकरण सूचना — ${item.asha.name}`
                                        : `मासिक क्लेम वाउचर देरी स्पष्टीकरण — ${item.asha.name}`,
                                    body:
                                      item.absentCount > 0
                                        ? `${item.asha.name} (${item.asha.subCenter}) को सूचित किया जाता है कि आप ${item.absentCount} सेक्टर/ट्रेनिंग बैठक में अनुपस्थित रहीं। कृपया 3 दिवस में लिखित स्पष्टीकरण प्रस्तुत करें।`
                                        : `${item.asha.name} (${item.asha.subCenter}) द्वारा मासिक क्लेम वाउचर नियत तिथि के बाद देरी से जमा करवाया गया है। भविष्य में माह की नियत तिथि तक वाउचर जमा करना सुनिश्चित करें।`,
                                  });
                                  setActiveTab('reports');
                                }}
                                className="shrink-0 rounded-lg bg-amber-700 px-2.5 py-1.5 text-[10px] font-semibold text-white hover:bg-amber-800 whitespace-nowrap"
                              >
                                {hi ? 'A4 नोटिस' : 'Notice'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </aside>
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: ASHA WORKER PROFILES & FILTER-WISE EXPORT */}
        {activeTab === 'ashas' && (
          <div className="space-y-4">
            <div className="no-print rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      hi
                        ? 'आशा, अस्पताल, AWC कार्यकर्ता, साथिन, स्वच्छकर्मी या मोबाइल खोजें...'
                        : 'Search ASHA, hospital, AWW, Sathin, SwachhKarmi...'
                    }
                    className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-white pl-10 pr-3 py-2 text-sm"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {subCentersList.length > 0 && (
                    <select
                      value={subCenterFilter}
                      onChange={(e) => {
                        setSubCenterFilter(e.target.value);
                        setAwcFilter('all');
                      }}
                      className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800"
                    >
                      <option value="all">
                        {hi ? `सभी उप-केंद्र (${scopedAshas.length})` : `All Sub-Centers (${scopedAshas.length})`}
                      </option>
                      {subCentersList.map((sc) => (
                        <option key={sc} value={sc}>
                          {sc}
                        </option>
                      ))}
                    </select>
                  )}
                  {awcList.length > 0 && (
                    <select
                      value={awcFilter}
                      onChange={(e) => setAwcFilter(e.target.value)}
                      className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800"
                    >
                      <option value="all">{hi ? 'सभी AWC केंद्र' : 'All AWC Centers'}</option>
                      {awcList.map((awc) => (
                        <option key={awc} value={awc}>
                          {awc}
                        </option>
                      ))}
                    </select>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setEditingGroup(null);
                      setGroupSheetOpen(true);
                    }}
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 whitespace-nowrap"
                  >
                    <Building2 className="h-4 w-4 text-teal-700" />
                    <span>{hi ? '+ नया अस्पताल समूह' : '+ New Hospital Group'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadSampleCsv}
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                  >
                    <Download className="h-3.5 w-3.5 text-teal-700" />
                    <span>{hi ? 'नमूना CSV' : 'Sample CSV'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => csvImportRef.current?.click()}
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-teal-700/30 bg-teal-50 px-3 text-xs font-semibold text-teal-900 hover:bg-teal-100 whitespace-nowrap"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>{hi ? 'Excel/CSV बल्क अपलोड' : 'Bulk CSV Import'}</span>
                  </button>
                  <input
                    ref={csvImportRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImportAshasCsv(file);
                      e.target.value = '';
                    }}
                  />
                </div>
              </div>

              {filteredAshas.length > 0 && (
                <div className="border-t border-slate-100 pt-3">
                  <p className="mb-2 text-[11px] font-semibold text-slate-500">
                    {hi
                      ? `फ़िल्टर की गई सूची (${filteredAshas.length} आशा) — PDF, Excel, Word, WhatsApp, SMS शेयर:`
                      : `Filtered List (${filteredAshas.length} ASHAs) — Export & Share:`}
                  </p>
                  <ReportShareBar
                    lang={lang}
                    compact
                    title="Hospital Management App — ASHA & Field Team Directory"
                    shareText={filteredAshas
                      .slice(0, 10)
                      .map((a, idx) => {
                        const hName = a.hospitalName || groups.find((g) => g.id === a.groupId)?.name || '-';
                        return `${idx + 1}. *${a.name}* (${a.phone || '-'})\nअस्पताल: ${hName} | SC: ${a.subCenter} | AWC: ${a.awcName || '-'}\nAWC कार्यकर्ता: ${a.awcWorkerName || '-'} (${a.awcWorkerPhone || '-'})\nसाथिन: ${a.sathinName || '-'} (${a.sathinPhone || '-'})\nस्वच्छकर्मी: ${a.swachhKarmiName || '-'} (${a.swachhKarmiPhone || '-'})`;
                      })
                      .join('\n\n')}
                    smsText={`Hospital Management App: ${filteredAshas.length} Filtered ASHAs. ${filteredAshas
                      .slice(0, 5)
                      .map((a) => `${a.name} (${a.phone || '-'})`)
                      .join(', ')}`}
                    onDownloadPdf={() =>
                      downloadTablePdf({
                        filename: `Filtered_ASHAs_${new Date().toISOString().slice(0, 10)}.pdf`,
                        title: hi ? 'फ़िल्टर की गई आशा व टीम सूची' : 'Filtered ASHA & Field Team Directory',
                        subtitle: `${filteredAshas.length} ASHAs`,
                        headers: ['अस्पताल / आशा', 'SC / AWC', 'टीम (AWW/साथिन/स्वच्छ)', 'ANM / CHO', 'बैंक व ID'],
                        rows: filteredAshas.map((a) => [
                          `${a.hospitalName || groups.find((g) => g.id === a.groupId)?.name || '-'}\n${a.name} (${a.phone || '-'})`,
                          `${a.subCenter}\n${a.awcName || '-'}`,
                          `AWW: ${a.awcWorkerName || '-'}\nसाथिन: ${a.sathinName || '-'}\nस्वच्छ: ${a.swachhKarmiName || '-'}`,
                          `ANM: ${a.anmName || '-'}\nCHO: ${a.choName || '-'}`,
                          `${a.bankName || '-'} (${a.bankAccountMasked || '-'})\n${a.aadhaarMasked || '-'}`,
                        ]),
                      })
                    }
                    onPrintPdf={() => window.print()}
                    onExportExcel={() => {
                      const headers = [
                        'Hospital Name',
                        'ASHA Name',
                        'ASHA Code',
                        'ASHA Phone',
                        'Husband Name',
                        'Husband Phone',
                        'Sub-Center',
                        'Sub-Center Address',
                        'AWC Name',
                        'AWC Worker Name',
                        'AWC Worker Phone',
                        'Sathin Name',
                        'Sathin Phone',
                        'SwachhKarmi / SachKarmi Name',
                        'SwachhKarmi / SachKarmi Phone',
                        'Village',
                        'Joining Date',
                        'ANM Name',
                        'ANM Phone',
                        'CHO Name',
                        'CHO Phone',
                        'Aadhaar (Masked)',
                        'Jan Aadhaar',
                        'Bank Name',
                        'Account (Masked)',
                        'IFSC',
                        'Population',
                        'Families',
                      ];
                      const rows = filteredAshas.map((a) => [
                        a.hospitalName || groups.find((g) => g.id === a.groupId)?.name || '',
                        a.name,
                        a.ashaCode || '',
                        a.phone,
                        a.husbandName || '',
                        a.husbandPhone || '',
                        a.subCenter,
                        a.subCenterAddress || '',
                        a.awcName || '',
                        a.awcWorkerName || '',
                        a.awcWorkerPhone || '',
                        a.sathinName || '',
                        a.sathinPhone || '',
                        a.swachhKarmiName || '',
                        a.swachhKarmiPhone || '',
                        a.village,
                        a.joiningDate,
                        a.anmName,
                        a.anmPhone || '',
                        a.choName,
                        a.choPhone || '',
                        a.aadhaarMasked,
                        a.janAadhaar,
                        a.bankName || '',
                        a.bankAccountMasked,
                        a.ifsc,
                        a.population,
                        a.families,
                      ]);
                      downloadExcelCsv(
                        `Filtered_ASHAs_${new Date().toISOString().slice(0, 10)}.csv`,
                        headers,
                        rows
                      );
                    }}
                    onExportWord={() => {
                      const rowsHtml = filteredAshas
                        .map((a) => {
                          const hName = a.hospitalName || groups.find((g) => g.id === a.groupId)?.name || '-';
                          return `<tr><td>${escapeHtml(hName)}</td><td>${escapeHtml(a.name)} (${escapeHtml(a.phone || '-')})<br/>पति: ${escapeHtml(a.husbandName || '-')} (${escapeHtml(a.husbandPhone || '-')})</td><td>${escapeHtml(a.subCenter)}<br/>${escapeHtml(a.subCenterAddress || '')}</td><td>${escapeHtml(a.awcName || '-')}<br/>AWC कार्यकर्ता: ${escapeHtml(a.awcWorkerName || '-')} (${escapeHtml(a.awcWorkerPhone || '-')})</td><td>साथिन: ${escapeHtml(a.sathinName || '-')} (${escapeHtml(a.sathinPhone || '-')})<br/>स्वच्छकर्मी: ${escapeHtml(a.swachhKarmiName || '-')} (${escapeHtml(a.swachhKarmiPhone || '-')})</td><td>ANM: ${escapeHtml(a.anmName || '-')} (${escapeHtml(a.anmPhone || '-')})<br/>CHO: ${escapeHtml(a.choName || '-')} (${escapeHtml(a.choPhone || '-')})</td><td>${escapeHtml(a.bankName || '-')} / ${escapeHtml(a.bankAccountMasked)} / ${escapeHtml(a.ifsc)}<br/>${escapeHtml(a.aadhaarMasked)} / ${escapeHtml(a.janAadhaar)}</td></tr>`;
                        })
                        .join('');
                      downloadWordDoc(
                        `Filtered_ASHAs_${new Date().toISOString().slice(0, 10)}.doc`,
                        'Hospital Management App - Filtered ASHA Directory',
                        `<h2>Hospital Management App — फ़िल्टर की गई आशा व टीम सूची (${filteredAshas.length})</h2><table><thead><tr><th>Hospital</th><th>ASHA & Husband</th><th>Sub-Center</th><th>AWC & AWC Worker</th><th>Sathin & SwachhKarmi</th><th>ANM & CHO</th><th>Bank & IDs</th></tr></thead><tbody>${rowsHtml}</tbody></table>`
                      );
                    }}
                  />
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100">
              {filteredAshas.length === 0 ? (
                <div className="p-10 text-center text-sm text-slate-500">
                  {hi ? 'कोई आशा प्रोफ़ाइल नहीं मिली।' : 'No ASHA profiles found.'}
                </div>
              ) : (
                filteredAshas.map((a) => {
                  const groupName = a.hospitalName || groups.find((g) => g.id === a.groupId)?.name;
                  return (
                  <div key={a.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100 text-sm font-bold text-teal-800">
                        {a.photoDataUrl ? (
                          <img src={a.photoDataUrl} alt={a.name} className="h-full w-full object-cover" />
                        ) : (
                          a.name.slice(0, 1)
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900 truncate">{a.name}</h3>
                          {groupName && (
                            <span className="text-xs font-semibold text-teal-700">· {groupName}</span>
                          )}
                          {a.ashaCode && (
                            <span className="font-mono text-[11px] text-slate-500">{a.ashaCode}</span>
                          )}
                          {(a.aadhaarEncrypted || a.bankAccountEncrypted) && (
                            <span title="AES-GCM Encrypted" className="text-teal-700 shrink-0">
                              <ShieldCheck className="h-4 w-4" />
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-slate-600 tabular-nums">
                          <span>{a.subCenter}</span>
                          {a.awcName && (
                            <>
                              <span className="mx-1.5" aria-hidden="true">·</span>
                              <span>AWC: {a.awcName}</span>
                            </>
                          )}
                          {a.subCenterAddress && (
                            <>
                              <span className="mx-1.5" aria-hidden="true">·</span>
                              <span>{a.subCenterAddress}</span>
                            </>
                          )}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500 tabular-nums">
                          <span>
                            {hi ? 'पति:' : 'Husband:'} {a.husbandName || '-'}
                            {a.husbandPhone ? ` (${a.husbandPhone})` : ''}
                          </span>
                          <span className="mx-1.5" aria-hidden="true">·</span>
                          <span>
                            {hi ? 'ज्वाइनिंग:' : 'Joined:'} {a.joiningDate || '-'}
                          </span>
                          <span className="mx-1.5" aria-hidden="true">·</span>
                          <span>
                            {hi ? 'जनसंख्या:' : 'Pop:'} {a.population} ({a.families})
                          </span>
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500 tabular-nums">
                          <span>
                            ANM: {a.anmName || '-'}{a.anmPhone ? ` (${a.anmPhone})` : ''}
                          </span>
                          <span className="mx-1.5" aria-hidden="true">·</span>
                          <span>
                            CHO: {a.choName || '-'}{a.choPhone ? ` (${a.choPhone})` : ''}
                          </span>
                        </p>
                        <p className="mt-0.5 text-xs text-slate-600 tabular-nums">
                          <span>
                            {hi ? 'AWC कार्यकर्ता:' : 'AWW:'} {a.awcWorkerName || '-'}
                            {a.awcWorkerPhone ? ` (${a.awcWorkerPhone})` : ''}
                          </span>
                          <span className="mx-1.5" aria-hidden="true">·</span>
                          <span>
                            {hi ? 'साथिन:' : 'Sathin:'} {a.sathinName || '-'}
                            {a.sathinPhone ? ` (${a.sathinPhone})` : ''}
                          </span>
                          <span className="mx-1.5" aria-hidden="true">·</span>
                          <span>
                            {hi ? 'स्वच्छकर्मी:' : 'SwachhKarmi:'} {a.swachhKarmiName || '-'}
                            {a.swachhKarmiPhone ? ` (${a.swachhKarmiPhone})` : ''}
                          </span>
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500 tabular-nums">
                          <span>{hi ? 'आधार:' : 'Aadhaar:'} {a.aadhaarMasked || '-'}</span>
                          <span className="mx-1.5" aria-hidden="true">·</span>
                          <span>{hi ? 'जन आधार:' : 'Jan Aadhaar:'} {a.janAadhaar || '-'}</span>
                          <span className="mx-1.5" aria-hidden="true">·</span>
                          <span>
                            {a.bankName ? `${a.bankName} ` : ''}{a.bankAccountMasked} ({a.ifsc})
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {a.phone && (
                        <>
                          <a
                            href={`tel:${a.phone}`}
                            className="inline-flex min-h-[40px] items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            <Phone className="h-3.5 w-3.5" />
                            <span>{hi ? 'कॉल' : 'Call'}</span>
                          </a>
                          <a
                            href={`sms:${a.phone}`}
                            className="inline-flex min-h-[40px] items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            <span>SMS</span>
                          </a>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setReportPreselectedAshaId(a.id);
                          setReportPreferredSubTab('asha_report');
                          setActiveTab('reports');
                        }}
                        className="inline-flex min-h-[40px] items-center gap-1 rounded-lg border border-teal-200 bg-teal-50 px-2.5 text-xs font-semibold text-teal-800 hover:bg-teal-100"
                      >
                        <ClipboardList className="h-3.5 w-3.5" />
                        <span>{hi ? 'पूर्ण रिपोर्ट' : 'Full Report'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingAsha(a);
                          setSheetOpen(true);
                        }}
                        aria-label="Edit"
                        className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setAshas((prev) => prev.filter((item) => item.id !== a.id))}
                        aria-label="Delete"
                        className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-rose-50 hover:text-rose-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
                })
              )}
            </div>
          </div>
        )}

        {/* VIEW 3: OPERATIONS (MEETINGS, LEAVES, CLAIMS, HEAD COUNT) */}
        {activeTab === 'operations' && (
          <PhcOperationsView
            lang={lang}
            groups={groups}
            activeGroupId={settings.activeGroupId}
            ashas={ashas}
            meetings={meetings}
            leaves={leaves}
            claims={claims}
            headCounts={headCounts}
            notices={notices}
            onAddMeeting={(m) => setMeetings((prev) => [m, ...prev])}
            onUpdateMeeting={(m) => {
              setMeetings((prev) => prev.map((item) => (item.id === m.id ? m : item)));
              notify(hi ? 'बैठक विवरण अपडेट हो गया।' : 'Meeting updated.');
            }}
            onDeleteMeeting={(id) => setMeetings((prev) => prev.filter((m) => m.id !== id))}
            onToggleAttendance={(meetingId, ashaId) =>
              setMeetings((prev) =>
                prev.map((m) =>
                  m.id !== meetingId
                    ? m
                    : {
                        ...m,
                        attendance: m.attendance.map((a) =>
                          a.ashaId === ashaId ? { ...a, present: !a.present } : a
                        ),
                      }
                )
              )
            }
            onBulkMarkPresent={(meetingId) =>
              setMeetings((prev) =>
                prev.map((m) =>
                  m.id !== meetingId
                    ? m
                    : { ...m, attendance: m.attendance.map((a) => ({ ...a, present: true })) }
                )
              )
            }
            onUpdateAttendanceTime={(meetingId, ashaId, field, val) =>
              setMeetings((prev) =>
                prev.map((m) =>
                  m.id !== meetingId
                    ? m
                    : {
                        ...m,
                        attendance: m.attendance.map((a) =>
                          a.ashaId === ashaId ? { ...a, [field]: val } : a
                        ),
                      }
                )
              )
            }
            onAddLeave={(l) => setLeaves((prev) => [l, ...prev])}
            onUpdateLeave={(l) => {
              setLeaves((prev) => prev.map((item) => (item.id === l.id ? l : item)));
              notify(hi ? 'छुट्टी रिकॉर्ड अपडेट हो गया।' : 'Leave record updated.');
            }}
            onDeleteLeave={(id) => setLeaves((prev) => prev.filter((l) => l.id !== id))}
            onAddBulkClaims={(batch) => {
              setClaims((prev) => [...batch, ...prev]);
              notify(
                hi
                  ? `${batch.length} आशा का क्लेम वाउचर जमा दर्ज किया गया।`
                  : `Recorded claim voucher submission for ${batch.length} ASHA(s).`
              );
            }}
            onUpdateClaim={(c) => {
              setClaims((prev) => prev.map((item) => (item.id === c.id ? c : item)));
              notify(hi ? 'क्लेम वाउचर तिथि अपडेट हो गई।' : 'Claim voucher updated.');
            }}
            onCycleClaimStatus={(id) =>
              setClaims((prev) =>
                prev.map((c) => {
                  if (c.id !== id) return c;
                  const nextStatus =
                    c.status === 'pending' ? 'submitted' : c.status === 'submitted' ? 'paid' : 'pending';
                  return { ...c, status: nextStatus };
                })
              )
            }
            onDeleteClaim={(id) => setClaims((prev) => prev.filter((c) => c.id !== id))}
            onAddHeadCount={(hc) => setHeadCounts((prev) => [hc, ...prev])}
            onUpdateHeadCount={(hc) => {
              setHeadCounts((prev) => prev.map((item) => (item.id === hc.id ? hc : item)));
              notify(hi ? 'हेडकाउंट प्रविष्टि अपडेट हो गई।' : 'Head count entry updated.');
            }}
            onDeleteHeadCount={(id) => setHeadCounts((prev) => prev.filter((hc) => hc.id !== id))}
            onOpenAshaReport={(ashaId) => {
              setReportPreselectedAshaId(ashaId);
              setReportPreferredSubTab('asha_report');
              setActiveTab('reports');
            }}
          />
        )}

        {/* VIEW 4: REPORTS & QR NOTICES */}
        {activeTab === 'reports' && (
          <ReportsView
            lang={lang}
            groups={groups}
            activeGroupId={settings.activeGroupId}
            ashas={ashas}
            meetings={meetings}
            leaves={leaves}
            claims={claims}
            headCounts={headCounts}
            notices={notices}
            preselectedAshaId={reportPreselectedAshaId}
            preferredSubTab={reportPreferredSubTab}
            preselectedNoticeDraft={preselectedNoticeDraft}
            onClearPreselection={() => {
              setReportPreselectedAshaId(null);
              setReportPreferredSubTab(null);
              setPreselectedNoticeDraft(null);
            }}
            onAddNotice={(n) => setNotices((prev) => [n, ...prev])}
            onUpdateNotice={(n) => {
              setNotices((prev) => prev.map((item) => (item.id === n.id ? n : item)));
              notify(hi ? 'नोटिस अपडेट हो गया।' : 'Notice updated.');
            }}
            onDeleteNotice={(id) => setNotices((prev) => prev.filter((n) => n.id !== id))}
          />
        )}

        {/* VIEW 5: SETTINGS, SECURITY, BACKUP & APK BUILDER */}
        {activeTab === 'roadmap' && (
          <RoadmapView
            lang={lang}
            settings={settings}
            groups={groups}
            roadmap={roadmap}
            onToggleRoadmapStep={(stepId) =>
              setRoadmap((prev) => ({
                completedIds: prev.completedIds.includes(stepId)
                  ? prev.completedIds.filter((id) => id !== stepId)
                  : [...prev.completedIds, stepId],
              }))
            }
            onUpdateSettings={updateSettings}
            onOpenHospitalManager={() => {
              setEditingGroup(null);
              setGroupSheetOpen(true);
            }}
            onExportBackup={handleExportBackup}
            onShareBackup={handleShareBackup}
            onImportBackup={handleImportBackup}
            onClearAllData={handleClearAllData}
            onLockNow={() => setUnlocked(false)}
          />
        )}
      </main>

      {/* Mobile Fixed Bottom Thumb Navigation Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="no-print fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur-md lg:hidden"
      >
        <div className="grid h-16 grid-cols-5 items-center pb-safe">
          {(
            [
              { id: 'dashboard', label: hi ? 'डैशबोर्ड' : 'Home', icon: Home },
              { id: 'ashas', label: hi ? 'आशा' : 'ASHAs', icon: Users },
              { id: 'operations', label: hi ? 'संचालन' : 'Ops', icon: CalendarCheck },
              { id: 'reports', label: hi ? 'रिपोर्ट' : 'Reports', icon: ClipboardList },
              { id: 'roadmap', label: hi ? 'सेटिंग्स' : 'Settings', icon: Settings },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex min-h-[44px] flex-col items-center justify-center gap-1 text-[10px] font-semibold tracking-tight ${
                  active ? 'text-teal-700' : 'text-slate-500'
                }`}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.8} />
                <span className="truncate max-w-[66px]">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ASHA Worker Profile Sheet */}
      <AshaWorkerSheet
        lang={lang}
        isOpen={sheetOpen}
        groups={groups}
        activeGroupId={ashaTargetGroupId || settings.activeGroupId}
        initialData={editingAsha}
        existingAshas={ashas}
        onClose={() => {
          setSheetOpen(false);
          setEditingAsha(null);
          setAshaTargetGroupId(null);
        }}
        onSave={handleSaveAsha}
        onEnsureHospitalGroup={handleEnsureHospitalGroup}
        onViewReport={(ashaId) => {
          setSheetOpen(false);
          setEditingAsha(null);
          setAshaTargetGroupId(null);
          setReportPreselectedAshaId(ashaId);
          setActiveTab('reports');
        }}
      />

      {/* Hospital-Wise ASHA Group Sheet */}
      <HospitalGroupSheet
        lang={lang}
        isOpen={groupSheetOpen}
        initialData={editingGroup}
        onClose={() => {
          setGroupSheetOpen(false);
          setEditingGroup(null);
        }}
        onSave={handleSaveGroup}
      />

      <OfflineIndicator lang={lang} />
    </div>
  );
}
