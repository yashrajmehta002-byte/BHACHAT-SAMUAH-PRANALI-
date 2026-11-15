import type {
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
} from '../types/asha';

const KEYS = {
  settings: 'asha_phc_settings_v2',
  groups: 'asha_phc_groups_v2',
  ashas: 'asha_phc_workers_v2',
  meetings: 'asha_phc_meetings_v2',
  leaves: 'asha_phc_leaves_v2',
  claims: 'asha_phc_claims_v2',
  headCounts: 'asha_phc_headcounts_v2',
  notices: 'asha_phc_notices_v2',
  roadmap: 'asha_phc_roadmap_v2',
};

export const DEFAULT_SETTINGS: AppSettings = {
  language: 'hi',
  activeGroupId: 'all',
  pinEnabled: false,
  pinCode: '1234',
  encryptionPassphraseSet: false,
  driveBackupEmail: '',
  driveAutoBackup: false,
  updateJsonUrl: '',
  lastBackupAt: null,
  applicationId: 'com.ashamanagement.app',
  versionName: '1.0.0',
  versionCode: 1,
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('phc-storage-error', {
          detail: err instanceof Error ? err.message : 'Storage quota exceeded',
        })
      );
    }
  }
}

export const phcStore = {
  loadSettings: (): AppSettings => ({
    ...DEFAULT_SETTINGS,
    ...readJson<Partial<AppSettings>>(KEYS.settings, {}),
  }),
  saveSettings: (s: AppSettings) => writeJson(KEYS.settings, s),

  loadGroups: (): PhcGroup[] => readJson<PhcGroup[]>(KEYS.groups, []),
  saveGroups: (g: PhcGroup[]) => writeJson(KEYS.groups, g),

  loadAshas: (): AshaWorker[] => readJson<AshaWorker[]>(KEYS.ashas, []),
  saveAshas: (a: AshaWorker[]) => writeJson(KEYS.ashas, a),

  loadMeetings: (): MeetingSession[] => readJson<MeetingSession[]>(KEYS.meetings, []),
  saveMeetings: (m: MeetingSession[]) => writeJson(KEYS.meetings, m),

  loadLeaves: (): LeaveRecord[] => readJson<LeaveRecord[]>(KEYS.leaves, []),
  saveLeaves: (l: LeaveRecord[]) => writeJson(KEYS.leaves, l),

  loadClaims: (): ClaimRecord[] => readJson<ClaimRecord[]>(KEYS.claims, []),
  saveClaims: (c: ClaimRecord[]) => writeJson(KEYS.claims, c),

  loadHeadCounts: (): HeadCountEntry[] => readJson<HeadCountEntry[]>(KEYS.headCounts, []),
  saveHeadCounts: (h: HeadCountEntry[]) => writeJson(KEYS.headCounts, h),

  loadNotices: (): NoticeItem[] => readJson<NoticeItem[]>(KEYS.notices, []),
  saveNotices: (n: NoticeItem[]) => writeJson(KEYS.notices, n),

  loadRoadmap: (): RoadmapStepState =>
    readJson<RoadmapStepState>(KEYS.roadmap, { completedIds: [] }),
  saveRoadmap: (r: RoadmapStepState) => writeJson(KEYS.roadmap, r),
};

export function buildPhcBackupPayload(params: {
  settings: AppSettings;
  groups: PhcGroup[];
  ashas: AshaWorker[];
  meetings: MeetingSession[];
  leaves: LeaveRecord[];
  claims: ClaimRecord[];
  headCounts: HeadCountEntry[];
  notices: NoticeItem[];
  roadmap: RoadmapStepState;
}): PhcBackupPayload {
  return {
    schemaVersion: 2,
    appName: 'HospitalManagementApp',
    exportedAt: new Date().toISOString(),
    ...params,
  };
}

export function getPhcSomPilotStarter(): {
  groups: PhcGroup[];
  ashas: AshaWorker[];
  meetings: MeetingSession[];
  leaves: LeaveRecord[];
  claims: ClaimRecord[];
  headCounts: HeadCountEntry[];
  notices: NoticeItem[];
} {
  const today = new Date();
  const isoToday = today.toISOString().slice(0, 10);
  const currentMonth = isoToday.slice(0, 7);

  const subCenters = [
    'SC सोम (Som)',
    'SC कोल्यारी (Kolyari)',
    'SC ओगणा (Ogna)',
    'SC झाड़ोल (Jhadol)',
    'SC वास (Vas)',
    'SC मादड़ी (Madri)',
    'SC बिरोठी (Birothi)',
    'SC ढिमड़ी (Dhimdi)',
  ];

  const groups: PhcGroup[] = [
    {
      id: 'phc-som',
      name: 'PHC सोम (PHC Som)',
      moicName: 'डॉ. राजेश मीणा (MOIC)',
      shsName: 'अशोक कुमार (SHS / ASHA Supervisor)',
      annualLeaveLimit: 12,
      claimDueDay: 5,
      sectorMeetingDay: 'गुरुवार (Thursday)',
      subCenters,
    },
  ];

  const sampleNames = [
    ['कमला देवी', 'लक्ष्मी बाई', 'अनीता शर्मा'],
    ['गीता मीणा', 'सीता कुमारी', 'सुमन यादव'],
    ['रेखा रावत', 'ममता चौहान', 'पूजा पटेल'],
    ['कविता वर्मा', 'संगीता लोहार', 'बबिता नायक'],
    ['निर्मला जोशी', 'आशा मेघवाल', 'रचना डांगी'],
    ['पिंकी गायरी', 'मीरा भील', 'सपना सुथार'],
    ['तारा कुंवर', 'रेणुका जैन', 'भावना सालवी'],
    ['उर्मिला खराड़ी', 'दीपा वडेरा'],
  ];

  const ashas: AshaWorker[] = [];
  let idx = 1;
  subCenters.forEach((sc, scIdx) => {
    const names = sampleNames[scIdx] || [];
    names.forEach((name, nIdx) => {
      const id = `asha-som-${idx}`;
      const areaName = sc.split(' ')[1] || 'सोम';
      ashas.push({
        id,
        groupId: 'phc-som',
        hospitalName: 'PHC सोम (PHC Som)',
        name,
        ashaCode: `ASHA-SOM-${String(idx).padStart(2, '0')}`,
        husbandName: `रमेश ${name.split(' ')[1] || 'मीणा'}`,
        husbandPhone: `94140${String(20000 + idx * 149).slice(-5)}`,
        subCenter: sc,
        subCenterAddress: `ग्राम पंचायत भवन के पास, ${areaName}, ब्लॉक झाड़ोल`,
        awcName: `आंगनवाड़ी केंद्र ${areaName} - ${nIdx + 1}`,
        awcWorkerName: `संतोष ${areaName} (AWW)`,
        awcWorkerPhone: `94142${String(15000 + idx * 113).slice(-5)}`,
        sathinName: `सुनीता साथिन ${areaName}`,
        sathinPhone: `94612${String(22000 + idx * 127).slice(-5)}`,
        swachhKarmiName: `मुकेश कुमार (स्वच्छकर्मी)`,
        swachhKarmiPhone: `94608${String(31000 + idx * 131).slice(-5)}`,
        village: `${areaName} वार्ड ${nIdx + 1}`,
        phone: `98290${String(10000 + idx * 137).slice(-5)}`,
        aadhaarMasked: `XXXX-XXXX-${String(4100 + idx * 73).slice(-4)}`,
        janAadhaar: `JA${String(108940 + idx * 19)}`,
        bankName: idx % 2 === 0 ? 'State Bank of India (SBI)' : 'Bank of Baroda (BOB)',
        bankAccountMasked: `XXXXXXX${String(5200 + idx * 41).slice(-4)}`,
        ifsc: idx % 2 === 0 ? 'SBIN0031402' : 'BARB0JHADOL',
        population: 950 + (idx % 4) * 140,
        families: 195 + (idx % 4) * 28,
        anmName: `ANM ${areaName}`,
        anmPhone: `94131${String(30000 + scIdx * 211).slice(-5)}`,
        choName: `CHO ${areaName}`,
        choPhone: `94601${String(40000 + scIdx * 317).slice(-5)}`,
        joiningDate: `202${idx % 4}-0${(idx % 8) + 1}-15`,
        education: '10th / 12th Pass',
        notes: '',
        status: 'active',
        updatedAt: today.toISOString(),
      });
      idx++;
    });
  });

  const meetings: MeetingSession[] = [
    {
      id: 'mtg-som-1',
      groupId: 'phc-som',
      title: 'मासिक सेक्टर बैठक व HBNC समीक्षा',
      type: 'sector_meeting',
      date: isoToday,
      venue: 'PHC सोम सभागार',
      attendance: ashas.map((a, i) => ({
        ashaId: a.id,
        present: i !== 5,
        inTime: '10:00',
        outTime: '14:30',
      })),
    },
  ];

  const leaves: LeaveRecord[] = [
    {
      id: 'lv-som-1',
      groupId: 'phc-som',
      ashaId: ashas[5]?.id || 'asha-som-6',
      ashaName: ashas[5]?.name || 'सुमन यादव',
      fromDate: isoToday,
      toDate: isoToday,
      days: 2,
      reason: 'पारिवारिक कार्य (आवेदन संलग्न)',
      year: today.getFullYear(),
      createdAt: today.toISOString(),
    },
  ];

  const claims: ClaimRecord[] = ashas.slice(0, 6).map((a, i) => ({
    id: `clm-som-${i + 1}`,
    groupId: 'phc-som',
    ashaId: a.id,
    ashaName: a.name,
    month: currentMonth,
    submittedDate: `${currentMonth}-${i < 4 ? '04' : '08'}`,
    voucherNo: `VCH-${currentMonth.replace('-', '')}-0${i + 1}`,
    isDelayed: i >= 4,
    status: i < 2 ? 'paid' : 'submitted',
  }));

  const headCounts: HeadCountEntry[] = ashas.slice(0, 6).map((a, i) => ({
    id: `hc-som-${i + 1}`,
    groupId: 'phc-som',
    ashaId: a.id,
    ashaName: a.name,
    subCenter: a.subCenter,
    targetPopulation: a.population,
    surveyedPopulation: Math.max(0, a.population - (45 + i * 12)),
    eligibleCouples: 165 + i * 14,
    pregnantWomen: 18 + (i % 4) * 3,
    lactatingMothers: 16 + (i % 4) * 2,
    children0To1: 24 + (i % 5) * 3,
    children1To2: 22 + (i % 4) * 3,
    children2To3: 20 + (i % 4) * 2,
    children5Yr: 19 + (i % 3) * 3,
    children10Yr: 21 + (i % 4) * 2,
    children16Yr: 18 + (i % 3) * 2,
    children10And16Yr: 39 + (i % 4) * 2 + (i % 3) * 2,
    childrenUnder5: 85 + (i % 5) * 3 + (i % 4) * 5,
    surveyDate: isoToday,
  }));

  const notices: NoticeItem[] = [
    {
      id: 'not-som-1',
      groupId: 'phc-som',
      dispatchNumber: `DISP/PHC-SOM/${today.getFullYear()}/01`,
      reason: 'मासिक सेक्टर बैठक व क्लेम समय पर जमा करने हेतु',
      targetAshaId: 'all',
      targetAshaName: 'सभी आशा कार्यकर्ता (PHC सोम)',
      titleHi: 'मासिक सेक्टर बैठक एवं क्लेम फ़ॉर्म जमा सूचना',
      titleEn: 'Monthly Sector Meeting & Claim Submission Notice',
      bodyHi: 'PHC सोम के सभी 8 उप-केंद्रों की 23 आशा बहनों को सूचित किया जाता है कि माह की 5 तारीख तक क्लेम फ़ॉर्म व हाजिरी प्रमाण पत्र अनिवार्य रूप से जमा करें। आगामी गुरुवार को सुबह 10:00 बजे सेक्टर बैठक आयोजित होगी।',
      bodyEn: 'All 23 ASHAs across 8 sub-centers under PHC Som are requested to submit monthly claim forms by the 5th and attend the Sector Meeting on Thursday at 10:00 AM.',
      date: isoToday,
      refNumber: `DISP/PHC-SOM/${today.getFullYear()}/01`,
      category: 'sector',
    },
  ];

  return { groups, ashas, meetings, leaves, claims, headCounts, notices };
}
