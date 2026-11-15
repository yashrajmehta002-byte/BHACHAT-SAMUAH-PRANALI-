export type Language = 'hi' | 'en';

export type ActiveTab = 'dashboard' | 'ashas' | 'operations' | 'reports' | 'roadmap';

export interface PhcGroup {
  id: string;
  name: string;
  moicName: string;
  shsName: string;
  annualLeaveLimit: number;
  claimDueDay: number; // e.g., 5th of every month
  sectorMeetingDay: string; // e.g., 'Thursday' / 'गुरुवार'
  subCenters: string[];
}

export interface AshaWorker {
  id: string;
  groupId: string;
  hospitalName?: string;
  name: string;
  ashaCode?: string;
  husbandName: string;
  husbandPhone: string;
  subCenter: string;
  subCenterAddress: string;
  awcName: string;
  awcWorkerName: string;
  awcWorkerPhone: string;
  sathinName: string;
  sathinPhone: string;
  swachhKarmiName: string;
  swachhKarmiPhone: string;
  village: string;
  phone: string;
  photoDataUrl?: string;
  aadhaarMasked: string; // XXXX-XXXX-1234
  aadhaarEncrypted?: string;
  janAadhaar: string;
  bankName: string;
  bankAccountMasked: string;
  bankAccountEncrypted?: string;
  ifsc: string;
  population: number;
  families: number;
  anmName: string;
  anmPhone: string;
  choName: string;
  choPhone: string;
  joiningDate: string;
  dateOfBirth?: string;
  education?: string;
  notes?: string;
  status: 'active' | 'inactive';
  updatedAt: string;
}

export interface MeetingAttendanceEntry {
  ashaId: string;
  present: boolean;
  inTime: string;
  outTime: string;
}

export interface MeetingSession {
  id: string;
  groupId: string;
  title: string;
  type: 'sector_meeting' | 'training';
  date: string;
  venue: string;
  attendance: MeetingAttendanceEntry[];
}

export interface LeaveRecord {
  id: string;
  groupId: string;
  ashaId: string;
  ashaName: string;
  fromDate: string;
  toDate: string;
  days: number;
  reason: string;
  photoDataUrl?: string;
  year: number;
  createdAt: string;
}

export interface ClaimRecord {
  id: string;
  groupId: string;
  ashaId: string;
  ashaName: string;
  month: string; // YYYY-MM
  submittedDate: string;
  voucherNo?: string;
  amount?: number; // legacy optional field
  isDelayed: boolean;
  status: 'pending' | 'submitted' | 'paid';
}

export interface HeadCountEntry {
  id: string;
  groupId: string;
  ashaId?: string;
  ashaName?: string;
  subCenter: string;
  targetPopulation: number;
  surveyedPopulation: number;
  eligibleCouples: number;
  pregnantWomen: number;
  lactatingMothers?: number; // धात्री माताएँ
  children0To1: number;
  children1To2: number;
  children2To3: number;
  children5Yr: number;
  children10Yr: number;
  children16Yr: number;
  children10And16Yr?: number;
  childrenUnder5?: number;
  surveyDate: string;
}

export type NoticeCategory = 'vhsnd' | 'sector' | 'immunization' | 'general';

export interface NoticeItem {
  id: string;
  groupId: string;
  dispatchNumber?: string;
  reason?: string;
  targetAshaId?: string; // 'all' or specific AshaWorker.id
  targetAshaName?: string;
  titleHi: string;
  titleEn: string;
  bodyHi: string;
  bodyEn: string;
  date: string;
  deliveredDate?: string;
  refNumber: string;
  category: NoticeCategory;
}

export interface AppSettings {
  language: Language;
  activeGroupId: string; // 'all' or specific PhcGroup.id
  pinEnabled: boolean;
  pinCode: string;
  encryptionPassphraseSet: boolean;
  driveBackupEmail: string;
  driveAutoBackup: boolean;
  updateJsonUrl: string;
  lastBackupAt: string | null;
  applicationId: string;
  versionName: string;
  versionCode: number;
}

export interface RoadmapStepState {
  completedIds: string[];
}

export interface PhcBackupPayload {
  schemaVersion: number;
  appName: string;
  exportedAt: string;
  settings: AppSettings;
  groups: PhcGroup[];
  ashas: AshaWorker[];
  meetings: MeetingSession[];
  leaves: LeaveRecord[];
  claims: ClaimRecord[];
  headCounts: HeadCountEntry[];
  notices: NoticeItem[];
  roadmap: RoadmapStepState;
}
