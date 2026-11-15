import React, { useEffect, useMemo, useState } from 'react';
import { Bell, CalendarCheck, Check, Edit3, FileText, Plus, QrCode, Search, Share2, Trash2, UserCheck } from 'lucide-react';
import type {
  AshaWorker,
  ClaimRecord,
  HeadCountEntry,
  Language,
  LeaveRecord,
  MeetingSession,
  NoticeCategory,
  NoticeItem,
  PhcGroup,
} from '../types/asha';
import {
  buildVerificationMatrix,
  downloadExcelCsv,
  downloadWordDoc,
  escapeHtml,
} from '../utils/cryptoAndExport';
import {
  downloadIndividualAshaPdf,
  downloadNoticeA4Pdf,
  downloadTablePdf,
} from '../utils/pdfGenerator';
import { ReportShareBar } from './ReportShareBar';

type ReportFormatTab = 'ashas' | 'meetings' | 'leaves' | 'claims' | 'headcount';
type ReportsSubTab = 'date_report' | 'asha_report' | 'notices';

const NOTICE_REASONS = [
  'मासिक सेक्टर बैठक व क्लेम समय पर जमा करने हेतु',
  'बैठक / ट्रेनिंग में अनुपस्थिति का स्पष्टीकरण',
  'मासिक क्लेम फ़ॉर्म देरी से जमा करने हेतु',
  'टीकाकरण / VHSND सत्र संचालन निर्देश',
  'हेड काउंट सर्वे एवं लक्ष्य पूर्ण करने हेतु',
  'अन्य प्रशासनिक कारण',
];

export interface NoticeDraftPrefill {
  groupId: string;
  ashaId: string;
  reason: string;
  title: string;
  body: string;
}

interface ReportsViewProps {
  lang: Language;
  groups: PhcGroup[];
  activeGroupId: string;
  ashas: AshaWorker[];
  meetings: MeetingSession[];
  leaves: LeaveRecord[];
  claims: ClaimRecord[];
  headCounts: HeadCountEntry[];
  notices: NoticeItem[];
  preselectedAshaId?: string | null;
  preferredSubTab?: ReportsSubTab | null;
  preselectedNoticeDraft?: NoticeDraftPrefill | null;
  onClearPreselection?: () => void;
  onAddNotice: (notice: NoticeItem) => void;
  onUpdateNotice?: (notice: NoticeItem) => void;
  onDeleteNotice: (id: string) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  lang,
  groups,
  activeGroupId,
  ashas,
  meetings,
  leaves,
  claims,
  headCounts,
  notices,
  preselectedAshaId,
  preferredSubTab,
  preselectedNoticeDraft,
  onClearPreselection,
  onAddNotice,
  onUpdateNotice,
  onDeleteNotice,
}) => {
  const hi = lang === 'hi';
  const [subTab, setSubTab] = useState<ReportsSubTab>(preferredSubTab || 'date_report');
  const [reportKind, setReportKind] = useState<ReportFormatTab>('ashas');

  const today = new Date().toISOString().slice(0, 10);
  const firstOfMonth = `${today.slice(0, 7)}-01`;
  const [fromDate, setFromDate] = useState(firstOfMonth);
  const [toDate, setToDate] = useState(today);

  // Filter-wise Date Report filters
  const [reportGroupFilter, setReportGroupFilter] = useState<string>(activeGroupId || 'all');
  const [subCenterFilter, setSubCenterFilter] = useState<string>('all');
  const [awcFilter, setAwcFilter] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Individual ASHA Report state
  const [selectedAshaId, setSelectedAshaId] = useState<string>(
    preselectedAshaId || ashas[0]?.id || ''
  );

  // Notice creator & filter state
  const [showNoticeForm, setShowNoticeForm] = useState(false);
  const [editingNoticeId, setEditingNoticeId] = useState<string | null>(null);
  const [noticeGroupId, setNoticeGroupId] = useState<string>(
    activeGroupId !== 'all' ? activeGroupId : groups[0]?.id || 'phc-som'
  );
  const [noticeTargetAshaId, setNoticeTargetAshaId] = useState<string>('all');
  const [noticeDispatchNo, setNoticeDispatchNo] = useState<string>(
    `DISP/${today.slice(0, 4)}/${String(notices.length + 1).padStart(2, '0')}`
  );
  const [noticeReason, setNoticeReason] = useState<string>(NOTICE_REASONS[0]);
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeBody, setNoticeBody] = useState('');
  const [noticeDate, setNoticeDate] = useState(today);
  const [noticeCategory, setNoticeCategory] = useState<NoticeCategory>('sector');
  const [previewNoticeId, setPreviewNoticeId] = useState<string>(notices[0]?.id || '');
  const [noticeReasonFilter, setNoticeReasonFilter] = useState<string>('all');

  useEffect(() => {
    if (preselectedNoticeDraft) {
      setEditingNoticeId(null);
      setNoticeGroupId(preselectedNoticeDraft.groupId || groups[0]?.id || 'phc-som');
      setNoticeTargetAshaId(preselectedNoticeDraft.ashaId || 'all');
      setNoticeReason(preselectedNoticeDraft.reason);
      setNoticeTitle(preselectedNoticeDraft.title);
      setNoticeBody(preselectedNoticeDraft.body);
      setShowNoticeForm(true);
      setSubTab('notices');
      onClearPreselection?.();
    } else if (preselectedAshaId) {
      setSelectedAshaId(preselectedAshaId);
      setSubTab('asha_report');
      onClearPreselection?.();
    } else if (preferredSubTab) {
      setSubTab(preferredSubTab);
      onClearPreselection?.();
    }
  }, [preselectedAshaId, preferredSubTab, preselectedNoticeDraft, groups, onClearPreselection]);

  const effectiveGroupId = reportGroupFilter || activeGroupId || 'all';
  const activeGroup = groups.find((g) => g.id === effectiveGroupId) || groups[0];
  const groupLabel =
    effectiveGroupId === 'all'
      ? hi
        ? 'सभी अस्पताल समूह (समेकित)'
        : 'All Hospital Groups (Combined)'
      : activeGroup?.name || (hi ? 'अस्पताल / PHC' : 'Hospital / PHC');

  const groupScopedAshas = useMemo(
    () => (effectiveGroupId === 'all' ? ashas : ashas.filter((a) => a.groupId === effectiveGroupId)),
    [ashas, effectiveGroupId]
  );

  const subCentersList = useMemo(() => {
    const s = new Set<string>();
    groupScopedAshas.forEach((a) => a.subCenter && s.add(a.subCenter));
    return Array.from(s);
  }, [groupScopedAshas]);

  const awcList = useMemo(() => {
    const s = new Set<string>();
    groupScopedAshas
      .filter((a) => subCenterFilter === 'all' || a.subCenter === subCenterFilter)
      .forEach((a) => a.awcName && s.add(a.awcName));
    return Array.from(s);
  }, [groupScopedAshas, subCenterFilter]);

  const scopedAshas = useMemo(() => {
    const q = searchFilter.trim().toLowerCase();
    return groupScopedAshas.filter((a) => {
      if (subCenterFilter !== 'all' && a.subCenter !== subCenterFilter) return false;
      if (awcFilter !== 'all' && a.awcName !== awcFilter) return false;
      if (!q) return true;
      const hName = a.hospitalName || groups.find((g) => g.id === a.groupId)?.name || '';
      return (
        a.name.toLowerCase().includes(q) ||
        hName.toLowerCase().includes(q) ||
        a.subCenter.toLowerCase().includes(q) ||
        (a.awcName || '').toLowerCase().includes(q) ||
        (a.awcWorkerName || '').toLowerCase().includes(q) ||
        (a.awcWorkerPhone || '').includes(q) ||
        (a.sathinName || '').toLowerCase().includes(q) ||
        (a.sathinPhone || '').includes(q) ||
        (a.swachhKarmiName || '').toLowerCase().includes(q) ||
        (a.swachhKarmiPhone || '').includes(q) ||
        (a.husbandName || '').toLowerCase().includes(q) ||
        a.phone.includes(q) ||
        (a.anmName || '').toLowerCase().includes(q) ||
        (a.choName || '').toLowerCase().includes(q)
      );
    });
  }, [groupScopedAshas, subCenterFilter, awcFilter, searchFilter, groups]);

  const allowedAshaIds = useMemo(() => new Set(scopedAshas.map((a) => a.id)), [scopedAshas]);
  const hasDetailFilter = subCenterFilter !== 'all' || awcFilter !== 'all' || searchFilter.trim() !== '';

  const filteredClaims = useMemo(
    () =>
      claims.filter(
        (c) =>
          (effectiveGroupId === 'all' || c.groupId === effectiveGroupId) &&
          (!hasDetailFilter || allowedAshaIds.has(c.ashaId)) &&
          c.submittedDate >= fromDate &&
          c.submittedDate <= toDate
      ),
    [claims, effectiveGroupId, hasDetailFilter, allowedAshaIds, fromDate, toDate]
  );

  const filteredLeaves = useMemo(
    () =>
      leaves.filter(
        (l) =>
          (effectiveGroupId === 'all' || l.groupId === effectiveGroupId) &&
          (!hasDetailFilter || allowedAshaIds.has(l.ashaId)) &&
          l.fromDate >= fromDate &&
          l.fromDate <= toDate
      ),
    [leaves, effectiveGroupId, hasDetailFilter, allowedAshaIds, fromDate, toDate]
  );

  const filteredMeetings = useMemo(
    () =>
      meetings.filter(
        (m) =>
          (effectiveGroupId === 'all' || m.groupId === effectiveGroupId) &&
          m.date >= fromDate &&
          m.date <= toDate
      ),
    [meetings, effectiveGroupId, fromDate, toDate]
  );

  const filteredHeadCounts = useMemo(
    () =>
      headCounts.filter(
        (hc) =>
          (effectiveGroupId === 'all' || hc.groupId === effectiveGroupId) &&
          (subCenterFilter === 'all' || hc.subCenter === subCenterFilter) &&
          (!hasDetailFilter || !hc.ashaId || allowedAshaIds.has(hc.ashaId)) &&
          (!hc.surveyDate || (hc.surveyDate >= fromDate && hc.surveyDate <= toDate))
      ),
    [headCounts, effectiveGroupId, subCenterFilter, hasDetailFilter, allowedAshaIds, fromDate, toDate]
  );

  const getAge10 = (hc: HeadCountEntry) =>
    hc.children10Yr ?? Math.round((hc.children10And16Yr ?? 0) / 2);
  const getAge16 = (hc: HeadCountEntry) =>
    hc.children16Yr ?? Math.max(0, (hc.children10And16Yr ?? 0) - Math.round((hc.children10And16Yr ?? 0) / 2));

  const filteredHeadCountTotals = useMemo(
    () =>
      filteredHeadCounts.reduce(
        (acc, hc) => ({
          targetPopulation: acc.targetPopulation + (hc.targetPopulation || 0),
          surveyedPopulation: acc.surveyedPopulation + (hc.surveyedPopulation || 0),
          eligibleCouples: acc.eligibleCouples + (hc.eligibleCouples || 0),
          pregnantWomen: acc.pregnantWomen + (hc.pregnantWomen || 0),
          lactatingMothers: acc.lactatingMothers + (hc.lactatingMothers ?? 0),
          children0To1: acc.children0To1 + (hc.children0To1 ?? 0),
          children1To2: acc.children1To2 + (hc.children1To2 ?? 0),
          children2To3: acc.children2To3 + (hc.children2To3 ?? 0),
          children5Yr: acc.children5Yr + (hc.children5Yr ?? 0),
          children10Yr: acc.children10Yr + getAge10(hc),
          children16Yr: acc.children16Yr + getAge16(hc),
        }),
        {
          targetPopulation: 0,
          surveyedPopulation: 0,
          eligibleCouples: 0,
          pregnantWomen: 0,
          lactatingMothers: 0,
          children0To1: 0,
          children1To2: 0,
          children2To3: 0,
          children5Yr: 0,
          children10Yr: 0,
          children16Yr: 0,
        }
      ),
    [filteredHeadCounts]
  );

  // INDIVIDUAL ASHA REPORT COMPUTATIONS
  const individualAsha = useMemo(
    () => ashas.find((a) => a.id === selectedAshaId) || ashas[0] || null,
    [ashas, selectedAshaId]
  );

  const individualSummary = useMemo(() => {
    if (!individualAsha) {
      return {
        hospitalName: '-',
        meetingRows: [] as {
          id: string;
          date: string;
          title: string;
          venue: string;
          present: boolean;
          inTime: string;
          outTime: string;
        }[],
        presentCount: 0,
        absentCount: 0,
        attendancePct: 0,
        receivedNotices: [] as NoticeItem[],
        personalNoticesCount: 0,
        generalNoticesCount: 0,
        ashaLeaves: [] as LeaveRecord[],
        totalLeaveDays: 0,
        ashaClaims: [] as ClaimRecord[],
        latestClaimDate: '-',
        delayedClaimsCount: 0,
        ashaHeadCounts: [] as HeadCountEntry[],
      };
    }

    const hospitalName =
      individualAsha.hospitalName ||
      groups.find((g) => g.id === individualAsha.groupId)?.name ||
      '-';

    const relevantMeetings = meetings.filter(
      (m) =>
        m.groupId === individualAsha.groupId ||
        m.attendance.some((entry) => entry.ashaId === individualAsha.id)
    );

    const meetingRows = relevantMeetings.map((m) => {
      const entry = m.attendance.find((e) => e.ashaId === individualAsha.id);
      return {
        id: m.id,
        date: m.date,
        title: m.title,
        venue: m.venue,
        present: Boolean(entry?.present),
        inTime: entry?.inTime || '-',
        outTime: entry?.outTime || '-',
      };
    });

    const presentCount = meetingRows.filter((r) => r.present).length;
    const absentCount = meetingRows.length - presentCount;
    const attendancePct =
      meetingRows.length > 0 ? Math.round((presentCount / meetingRows.length) * 100) : 0;

    const receivedNotices = notices.filter(
      (n) =>
        n.targetAshaId === individualAsha.id ||
        ((!n.targetAshaId || n.targetAshaId === 'all') && n.groupId === individualAsha.groupId)
    );
    const personalNoticesCount = receivedNotices.filter(
      (n) => n.targetAshaId === individualAsha.id
    ).length;
    const generalNoticesCount = receivedNotices.length - personalNoticesCount;

    const ashaLeaves = leaves.filter((l) => l.ashaId === individualAsha.id);
    const totalLeaveDays = ashaLeaves.reduce((sum, l) => sum + l.days, 0);

    const ashaClaims = claims.filter((c) => c.ashaId === individualAsha.id);
    const latestClaimDate = ashaClaims[0]?.submittedDate || '-';
    const delayedClaimsCount = ashaClaims.filter((c) => c.isDelayed).length;

    const ashaHeadCounts = headCounts.filter((hc) => hc.ashaId === individualAsha.id);

    return {
      hospitalName,
      meetingRows,
      presentCount,
      absentCount,
      attendancePct,
      receivedNotices,
      personalNoticesCount,
      generalNoticesCount,
      ashaLeaves,
      totalLeaveDays,
      ashaClaims,
      latestClaimDate,
      delayedClaimsCount,
      ashaHeadCounts,
    };
  }, [individualAsha, groups, meetings, notices, leaves, claims, headCounts]);

  // OFFICIAL A4 NOTICES COMPUTATIONS
  const noticeReasonOptions = useMemo(() => {
    const set = new Set<string>();
    notices.forEach((n) => {
      if (n.reason) set.add(n.reason);
    });
    return Array.from(set);
  }, [notices]);

  const filteredNotices = useMemo(
    () =>
      notices.filter((n) => {
        if (noticeReasonFilter !== 'all' && (n.reason || '') !== noticeReasonFilter) return false;
        return true;
      }),
    [notices, noticeReasonFilter]
  );

  const selectedNotice =
    filteredNotices.find((n) => n.id === previewNoticeId) || filteredNotices[0] || null;
  const selectedNoticeGroup = useMemo(() => {
    if (!selectedNotice) return activeGroup;
    return groups.find((g) => g.id === selectedNotice.groupId) || activeGroup;
  }, [selectedNotice, groups, activeGroup]);

  const qrMatrix = useMemo(() => {
    if (!selectedNotice) return [];
    const disp = selectedNotice.dispatchNumber || selectedNotice.refNumber;
    const seed = `${disp}|${selectedNotice.date}|${selectedNoticeGroup?.name || 'HospitalManagementApp'}|${selectedNotice.reason || ''}`;
    return buildVerificationMatrix(seed);
  }, [selectedNotice, selectedNoticeGroup]);

  const getHospitalName = (a: AshaWorker) =>
    a.hospitalName || groups.find((g) => g.id === a.groupId)?.name || '-';

  const handleExportExcel = () => {
    if (reportKind === 'ashas') {
      const headers = [
        'Hospital / PHC Name',
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
      const rows = scopedAshas.map((a) => [
        getHospitalName(a),
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
      downloadExcelCsv(`HospitalReport_ASHAs_${fromDate}_to_${toDate}.csv`, headers, rows);
      return;
    }

    if (reportKind === 'meetings') {
      const headers = ['Date', 'Title', 'Type', 'Venue', 'Present', 'Total ASHAs'];
      const rows = filteredMeetings.map((m) => [
        m.date,
        m.title,
        m.type,
        m.venue,
        m.attendance.filter((a) => a.present).length,
        m.attendance.length,
      ]);
      downloadExcelCsv(`HospitalReport_Meetings_${fromDate}_to_${toDate}.csv`, headers, rows);
      return;
    }

    if (reportKind === 'leaves') {
      const headers = ['ASHA Name', 'From Date', 'To Date', 'Days', 'Reason'];
      const rows = filteredLeaves.map((l) => [l.ashaName, l.fromDate, l.toDate, l.days, l.reason]);
      downloadExcelCsv(`HospitalReport_Leaves_${fromDate}_to_${toDate}.csv`, headers, rows);
      return;
    }

    if (reportKind === 'claims') {
      const headers = ['ASHA Name', 'Claim Month', 'Voucher Submitted Date', 'Voucher No.', 'Timeliness', 'Voucher Status'];
      const rows = filteredClaims.map((c) => [
        c.ashaName,
        c.month,
        c.submittedDate,
        c.voucherNo || '-',
        c.isDelayed ? 'Delayed' : 'On Time',
        c.status === 'paid' ? 'Verified' : c.status === 'submitted' ? 'Submitted' : 'Pending',
      ]);
      downloadExcelCsv(`HospitalReport_ClaimVouchers_${fromDate}_to_${toDate}.csv`, headers, rows);
      return;
    }

    const headers = [
      'ASHA Worker',
      'Sub-Center',
      'Survey Date',
      'Target Population',
      'Surveyed Population',
      'Coverage %',
      'Eligible Couples',
      'Pregnant Women',
      'Dhatri (Lactating)',
      '0-1 Yr Children',
      '1-2 Yr Children',
      '2-3 Yr Children',
      '5 Yr Children',
      '10 Yr Children',
      '16 Yr Children',
    ];
    const rows = filteredHeadCounts.map((hc) => {
      const pct = Math.round((hc.surveyedPopulation / Math.max(1, hc.targetPopulation)) * 100);
      return [
        hc.ashaName || '-',
        hc.subCenter,
        hc.surveyDate,
        hc.targetPopulation,
        hc.surveyedPopulation,
        `${pct}%`,
        hc.eligibleCouples,
        hc.pregnantWomen,
        hc.lactatingMothers ?? 0,
        hc.children0To1 ?? 0,
        hc.children1To2 ?? 0,
        hc.children2To3 ?? 0,
        hc.children5Yr ?? 0,
        getAge10(hc),
        getAge16(hc),
      ];
    });
    const totalPct = Math.round(
      (filteredHeadCountTotals.surveyedPopulation / Math.max(1, filteredHeadCountTotals.targetPopulation)) * 100
    );
    rows.push([
      'TOTAL (कुल योग)',
      `${filteredHeadCounts.length} entries`,
      `${fromDate} to ${toDate}`,
      filteredHeadCountTotals.targetPopulation,
      filteredHeadCountTotals.surveyedPopulation,
      `${totalPct}%`,
      filteredHeadCountTotals.eligibleCouples,
      filteredHeadCountTotals.pregnantWomen,
      filteredHeadCountTotals.lactatingMothers,
      filteredHeadCountTotals.children0To1,
      filteredHeadCountTotals.children1To2,
      filteredHeadCountTotals.children2To3,
      filteredHeadCountTotals.children5Yr,
      filteredHeadCountTotals.children10Yr,
      filteredHeadCountTotals.children16Yr,
    ]);
    downloadExcelCsv(`HospitalReport_HeadCount_${fromDate}_to_${toDate}.csv`, headers, rows);
  };

  const handleExportWord = () => {
    let tableHtml = '';

    if (reportKind === 'ashas') {
      const rows = scopedAshas
        .map(
          (a) =>
            `<tr><td>${escapeHtml(getHospitalName(a))}</td><td>${escapeHtml(a.name)} (${escapeHtml(a.phone || '-')})<br/>पति: ${escapeHtml(a.husbandName || '-')} (${escapeHtml(a.husbandPhone || '-')})</td><td>${escapeHtml(a.subCenter)}<br/>${escapeHtml(a.subCenterAddress || '')}</td><td>${escapeHtml(a.awcName || '-')}<br/>AWC कार्यकर्ता: ${escapeHtml(a.awcWorkerName || '-')} (${escapeHtml(a.awcWorkerPhone || '-')})</td><td>साथिन: ${escapeHtml(a.sathinName || '-')} (${escapeHtml(a.sathinPhone || '-')})<br/>स्वच्छकर्मी: ${escapeHtml(a.swachhKarmiName || '-')} (${escapeHtml(a.swachhKarmiPhone || '-')})</td><td>ANM: ${escapeHtml(a.anmName)} (${escapeHtml(a.anmPhone || '-')})<br/>CHO: ${escapeHtml(a.choName)} (${escapeHtml(a.choPhone || '-')})</td><td>${escapeHtml(a.bankName || '-')} / ${escapeHtml(a.bankAccountMasked)} / ${escapeHtml(a.ifsc)}</td><td>${escapeHtml(a.aadhaarMasked)} / ${escapeHtml(a.janAadhaar)}</td><td>${escapeHtml(a.joiningDate)}</td></tr>`
        )
        .join('');
      tableHtml = `<table><thead><tr><th>Hospital</th><th>ASHA & Husband</th><th>Sub-Center</th><th>AWC & AWC Worker</th><th>Sathin & SwachhKarmi</th><th>ANM & CHO</th><th>Bank / IFSC</th><th>Aadhaar / Jan Aadhaar</th><th>Joining</th></tr></thead><tbody>${rows}</tbody></table>`;
    } else if (reportKind === 'meetings') {
      const rows = filteredMeetings
        .map(
          (m) =>
            `<tr><td>${escapeHtml(m.date)}</td><td>${escapeHtml(m.title)}</td><td>${escapeHtml(m.venue)}</td><td>${m.attendance.filter((a) => a.present).length}/${m.attendance.length}</td></tr>`
        )
        .join('');
      tableHtml = `<table><thead><tr><th>Date</th><th>Title</th><th>Venue</th><th>Attendance</th></tr></thead><tbody>${rows}</tbody></table>`;
    } else if (reportKind === 'leaves') {
      const rows = filteredLeaves
        .map(
          (l) =>
            `<tr><td>${escapeHtml(l.ashaName)}</td><td>${escapeHtml(l.fromDate)} → ${escapeHtml(l.toDate)}</td><td>${l.days}</td><td>${escapeHtml(l.reason)}</td></tr>`
        )
        .join('');
      tableHtml = `<table><thead><tr><th>ASHA</th><th>Period</th><th>Days</th><th>Reason</th></tr></thead><tbody>${rows}</tbody></table>`;
    } else if (reportKind === 'claims') {
      const rows = filteredClaims
        .map(
          (c) =>
            `<tr><td>${escapeHtml(c.ashaName)}</td><td>${escapeHtml(c.month)}</td><td>${escapeHtml(c.submittedDate)}</td><td>${escapeHtml(c.voucherNo || '-')}</td><td>${c.isDelayed ? 'Delayed (देरी)' : 'On Time (समय पर)'}</td><td>${c.status === 'paid' ? 'सत्यापित' : c.status === 'submitted' ? 'वाउचर जमा' : 'लंबित'}</td></tr>`
        )
        .join('');
      tableHtml = `<table><thead><tr><th>ASHA</th><th>Month</th><th>Submitted Date</th><th>Voucher No.</th><th>Timeliness</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>`;
    } else {
      const rows = filteredHeadCounts
        .map((hc) => {
          const pct = Math.round((hc.surveyedPopulation / Math.max(1, hc.targetPopulation)) * 100);
          return `<tr><td>${escapeHtml(hc.ashaName || '-')}</td><td>${escapeHtml(hc.subCenter)}</td><td>${hc.targetPopulation}</td><td>${hc.surveyedPopulation} (${pct}%)</td><td>${hc.eligibleCouples}</td><td>${hc.pregnantWomen}</td><td>${hc.lactatingMothers ?? 0}</td><td>${hc.children0To1 ?? 0}</td><td>${hc.children1To2 ?? 0}</td><td>${hc.children2To3 ?? 0}</td><td>${hc.children5Yr ?? 0}</td><td>${getAge10(hc)}</td><td>${getAge16(hc)}</td></tr>`;
        })
        .join('');
      const totalPct = Math.round(
        (filteredHeadCountTotals.surveyedPopulation / Math.max(1, filteredHeadCountTotals.targetPopulation)) * 100
      );
      const totalRow = `<tr style="font-weight:bold;background:#f0fdfa"><td>कुल योग (TOTAL)</td><td>${filteredHeadCounts.length}</td><td>${filteredHeadCountTotals.targetPopulation}</td><td>${filteredHeadCountTotals.surveyedPopulation} (${totalPct}%)</td><td>${filteredHeadCountTotals.eligibleCouples}</td><td>${filteredHeadCountTotals.pregnantWomen}</td><td>${filteredHeadCountTotals.lactatingMothers}</td><td>${filteredHeadCountTotals.children0To1}</td><td>${filteredHeadCountTotals.children1To2}</td><td>${filteredHeadCountTotals.children2To3}</td><td>${filteredHeadCountTotals.children5Yr}</td><td>${filteredHeadCountTotals.children10Yr}</td><td>${filteredHeadCountTotals.children16Yr}</td></tr>`;
      tableHtml = `<table><thead><tr><th>ASHA Worker</th><th>Sub-Center</th><th>Target</th><th>Surveyed</th><th>Couples</th><th>Pregnant</th><th>Dhatri (Lactating)</th><th>0-1 Yr</th><th>1-2 Yr</th><th>2-3 Yr</th><th>5 Yr</th><th>10 Yr</th><th>16 Yr</th></tr></thead><tbody>${rows}${totalRow}</tbody></table>`;
    }

    const htmlBody = `
      <h2>Hospital Management App — ${escapeHtml(groupLabel)}</h2>
      <p>MOIC: ${escapeHtml(activeGroup?.moicName || '-')} | Sub-Center: ${escapeHtml(subCenterFilter)} | AWC: ${escapeHtml(awcFilter)} | ${escapeHtml(fromDate)} → ${escapeHtml(toDate)}</p>
      ${tableHtml}
    `;
    downloadWordDoc(`HospitalReport_${reportKind}_${fromDate}_to_${toDate}.doc`, 'Hospital Management App Report', htmlBody);
  };

  const handleDownloadPdf = () => {
    const subtitle = `${groupLabel} · ${activeGroup?.moicName || '-'} · ${fromDate} → ${toDate}`;
    if (reportKind === 'ashas') {
      downloadTablePdf({
        filename: `HospitalReport_ASHAs_${fromDate}_to_${toDate}.pdf`,
        title: hi ? 'आशा व ग्राम-स्तरीय टीम रिपोर्ट' : 'ASHA & Field Team Report',
        subtitle,
        headers: ['अस्पताल / आशा', 'सब सेंटर / AWC', 'टीम (AWW/साथिन/स्वच्छ)', 'ANM / CHO', 'बैंक व ID'],
        rows: scopedAshas.map((a) => [
          `${getHospitalName(a)}\n${a.name} (${a.phone || '-'})`,
          `${a.subCenter}\n${a.awcName || '-'}`,
          `AWW: ${a.awcWorkerName || '-'}\nसाथिन: ${a.sathinName || '-'}\nस्वच्छ: ${a.swachhKarmiName || '-'}`,
          `ANM: ${a.anmName || '-'}\nCHO: ${a.choName || '-'}`,
          `${a.bankName || '-'} (${a.bankAccountMasked || '-'})\n${a.aadhaarMasked || '-'}`,
        ]),
      });
      return;
    }
    if (reportKind === 'meetings') {
      downloadTablePdf({
        filename: `HospitalReport_Meetings_${fromDate}_to_${toDate}.pdf`,
        title: hi ? 'बैठक व उपस्थिति रिपोर्ट' : 'Meetings & Attendance Report',
        subtitle,
        headers: ['तिथि', 'बैठक / ट्रेनिंग', 'स्थान', 'उपस्थिति'],
        rows: filteredMeetings.map((m) => [
          m.date,
          m.title,
          m.venue,
          `${m.attendance.filter((a) => a.present).length}/${m.attendance.length}`,
        ]),
      });
      return;
    }
    if (reportKind === 'leaves') {
      downloadTablePdf({
        filename: `HospitalReport_Leaves_${fromDate}_to_${toDate}.pdf`,
        title: hi ? 'छुट्टी रिकॉर्ड रिपोर्ट' : 'Leave History Report',
        subtitle,
        headers: ['आशा', 'अवधि', 'दिन', 'कारण'],
        rows: filteredLeaves.map((l) => [
          l.ashaName,
          `${l.fromDate} → ${l.toDate}`,
          l.days,
          l.reason,
        ]),
      });
      return;
    }
    if (reportKind === 'claims') {
      downloadTablePdf({
        filename: `HospitalReport_ClaimVouchers_${fromDate}_to_${toDate}.pdf`,
        title: hi ? 'क्लेम वाउचर व जमा तिथि रिपोर्ट' : 'Claim Voucher & Submission Date Report',
        subtitle,
        headers: ['आशा', 'माह', 'जमा तिथि', 'वाउचर नं.', 'स्थिति'],
        rows: filteredClaims.map((c) => [
          c.ashaName,
          c.month,
          c.submittedDate,
          c.voucherNo || '-',
          `${c.isDelayed ? 'देरी से' : 'समय पर'} (${c.status === 'paid' ? 'सत्यापित' : c.status === 'submitted' ? 'जमा' : 'लंबित'})`,
        ]),
      });
      return;
    }
    const totalPct = Math.round(
      (filteredHeadCountTotals.surveyedPopulation / Math.max(1, filteredHeadCountTotals.targetPopulation)) * 100
    );
    downloadTablePdf({
      filename: `HospitalReport_HeadCount_${fromDate}_to_${toDate}.pdf`,
      title: hi ? 'हेड काउंट सर्वे रिपोर्ट' : 'Head Count Survey Report',
      subtitle,
      headers: ['आशा / SC', 'लक्ष्य/सर्वे', 'गर्भवती', 'धात्री', '0-1', '1-2', '2-3', '5व', '10व', '16व'],
      rows: filteredHeadCounts.map((hc) => {
        const pct = Math.round((hc.surveyedPopulation / Math.max(1, hc.targetPopulation)) * 100);
        return [
          `${hc.ashaName || hc.subCenter}\n(${hc.subCenter})`,
          `${hc.surveyedPopulation}/${hc.targetPopulation} (${pct}%)`,
          hc.pregnantWomen,
          hc.lactatingMothers ?? 0,
          hc.children0To1 ?? 0,
          hc.children1To2 ?? 0,
          hc.children2To3 ?? 0,
          hc.children5Yr ?? 0,
          getAge10(hc),
          getAge16(hc),
        ];
      }),
      totalRow: [
        `कुल योग (${filteredHeadCounts.length})`,
        `${filteredHeadCountTotals.surveyedPopulation}/${filteredHeadCountTotals.targetPopulation} (${totalPct}%)`,
        filteredHeadCountTotals.pregnantWomen,
        filteredHeadCountTotals.lactatingMothers,
        filteredHeadCountTotals.children0To1,
        filteredHeadCountTotals.children1To2,
        filteredHeadCountTotals.children2To3,
        filteredHeadCountTotals.children5Yr,
        filteredHeadCountTotals.children10Yr,
        filteredHeadCountTotals.children16Yr,
      ],
    });
  };

  const reportShareText = useMemo(() => {
    const filterInfo = `${groupLabel}${subCenterFilter !== 'all' ? ` | SC: ${subCenterFilter}` : ''}${awcFilter !== 'all' ? ` | AWC: ${awcFilter}` : ''}`;
    const header = `*Hospital Management App*\n${filterInfo} (${fromDate} → ${toDate})`;
    if (reportKind === 'ashas') {
      const lines = scopedAshas
        .slice(0, 10)
        .map(
          (a, i) =>
            `${i + 1}. *${a.name}* (${a.phone || '-'})\n   अस्पताल: ${getHospitalName(a)} | SC: ${a.subCenter} | AWC: ${a.awcName || '-'}\n   AWC कार्यकर्ता: ${a.awcWorkerName || '-'} (${a.awcWorkerPhone || '-'})\n   साथिन: ${a.sathinName || '-'} (${a.sathinPhone || '-'})\n   स्वच्छकर्मी: ${a.swachhKarmiName || '-'} (${a.swachhKarmiPhone || '-'})`
        );
      const more = scopedAshas.length > 10 ? `\n...+${scopedAshas.length - 10} more` : '';
      return `${header}\n\nकुल फ़िल्टर आशा: ${scopedAshas.length}\n${lines.join('\n')}${more}`;
    }
    if (reportKind === 'meetings') {
      const lines = filteredMeetings.map(
        (m) => `• ${m.date}: ${m.title} (${m.attendance.filter((a) => a.present).length}/${m.attendance.length} उपस्थित)`
      );
      return `${header}\n\nबैठक व उपस्थिति (${filteredMeetings.length}):\n${lines.join('\n') || '-'}`;
    }
    if (reportKind === 'leaves') {
      const lines = filteredLeaves.map(
        (l) => `• ${l.ashaName}: ${l.fromDate} → ${l.toDate} (${l.days} दिन) - ${l.reason}`
      );
      return `${header}\n\nछुट्टी रिपोर्ट (${filteredLeaves.length}):\n${lines.join('\n') || '-'}`;
    }
    if (reportKind === 'claims') {
      const delayed = filteredClaims.filter((c) => c.isDelayed).length;
      const lines = filteredClaims
        .slice(0, 12)
        .map((c) => `• ${c.ashaName}: ${c.month} (वाउचर जमा: ${c.submittedDate}, ${c.isDelayed ? 'देरी से' : 'समय पर'})`);
      return `${header}\n\nक्लेम वाउचर सारांश: ${filteredClaims.length} वाउचर | समय पर: ${filteredClaims.length - delayed} | देरी: ${delayed}\n${lines.join('\n')}`;
    }
    const lines = filteredHeadCounts.map((hc) => {
      const pct = Math.round((hc.surveyedPopulation / Math.max(1, hc.targetPopulation)) * 100);
      return `• ${hc.ashaName || hc.subCenter} (${hc.subCenter}, ${pct}%): गर्भवती:${hc.pregnantWomen}, धात्री:${hc.lactatingMothers ?? 0} | 0-1y:${hc.children0To1 ?? 0}, 1-2y:${hc.children1To2 ?? 0}, 2-3y:${hc.children2To3 ?? 0}, 5y:${hc.children5Yr ?? 0}, 10y:${getAge10(hc)}, 16y:${getAge16(hc)}`;
    });
    return `${header}\n\nहेड काउंट सर्वे:\n${lines.join('\n') || '-'}`;
  }, [
    reportKind,
    groupLabel,
    subCenterFilter,
    awcFilter,
    fromDate,
    toDate,
    scopedAshas,
    filteredMeetings,
    filteredLeaves,
    filteredClaims,
    filteredHeadCounts,
  ]);

  const smsShortText = useMemo(() => {
    const delayed = filteredClaims.filter((c) => c.isDelayed).length;
    return `Hospital Management App (${groupLabel}${subCenterFilter !== 'all' ? ', ' + subCenterFilter : ''}): ASHAs=${scopedAshas.length}, Meetings=${filteredMeetings.length}, Leaves=${filteredLeaves.length}, ClaimVouchers=${filteredClaims.length} (Late=${delayed}) [${fromDate} to ${toDate}]`;
  }, [groupLabel, subCenterFilter, scopedAshas.length, filteredMeetings.length, filteredLeaves.length, filteredClaims, fromDate, toDate]);

  // Individual ASHA report export/share handlers
  const handleExportIndividualExcel = () => {
    if (!individualAsha) return;
    const headers = ['Section', 'Date / Period', 'Title / Dispatch No.', 'Reason / Details', 'Status / Value'];
    const rows: (string | number)[][] = [
      ['Profile', individualAsha.joiningDate, individualAsha.name, `${individualSummary.hospitalName} | ${individualAsha.subCenter} | ${individualAsha.awcName}`, individualAsha.phone],
      ...individualSummary.meetingRows.map((m) => [
        'Meeting Attendance',
        m.date,
        m.title,
        `${m.inTime} - ${m.outTime} (${m.venue})`,
        m.present ? 'Present' : 'Absent',
      ]),
      ...individualSummary.receivedNotices.map((n) => [
        'Notice Received',
        n.date,
        n.dispatchNumber || n.refNumber,
        `${n.reason || '-'} | ${hi ? n.titleHi : n.titleEn}`,
        n.targetAshaName || 'All',
      ]),
      ...individualSummary.ashaLeaves.map((l) => [
        'Leave',
        `${l.fromDate} -> ${l.toDate}`,
        `${l.days} Days`,
        l.reason,
        'Approved/Logged',
      ]),
      ...individualSummary.ashaClaims.map((c) => [
        'Claim Voucher',
        c.submittedDate,
        `${c.month}${c.voucherNo ? ` (#${c.voucherNo})` : ''}`,
        c.isDelayed ? 'Delayed' : 'On Time',
        c.status === 'paid' ? 'Verified' : c.status === 'submitted' ? 'Submitted' : 'Pending',
      ]),
      ...individualSummary.ashaHeadCounts.map((hc) => [
        'HeadCount',
        hc.surveyDate,
        `${hc.subCenter} (Preg:${hc.pregnantWomen}, Dhatri:${hc.lactatingMothers ?? 0})`,
        `0-1y:${hc.children0To1 ?? 0} | 1-2y:${hc.children1To2 ?? 0} | 2-3y:${hc.children2To3 ?? 0} | 5y:${hc.children5Yr ?? 0} | 10y:${getAge10(hc)} | 16y:${getAge16(hc)}`,
        `${Math.round((hc.surveyedPopulation / Math.max(1, hc.targetPopulation)) * 100)}%`,
      ]),
    ];
    downloadExcelCsv(`ASHA_Complete_Report_${individualAsha.name.replace(/\s+/g, '_')}.csv`, headers, rows);
  };

  const handleExportIndividualWord = () => {
    if (!individualAsha) return;
    const meetingTable = individualSummary.meetingRows
      .map(
        (m) =>
          `<tr><td>${escapeHtml(m.date)}</td><td>${escapeHtml(m.title)}</td><td>${escapeHtml(m.inTime)} - ${escapeHtml(m.outTime)}</td><td>${m.present ? 'उपस्थित (Present)' : 'अनुपस्थित (Absent)'}</td></tr>`
      )
      .join('');
    const noticeTable = individualSummary.receivedNotices
      .map(
        (n) =>
          `<tr><td>${escapeHtml(n.date)}</td><td>${escapeHtml(n.dispatchNumber || n.refNumber)}</td><td>${escapeHtml(n.reason || '-')}</td><td>${escapeHtml(hi ? n.titleHi : n.titleEn)}</td></tr>`
      )
      .join('');
    const leaveTable = individualSummary.ashaLeaves
      .map((l) => `<tr><td>${escapeHtml(l.fromDate)} → ${escapeHtml(l.toDate)}</td><td>${l.days}</td><td>${escapeHtml(l.reason)}</td></tr>`)
      .join('');
    const claimTable = individualSummary.ashaClaims
      .map(
        (c) =>
          `<tr><td>${escapeHtml(c.month)}</td><td>${escapeHtml(c.submittedDate)}</td><td>${escapeHtml(c.voucherNo || '-')}</td><td>${c.isDelayed ? 'देरी से' : 'समय पर'} (${c.status === 'paid' ? 'सत्यापित' : c.status === 'submitted' ? 'वाउचर जमा' : 'लंबित'})</td></tr>`
      )
      .join('');
    const hcTable = individualSummary.ashaHeadCounts
      .map(
        (hc) =>
          `<tr><td>${escapeHtml(hc.surveyDate)}</td><td>${hc.pregnantWomen}</td><td>${hc.lactatingMothers ?? 0}</td><td>${hc.children0To1 ?? 0}</td><td>${hc.children1To2 ?? 0}</td><td>${hc.children2To3 ?? 0}</td><td>${hc.children5Yr ?? 0}</td><td>${getAge10(hc)}</td><td>${getAge16(hc)}</td></tr>`
      )
      .join('');
    downloadWordDoc(
      `ASHA_Complete_Report_${individualAsha.name.replace(/\s+/g, '_')}.doc`,
      `${individualAsha.name} - Complete Report`,
      `
        <h2>Hospital Management App — आशा-वार पूर्ण रिपोर्ट (Complete Report)</h2>
        <p><strong>आशा:</strong> ${escapeHtml(individualAsha.name)} (${escapeHtml(individualAsha.phone || '-')}) | <strong>अस्पताल:</strong> ${escapeHtml(individualSummary.hospitalName)}</p>
        <p><strong>सब सेंटर:</strong> ${escapeHtml(individualAsha.subCenter)} | <strong>AWC:</strong> ${escapeHtml(individualAsha.awcName || '-')}</p>
        <p><strong>सारांश:</strong> बैठक उपस्थिति: ${individualSummary.presentCount}/${individualSummary.meetingRows.length} (${individualSummary.attendancePct}%) | मिले नोटिस: ${individualSummary.receivedNotices.length} | छुट्टी: ${individualSummary.totalLeaveDays} दिन | वाउचर जमा: ${individualSummary.ashaClaims.length} (ताज़ा: ${escapeHtml(individualSummary.latestClaimDate)})</p>
        <h3>1. बैठक उपस्थिति विवरण</h3>
        <table><thead><tr><th>तिथि</th><th>बैठक</th><th>समय</th><th>स्थिति</th></tr></thead><tbody>${meetingTable || '<tr><td colspan="4">कोई रिकॉर्ड नहीं</td></tr>'}</tbody></table>
        <h3>2. मिले हुए नोटिस विवरण</h3>
        <table><thead><tr><th>दिनांक</th><th>डिस्पैच नंबर</th><th>कारण</th><th>विषय</th></tr></thead><tbody>${noticeTable || '<tr><td colspan="4">कोई नोटिस नहीं</td></tr>'}</tbody></table>
        <h3>3. छुट्टी इतिहास</h3>
        <table><thead><tr><th>अवधि</th><th>दिन</th><th>कारण</th></tr></thead><tbody>${leaveTable || '<tr><td colspan="3">कोई छुट्टी नहीं</td></tr>'}</tbody></table>
        <h3>4. क्लेम वाउचर जमा इतिहास</h3>
        <table><thead><tr><th>माह</th><th>जमा तिथि</th><th>वाउचर नं.</th><th>स्थिति</th></tr></thead><tbody>${claimTable || '<tr><td colspan="4">कोई वाउचर जमा नहीं</td></tr>'}</tbody></table>
        <h3>5. हेडकाउंट (गर्भवती, धात्री व 0–16 वर्ष)</h3>
        <table><thead><tr><th>तिथि</th><th>गर्भवती</th><th>धात्री</th><th>0-1</th><th>1-2</th><th>2-3</th><th>5व</th><th>10व</th><th>16व</th></tr></thead><tbody>${hcTable || '<tr><td colspan="9">कोई हेडकाउंट नहीं</td></tr>'}</tbody></table>
      `
    );
  };

  const individualShareText = useMemo(() => {
    if (!individualAsha) return '';
    return `*Hospital Management App — आशा-वार रिपोर्ट*\nआशा: *${individualAsha.name}* (${individualAsha.phone || '-'})\nअस्पताल: ${individualSummary.hospitalName} | SC: ${individualAsha.subCenter}\n\n• बैठक उपस्थिति: *${individualSummary.presentCount}/${individualSummary.meetingRows.length}* (${individualSummary.attendancePct}%)\n• मिले नोटिस: *${individualSummary.receivedNotices.length}*\n• कुल छुट्टियाँ: *${individualSummary.totalLeaveDays} दिन*\n• क्लेम वाउचर जमा: *${individualSummary.ashaClaims.length}* (ताज़ा जमा: ${individualSummary.latestClaimDate}, देरी: ${individualSummary.delayedClaimsCount})`;
  }, [individualAsha, individualSummary]);

  const startEditNotice = (n: NoticeItem) => {
    setEditingNoticeId(n.id);
    setNoticeGroupId(n.groupId);
    setNoticeTargetAshaId(n.targetAshaId || 'all');
    setNoticeDispatchNo(n.dispatchNumber || n.refNumber);
    setNoticeDate(n.date);
    setNoticeReason(n.reason || NOTICE_REASONS[0]);
    setNoticeTitle(n.titleHi);
    setNoticeBody(n.bodyHi);
    setNoticeCategory(n.category);
    setShowNoticeForm(true);
  };

  const handleCreateNotice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeTitle.trim()) return;
    const targetGrp = groups.find((g) => g.id === noticeGroupId) || groups[0];
    const targetAsha =
      noticeTargetAshaId === 'all' ? null : ashas.find((a) => a.id === noticeTargetAshaId) || null;
    const cleanDisp =
      noticeDispatchNo.trim() || `DISP/${today.slice(0, 4)}/${String(notices.length + 1).padStart(2, '0')}`;
    const existingNotice = editingNoticeId ? notices.find((n) => n.id === editingNoticeId) : undefined;
    const item: NoticeItem = {
      id: editingNoticeId || `not-${Date.now()}`,
      groupId: targetGrp?.id || noticeGroupId || 'phc-som',
      dispatchNumber: cleanDisp,
      reason: noticeReason.trim() || NOTICE_REASONS[0],
      targetAshaId: targetAsha ? targetAsha.id : 'all',
      targetAshaName: targetAsha
        ? `${targetAsha.name} (${targetAsha.subCenter})`
        : hi
          ? `सभी आशा कार्यकर्ता (${targetGrp?.name || 'अस्पताल'})`
          : `All ASHAs (${targetGrp?.name || 'Hospital'})`,
      titleHi: noticeTitle.trim(),
      titleEn: noticeTitle.trim(),
      bodyHi: noticeBody.trim(),
      bodyEn: noticeBody.trim(),
      date: noticeDate,
      deliveredDate: existingNotice?.deliveredDate,
      refNumber: cleanDisp,
      category: noticeCategory,
    };
    if (editingNoticeId && onUpdateNotice) {
      onUpdateNotice(item);
      setEditingNoticeId(null);
    } else {
      onAddNotice(item);
    }
    setPreviewNoticeId(item.id);
    setNoticeTitle('');
    setNoticeBody('');
    setNoticeDispatchNo(`DISP/${today.slice(0, 4)}/${String(notices.length + 2).padStart(2, '0')}`);
    setShowNoticeForm(false);
  };

  const getNoticeShareText = (notice: NoticeItem) => {
    const title = hi ? notice.titleHi : notice.titleEn;
    const body = hi ? notice.bodyHi : notice.bodyEn;
    const grp = groups.find((g) => g.id === notice.groupId) || activeGroup;
    const disp = notice.dispatchNumber || notice.refNumber;
    return `*${grp?.name || 'Hospital Management App'}*\nडिस्पैच नंबर: ${disp} | दिनांक: ${notice.date}\nकारण: ${notice.reason || '-'}\nप्रति: ${notice.targetAshaName || 'सभी आशा'}\n\n*${title}*\n${body}`;
  };

  const handleExportNoticeWord = (notice: NoticeItem) => {
    const title = hi ? notice.titleHi : notice.titleEn;
    const body = hi ? notice.bodyHi : notice.bodyEn;
    const grp = groups.find((g) => g.id === notice.groupId) || activeGroup;
    const disp = notice.dispatchNumber || notice.refNumber;
    downloadWordDoc(
      `Notice_A4_${disp.replace(/[^\w-]/g, '_')}.doc`,
      title,
      `
        <div style="text-align:center;border-bottom:2px solid #0f172a;padding-bottom:10px;">
          <p><strong>चिकित्सा एवं स्वास्थ्य विभाग · Hospital Management App</strong></p>
          <h2>कार्यालय चिकित्सा अधिकारी प्रभारी — ${escapeHtml(grp?.name || 'अस्पताल / PHC')}</h2>
          <p>${escapeHtml(grp?.moicName || '')} · ${escapeHtml(grp?.shsName || '')}</p>
        </div>
        <p><strong>डिस्पैच नंबर:</strong> ${escapeHtml(disp)} &nbsp;&nbsp;&nbsp; <strong>दिनांक:</strong> ${escapeHtml(notice.date)}</p>
        <p><strong>कारण (Reason):</strong> ${escapeHtml(notice.reason || '-')}</p>
        <p><strong>प्रति:</strong> ${escapeHtml(notice.targetAshaName || 'सभी आशा कार्यकर्ता')}</p>
        <h3 style="text-align:center;text-decoration:underline;">${escapeHtml(title)}</h3>
        <p style="white-space:pre-line;line-height:1.7;">${escapeHtml(body)}</p>
        <p style="text-align:right;margin-top:42px;"><strong>${escapeHtml(grp?.moicName || 'MOIC')}</strong><br/>${escapeHtml(grp?.name || '')}</p>
      `
    );
  };

  const handleDownloadIndividualPdf = () => {
    if (!individualAsha) return;
    downloadIndividualAshaPdf({
      filename: `ASHA_Complete_Report_${individualAsha.name.replace(/\s+/g, '_')}.pdf`,
      asha: individualAsha,
      hospitalName: individualSummary.hospitalName,
      summary: individualSummary,
    });
  };

  const handleDownloadNoticePdf = (notice: NoticeItem) => {
    const grp = groups.find((g) => g.id === notice.groupId) || activeGroup;
    const disp = notice.dispatchNumber || notice.refNumber;
    const matrix = buildVerificationMatrix(`${disp}|${notice.date}|${grp?.name || 'HospitalManagementApp'}|${notice.reason || ''}`);
    downloadNoticeA4Pdf({
      filename: `Notice_A4_${disp.replace(/[^\w-]/g, '_')}.pdf`,
      notice,
      groupName: grp?.name || 'सम्बंधित अस्पताल / PHC',
      moicName: grp?.moicName || 'MOIC',
      shsName: grp?.shsName || '',
      qrMatrix: matrix,
    });
  };

  return (
    <div className="space-y-6">
      {/* Subtab Bar */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex flex-wrap rounded-xl border border-slate-200 bg-slate-100 p-1 gap-1">
          <button
            type="button"
            onClick={() => setSubTab('date_report')}
            className={`min-h-[40px] rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              subTab === 'date_report' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            {hi ? 'फ़िल्टर-वार रिपोर्ट' : 'Filter-Wise Report'}
          </button>
          <button
            type="button"
            onClick={() => setSubTab('asha_report')}
            className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              subTab === 'asha_report' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            <UserCheck className="h-3.5 w-3.5 text-teal-700" />
            <span>{hi ? 'आशा-वार पूर्ण रिपोर्ट' : 'ASHA-Wise Complete Report'}</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('notices')}
            className={`min-h-[40px] rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              subTab === 'notices' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            {hi ? 'आधिकारिक A4 नोटिस (डिस्पैच व कारण सहित)' : 'Official A4 Notice'}
          </button>
        </div>
      </div>

      {/* TAB 1: FILTER-WISE DATE-TO-DATE REPORT */}
      {subTab === 'date_report' && (
        <div className="space-y-4">
          <div className="no-print rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
              <div>
                <label className="block text-xs font-semibold text-slate-700">{hi ? 'अस्पताल समूह' : 'Hospital Group'}</label>
                <select
                  value={effectiveGroupId}
                  onChange={(e) => {
                    setReportGroupFilter(e.target.value);
                    setSubCenterFilter('all');
                    setAwcFilter('all');
                  }}
                  className="mt-1 w-full min-h-[40px] rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold"
                >
                  <option value="all">{hi ? 'सभी अस्पताल' : 'All Hospitals'}</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">{hi ? 'सब सेंटर' : 'Sub-Center'}</label>
                <select
                  value={subCenterFilter}
                  onChange={(e) => {
                    setSubCenterFilter(e.target.value);
                    setAwcFilter('all');
                  }}
                  className="mt-1 w-full min-h-[40px] rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold"
                >
                  <option value="all">{hi ? 'सभी सब सेंटर' : 'All Sub-Centers'}</option>
                  {subCentersList.map((sc) => (
                    <option key={sc} value={sc}>
                      {sc}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">{hi ? 'AWC केंद्र' : 'AWC Center'}</label>
                <select
                  value={awcFilter}
                  onChange={(e) => setAwcFilter(e.target.value)}
                  className="mt-1 w-full min-h-[40px] rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold"
                >
                  <option value="all">{hi ? 'सभी AWC' : 'All AWCs'}</option>
                  {awcList.map((awc) => (
                    <option key={awc} value={awc}>
                      {awc}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">{hi ? 'खोजें (नाम/स्टाफ)' : 'Search'}</label>
                <div className="relative mt-1">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder={hi ? 'आशा / साथिन / AWC...' : 'ASHA / Sathin / AWC...'}
                    className="w-full min-h-[40px] rounded-xl border border-slate-200 pl-8 pr-2 text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">{hi ? 'कब से' : 'From Date'}</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="mt-1 w-full min-h-[40px] rounded-xl border border-slate-200 px-2.5 text-xs tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">{hi ? 'कब तक' : 'To Date'}</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="mt-1 w-full min-h-[40px] rounded-xl border border-slate-200 px-2.5 text-xs tabular-nums"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1">
                {(
                  [
                    { id: 'ashas', label: hi ? `आशा व टीम (${scopedAshas.length})` : `ASHAs & Team (${scopedAshas.length})` },
                    { id: 'meetings', label: hi ? `बैठक (${filteredMeetings.length})` : `Meetings (${filteredMeetings.length})` },
                    { id: 'leaves', label: hi ? `छुट्टी (${filteredLeaves.length})` : `Leaves (${filteredLeaves.length})` },
                    { id: 'claims', label: hi ? `क्लेम वाउचर (${filteredClaims.length})` : `Claim Vouchers (${filteredClaims.length})` },
                    { id: 'headcount', label: hi ? `हेड काउंट (${filteredHeadCounts.length})` : `Head Count (${filteredHeadCounts.length})` },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setReportKind(item.id)}
                    className={`min-h-[36px] rounded-lg px-3 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
                      reportKind === item.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <p className="mb-2 text-[11px] font-semibold text-slate-500">
                {hi ? 'फ़िल्टर किए गए डेटा के लिए एक्सपोर्ट व शेयर (PDF, Excel, Word, WhatsApp, SMS, Email, Share)' : 'Export & Share Filtered Report'}
              </p>
              <ReportShareBar
                lang={lang}
                title={`Hospital Management App — ${groupLabel}`}
                shareText={reportShareText}
                smsText={smsShortText}
                onDownloadPdf={handleDownloadPdf}
                onPrintPdf={() => window.print()}
                onExportExcel={handleExportExcel}
                onExportWord={handleExportWord}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="border-b border-slate-200 pb-4">
              <p className="text-xs font-semibold text-teal-700">Hospital Management App</p>
              <h2 className="mt-0.5 text-lg font-bold text-slate-900">
                {groupLabel} —{' '}
                {reportKind === 'ashas' && (hi ? 'आशा व ग्राम-स्तरीय टीम रिपोर्ट' : 'ASHA & Field Team Report')}
                {reportKind === 'meetings' && (hi ? 'बैठक व उपस्थिति रिपोर्ट' : 'Meetings & Attendance Report')}
                {reportKind === 'leaves' && (hi ? 'छुट्टी रिकॉर्ड रिपोर्ट' : 'Leave History Report')}
                {reportKind === 'claims' && (hi ? 'क्लेम वाउचर व जमा तिथि रिपोर्ट' : 'Claim Voucher & Submission Date Report')}
                {reportKind === 'headcount' && (hi ? 'हेड काउंट सर्वे रिपोर्ट' : 'Head Count Survey Report')}
              </h2>
              <p className="mt-1 text-xs text-slate-600 tabular-nums">
                {activeGroup?.moicName || '-'} · {subCenterFilter !== 'all' ? `${subCenterFilter} · ` : ''}
                {awcFilter !== 'all' ? `${awcFilter} · ` : ''}
                {fromDate} → {toDate}
              </p>
            </div>

            <div className="mt-4 overflow-x-auto">
              {reportKind === 'ashas' && (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-2 pr-3 font-semibold">{hi ? 'अस्पताल व आशा' : 'Hospital & ASHA'}</th>
                      <th className="py-2 pr-3 font-semibold">{hi ? 'सब सेंटर व AWC' : 'Sub-Center & AWC'}</th>
                      <th className="py-2 pr-3 font-semibold">{hi ? 'AWC कार्यकर्ता / साथिन / स्वच्छकर्मी' : 'AWW / Sathin / SwachhKarmi'}</th>
                      <th className="py-2 pr-3 font-semibold">{hi ? 'ANM / CHO संपर्क' : 'ANM / CHO'}</th>
                      <th className="py-2 pr-3 font-semibold">{hi ? 'आधार / बैंक / IFSC' : 'ID & Bank'}</th>
                      <th className="py-2 font-semibold">{hi ? 'ज्वाइनिंग' : 'Joining'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {scopedAshas.map((a) => (
                      <tr key={a.id}>
                        <td className="py-2.5 pr-3">
                          <p className="text-[11px] font-semibold text-teal-800">{getHospitalName(a)}</p>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedAshaId(a.id);
                              setSubTab('asha_report');
                            }}
                            className="font-semibold text-slate-900 hover:text-teal-700 hover:underline text-left"
                          >
                            {a.name}
                          </button>
                          <p className="text-[11px] text-slate-500 tabular-nums">
                            {a.phone} · {hi ? 'पति:' : 'H:'} {a.husbandName || '-'} {a.husbandPhone ? `(${a.husbandPhone})` : ''}
                          </p>
                        </td>
                        <td className="py-2.5 pr-3 text-slate-700">
                          <p>{a.subCenter} · {a.awcName || '-'}</p>
                          <p className="text-[11px] text-slate-500">{a.subCenterAddress || '-'}</p>
                        </td>
                        <td className="py-2.5 pr-3 text-slate-700 tabular-nums">
                          <p>AWC: {a.awcWorkerName || '-'} {a.awcWorkerPhone ? `(${a.awcWorkerPhone})` : ''}</p>
                          <p>{hi ? 'साथिन:' : 'Sathin:'} {a.sathinName || '-'} {a.sathinPhone ? `(${a.sathinPhone})` : ''}</p>
                          <p>{hi ? 'स्वच्छकर्मी:' : 'SwachhKarmi:'} {a.swachhKarmiName || '-'} {a.swachhKarmiPhone ? `(${a.swachhKarmiPhone})` : ''}</p>
                        </td>
                        <td className="py-2.5 pr-3 text-slate-700 tabular-nums">
                          <p>ANM: {a.anmName || '-'} {a.anmPhone ? `(${a.anmPhone})` : ''}</p>
                          <p>CHO: {a.choName || '-'} {a.choPhone ? `(${a.choPhone})` : ''}</p>
                        </td>
                        <td className="py-2.5 pr-3 font-mono tabular-nums text-slate-700">
                          <p>{a.aadhaarMasked || '-'} · {a.janAadhaar || '-'}</p>
                          <p className="text-[11px] text-slate-500">{a.bankName || '-'} {a.bankAccountMasked} ({a.ifsc})</p>
                        </td>
                        <td className="py-2.5 font-mono tabular-nums text-slate-600">{a.joiningDate || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {reportKind === 'meetings' && (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-2 pr-3 font-semibold">{hi ? 'तिथि' : 'Date'}</th>
                      <th className="py-2 pr-3 font-semibold">{hi ? 'बैठक / ट्रेनिंग' : 'Session'}</th>
                      <th className="py-2 pr-3 font-semibold">{hi ? 'स्थान' : 'Venue'}</th>
                      <th className="py-2 font-semibold text-right tabular-nums">{hi ? 'उपस्थिति' : 'Present'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredMeetings.map((m) => (
                      <tr key={m.id}>
                        <td className="py-2.5 pr-3 font-mono tabular-nums">{m.date}</td>
                        <td className="py-2.5 pr-3 font-semibold text-slate-900">{m.title}</td>
                        <td className="py-2.5 pr-3 text-slate-600">{m.venue}</td>
                        <td className="py-2.5 text-right font-mono tabular-nums font-bold text-teal-700">
                          {m.attendance.filter((a) => a.present).length}/{m.attendance.length}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {reportKind === 'leaves' && (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-2 pr-3 font-semibold">{hi ? 'आशा' : 'ASHA'}</th>
                      <th className="py-2 pr-3 font-semibold">{hi ? 'अवधि' : 'Period'}</th>
                      <th className="py-2 pr-3 font-semibold text-right tabular-nums">{hi ? 'दिन' : 'Days'}</th>
                      <th className="py-2 font-semibold">{hi ? 'कारण' : 'Reason'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLeaves.map((l) => (
                      <tr key={l.id}>
                        <td className="py-2.5 pr-3 font-semibold text-slate-900">{l.ashaName}</td>
                        <td className="py-2.5 pr-3 font-mono tabular-nums">{l.fromDate} → {l.toDate}</td>
                        <td className="py-2.5 pr-3 text-right font-mono tabular-nums font-bold">{l.days}</td>
                        <td className="py-2.5 text-slate-600">{l.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {reportKind === 'claims' && (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-2 pr-3 font-semibold">{hi ? 'आशा' : 'ASHA'}</th>
                      <th className="py-2 pr-3 font-semibold">{hi ? 'माह' : 'Month'}</th>
                      <th className="py-2 pr-3 font-semibold">{hi ? 'कब जमा करवाया (तिथि)' : 'Submitted Date'}</th>
                      <th className="py-2 pr-3 font-semibold">{hi ? 'वाउचर नं.' : 'Voucher No.'}</th>
                      <th className="py-2 font-semibold">{hi ? 'समय पालन व स्थिति' : 'Timeliness & Status'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredClaims.map((c) => (
                      <tr key={c.id}>
                        <td className="py-2.5 pr-3 font-semibold text-slate-900">{c.ashaName}</td>
                        <td className="py-2.5 pr-3 font-mono tabular-nums">{c.month}</td>
                        <td className="py-2.5 pr-3 font-mono tabular-nums font-semibold text-slate-900">{c.submittedDate}</td>
                        <td className="py-2.5 pr-3 font-mono tabular-nums text-slate-600">{c.voucherNo || '-'}</td>
                        <td className="py-2.5">
                          <span className={c.isDelayed ? 'font-semibold text-amber-700' : 'font-semibold text-teal-700'}>
                            {c.isDelayed ? (hi ? 'देरी से जमा' : 'Delayed') : (hi ? 'समय पर जमा' : 'On Time')}
                          </span>
                          <span className="ml-1.5 text-slate-500">
                            ({c.status === 'paid' ? (hi ? 'सत्यापित' : 'Verified') : c.status === 'submitted' ? (hi ? 'वाउचर जमा' : 'Submitted') : (hi ? 'लंबित' : 'Pending')})
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {reportKind === 'headcount' && (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-2 pr-3 font-semibold">{hi ? 'आशा व उप-केंद्र' : 'ASHA & Sub-Center'}</th>
                      <th className="py-2 pr-2 font-semibold text-right tabular-nums">{hi ? 'लक्ष्य/सर्वे' : 'Target/Surv'}</th>
                      <th className="py-2 pr-2 font-semibold text-right tabular-nums whitespace-nowrap">{hi ? 'गर्भवती' : 'Preg.'}</th>
                      <th className="py-2 pr-2 font-semibold text-right tabular-nums whitespace-nowrap">{hi ? 'धात्री' : 'Dhatri'}</th>
                      <th className="py-2 pr-2 font-semibold text-right tabular-nums whitespace-nowrap">{hi ? '0–1' : '0–1y'}</th>
                      <th className="py-2 pr-2 font-semibold text-right tabular-nums whitespace-nowrap">{hi ? '1–2' : '1–2y'}</th>
                      <th className="py-2 pr-2 font-semibold text-right tabular-nums whitespace-nowrap">{hi ? '2–3' : '2–3y'}</th>
                      <th className="py-2 pr-2 font-semibold text-right tabular-nums whitespace-nowrap">{hi ? '5व' : '5y'}</th>
                      <th className="py-2 pr-2 font-semibold text-right tabular-nums whitespace-nowrap">{hi ? '10व' : '10y'}</th>
                      <th className="py-2 font-semibold text-right tabular-nums whitespace-nowrap">{hi ? '16व' : '16y'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredHeadCounts.map((hc) => {
                      const pct = Math.round((hc.surveyedPopulation / Math.max(1, hc.targetPopulation)) * 100);
                      return (
                        <tr key={hc.id}>
                          <td className="py-2.5 pr-3">
                            <p className="font-semibold text-slate-900">{hc.ashaName || hc.subCenter}</p>
                            <p className="text-[11px] text-slate-500">{hc.subCenter} · {hc.surveyDate}</p>
                          </td>
                          <td className="py-2.5 pr-2 text-right font-mono tabular-nums">
                            {hc.surveyedPopulation}/{hc.targetPopulation} ({pct}%)
                          </td>
                          <td className="py-2.5 pr-2 text-right font-mono tabular-nums font-semibold text-teal-800">{hc.pregnantWomen}</td>
                          <td className="py-2.5 pr-2 text-right font-mono tabular-nums font-semibold text-teal-800">{hc.lactatingMothers ?? 0}</td>
                          <td className="py-2.5 pr-2 text-right font-mono tabular-nums">{hc.children0To1 ?? 0}</td>
                          <td className="py-2.5 pr-2 text-right font-mono tabular-nums">{hc.children1To2 ?? 0}</td>
                          <td className="py-2.5 pr-2 text-right font-mono tabular-nums">{hc.children2To3 ?? 0}</td>
                          <td className="py-2.5 pr-2 text-right font-mono tabular-nums">{hc.children5Yr ?? 0}</td>
                          <td className="py-2.5 pr-2 text-right font-mono tabular-nums">{getAge10(hc)}</td>
                          <td className="py-2.5 text-right font-mono tabular-nums">{getAge16(hc)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-300 bg-teal-50/70 font-bold text-slate-900">
                      <td className="py-2.5 pr-3">{hi ? `कुल योग (${filteredHeadCounts.length})` : `Total (${filteredHeadCounts.length})`}</td>
                      <td className="py-2.5 pr-2 text-right font-mono tabular-nums">
                        {filteredHeadCountTotals.surveyedPopulation}/{filteredHeadCountTotals.targetPopulation} (
                        {Math.round(
                          (filteredHeadCountTotals.surveyedPopulation /
                            Math.max(1, filteredHeadCountTotals.targetPopulation)) *
                            100
                        )}
                        %)
                      </td>
                      <td className="py-2.5 pr-2 text-right font-mono tabular-nums text-teal-900">{filteredHeadCountTotals.pregnantWomen}</td>
                      <td className="py-2.5 pr-2 text-right font-mono tabular-nums text-teal-900">{filteredHeadCountTotals.lactatingMothers}</td>
                      <td className="py-2.5 pr-2 text-right font-mono tabular-nums">{filteredHeadCountTotals.children0To1}</td>
                      <td className="py-2.5 pr-2 text-right font-mono tabular-nums">{filteredHeadCountTotals.children1To2}</td>
                      <td className="py-2.5 pr-2 text-right font-mono tabular-nums">{filteredHeadCountTotals.children2To3}</td>
                      <td className="py-2.5 pr-2 text-right font-mono tabular-nums">{filteredHeadCountTotals.children5Yr}</td>
                      <td className="py-2.5 pr-2 text-right font-mono tabular-nums">{filteredHeadCountTotals.children10Yr}</td>
                      <td className="py-2.5 text-right font-mono tabular-nums">{filteredHeadCountTotals.children16Yr}</td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INDIVIDUAL ASHA-WISE REPORT (MEETINGS ATTENDED + NOTICES RECEIVED + LEAVES + CLAIMS) */}
      {subTab === 'asha_report' && (
        <div className="space-y-4">
          <div className="no-print rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex-1 max-w-md">
                <label className="block text-xs font-semibold text-slate-700">
                  {hi ? 'आशा कार्यकर्ता चुनें (व्यक्तिगत रिपोर्ट हेतु)' : 'Select ASHA Worker for Individual Report'}
                </label>
                <select
                  value={individualAsha?.id || ''}
                  onChange={(e) => setSelectedAshaId(e.target.value)}
                  className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900"
                >
                  {ashas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} — {a.subCenter} ({getHospitalName(a)})
                    </option>
                  ))}
                </select>
              </div>
              {individualAsha && (
                <ReportShareBar
                  lang={lang}
                  compact
                  title={`Hospital Management App — ${individualAsha.name} Report`}
                  shareText={individualShareText}
                  onDownloadPdf={handleDownloadIndividualPdf}
                  onPrintPdf={() => window.print()}
                  onExportExcel={handleExportIndividualExcel}
                  onExportWord={handleExportIndividualWord}
                />
              )}
            </div>
          </div>

          {!individualAsha ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
              {hi ? 'कोई आशा प्रोफ़ाइल उपलब्ध नहीं है।' : 'No ASHA worker profiles available.'}
            </div>
          ) : (
            <div className="a4-notice-sheet rounded-2xl border border-slate-200 bg-white p-6 space-y-6">
              {/* Individual ASHA Header & Profile */}
              <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 text-lg font-bold text-teal-800">
                    {individualAsha.photoDataUrl ? (
                      <img src={individualAsha.photoDataUrl} alt={individualAsha.name} className="h-full w-full object-cover" />
                    ) : (
                      individualAsha.name.slice(0, 1)
                    )}
                  </div>
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <p className="text-xs font-semibold text-teal-700">
                        Hospital Management App · {individualSummary.hospitalName}
                      </p>
                      <h2 className="text-xl font-bold text-slate-900">{individualAsha.name}</h2>
                      <p className="text-xs text-slate-600 tabular-nums">
                        {individualAsha.subCenter} · AWC: {individualAsha.awcName || '-'} · 📱 {individualAsha.phone || '-'}
                      </p>
                      <p className="text-[11px] text-slate-500 tabular-nums">
                        AWC कार्यकर्ता: {individualAsha.awcWorkerName || '-'} ({individualAsha.awcWorkerPhone || '-'}) · साथिन: {individualAsha.sathinName || '-'} · स्वच्छकर्मी: {individualAsha.swachhKarmiName || '-'}
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setNoticeGroupId(individualAsha.groupId);
                    setNoticeTargetAshaId(individualAsha.id);
                    setShowNoticeForm(true);
                    setSubTab('notices');
                  }}
                  className="no-print inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl bg-teal-700 px-3.5 text-xs font-semibold text-white hover:bg-teal-800"
                >
                  <Plus className="h-4 w-4" />
                  <span>{hi ? 'इस आशा को नोटिस जारी करें' : 'Issue Notice to ASHA'}</span>
                </button>
              </div>

              {/* Individual 4 KPI Metrics */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
                  <p className="text-[11px] font-semibold text-slate-500">
                    {hi ? 'बैठकों में उपस्थिति' : 'Meetings Attended'}
                  </p>
                  <p className="mt-1 text-xl font-bold text-teal-800 tabular-nums">
                    {individualSummary.presentCount}/{individualSummary.meetingRows.length}{' '}
                    <span className="text-xs font-semibold">({individualSummary.attendancePct}%)</span>
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
                  <p className="text-[11px] font-semibold text-slate-500">
                    {hi ? 'मिले हुए नोटिस' : 'Notices Received'}
                  </p>
                  <p className="mt-1 text-xl font-bold text-slate-900 tabular-nums">
                    {individualSummary.receivedNotices.length}
                  </p>
                  <p className="text-[10px] font-medium text-slate-500 tabular-nums">
                    {hi
                      ? `व्यक्तिगत: ${individualSummary.personalNoticesCount} · सामूहिक: ${individualSummary.generalNoticesCount}`
                      : `Personal: ${individualSummary.personalNoticesCount} · Group: ${individualSummary.generalNoticesCount}`}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
                  <p className="text-[11px] font-semibold text-slate-500">
                    {hi ? 'कुल छुट्टियाँ (दिन)' : 'Leave Days'}
                  </p>
                  <p className="mt-1 text-xl font-bold text-slate-900 tabular-nums">
                    {individualSummary.totalLeaveDays} {hi ? 'दिन' : 'days'}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
                  <p className="text-[11px] font-semibold text-slate-500">
                    {hi ? 'क्लेम वाउचर जमा' : 'Claim Vouchers'}
                  </p>
                  <p className="mt-1 text-xl font-bold text-slate-900 tabular-nums">
                    {individualSummary.ashaClaims.length} {hi ? 'वाउचर' : 'vouchers'}
                  </p>
                  <p className="text-[10px] font-medium text-slate-500 tabular-nums">
                    {hi
                      ? `ताज़ा जमा: ${individualSummary.latestClaimDate} · देरी: ${individualSummary.delayedClaimsCount}`
                      : `Latest: ${individualSummary.latestClaimDate} · Late: ${individualSummary.delayedClaimsCount}`}
                  </p>
                </div>
              </div>

              {/* Meetings Attended Table */}
              <div>
                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-2">
                  <CalendarCheck className="h-4 w-4 text-teal-700" />
                  <span>
                    {hi
                      ? `बैठक व ट्रेनिंग उपस्थिति विवरण (${individualSummary.presentCount} में उपस्थित / ${individualSummary.absentCount} अनुपस्थित)`
                      : `Meetings Attendance History (${individualSummary.presentCount} Present / ${individualSummary.absentCount} Absent)`}
                  </span>
                </h3>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-3 py-2 font-semibold">{hi ? 'तिथि' : 'Date'}</th>
                        <th className="px-3 py-2 font-semibold">{hi ? 'बैठक / ट्रेनिंग' : 'Session'}</th>
                        <th className="px-3 py-2 font-semibold">{hi ? 'आने-जाने का समय' : 'In / Out'}</th>
                        <th className="px-3 py-2 font-semibold text-right">{hi ? 'उपस्थिति' : 'Status'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {individualSummary.meetingRows.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-3 py-6 text-center text-slate-500">
                            {hi ? 'इस अस्पताल की कोई बैठक दर्ज नहीं है।' : 'No meetings logged yet.'}
                          </td>
                        </tr>
                      ) : (
                        individualSummary.meetingRows.map((m) => (
                          <tr key={m.id}>
                            <td className="px-3 py-2 font-mono tabular-nums">{m.date}</td>
                            <td className="px-3 py-2 font-semibold text-slate-900">{m.title}</td>
                            <td className="px-3 py-2 font-mono tabular-nums text-slate-600">
                              {m.inTime} → {m.outTime}
                            </td>
                            <td className="px-3 py-2 text-right font-semibold">
                              <span className={m.present ? 'text-teal-700' : 'text-rose-700'}>
                                {m.present ? (hi ? 'उपस्थित ✓' : 'Present ✓') : (hi ? 'अनुपस्थित' : 'Absent')}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Notices Received Table */}
              <div>
                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-2">
                  <FileText className="h-4 w-4 text-teal-700" />
                  <span>
                    {hi
                      ? `मिले हुए नोटिस विवरण (कुल ${individualSummary.receivedNotices.length} नोटिस)`
                      : `Notices Received (${individualSummary.receivedNotices.length})`}
                  </span>
                </h3>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-3 py-2 font-semibold">{hi ? 'दिनांक' : 'Date'}</th>
                        <th className="px-3 py-2 font-semibold">{hi ? 'डिस्पैच नंबर' : 'Dispatch No.'}</th>
                        <th className="px-3 py-2 font-semibold">{hi ? 'कारण' : 'Reason'}</th>
                        <th className="px-3 py-2 font-semibold">{hi ? 'प्रकार' : 'Scope'}</th>
                        <th className="px-3 py-2 font-semibold">{hi ? 'नोटिस विषय' : 'Title'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {individualSummary.receivedNotices.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                            {hi ? 'इस आशा के लिए कोई नोटिस जारी नहीं हुआ है।' : 'No notices issued for this ASHA yet.'}
                          </td>
                        </tr>
                      ) : (
                        individualSummary.receivedNotices.map((n) => {
                          const isPersonal = n.targetAshaId === individualAsha.id;
                          return (
                          <tr key={n.id}>
                            <td className="px-3 py-2 font-mono tabular-nums">{n.date}</td>
                            <td className="px-3 py-2 font-mono tabular-nums font-semibold text-slate-800">
                              {n.dispatchNumber || n.refNumber}
                            </td>
                            <td className="px-3 py-2 text-slate-700">{n.reason || '-'}</td>
                            <td className="px-3 py-2 text-[11px] font-semibold">
                              <span className={isPersonal ? 'text-amber-700' : 'text-slate-600'}>
                                {isPersonal ? (hi ? 'व्यक्तिगत' : 'Personal') : (hi ? 'अस्पताल सामूहिक' : 'Hospital All')}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setPreviewNoticeId(n.id);
                                  setSubTab('notices');
                                }}
                                className="font-semibold text-teal-800 hover:underline text-left"
                              >
                                {hi ? n.titleHi : n.titleEn}
                              </button>
                            </td>
                          </tr>
                        );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ASHA HeadCount Pregnant, Dhatri & Age-Based Summary */}
              <div>
                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-2">
                  <UserCheck className="h-4 w-4 text-teal-700" />
                  <span>
                    {hi
                      ? 'हेडकाउंट विवरण (गर्भवती, धात्री व 0–1, 1–2, 2–3, 5, 10, 16 वर्ष)'
                      : 'HeadCount (Pregnant, Dhatri & 0-1, 1-2, 2-3, 5, 10, 16 Yrs)'}
                  </span>
                </h3>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-3 py-2 font-semibold">{hi ? 'तिथि' : 'Date'}</th>
                        <th className="px-3 py-2 font-semibold text-right tabular-nums">{hi ? 'गर्भवती' : 'Preg.'}</th>
                        <th className="px-3 py-2 font-semibold text-right tabular-nums">{hi ? 'धात्री' : 'Dhatri'}</th>
                        <th className="px-3 py-2 font-semibold text-right tabular-nums">{hi ? '0–1' : '0–1y'}</th>
                        <th className="px-3 py-2 font-semibold text-right tabular-nums">{hi ? '1–2' : '1–2y'}</th>
                        <th className="px-3 py-2 font-semibold text-right tabular-nums">{hi ? '2–3' : '2–3y'}</th>
                        <th className="px-3 py-2 font-semibold text-right tabular-nums">{hi ? '5व' : '5y'}</th>
                        <th className="px-3 py-2 font-semibold text-right tabular-nums">{hi ? '10व' : '10y'}</th>
                        <th className="px-3 py-2 font-semibold text-right tabular-nums">{hi ? '16व' : '16y'}</th>
                        <th className="px-3 py-2 font-semibold text-right tabular-nums">{hi ? 'कवरेज' : 'Cov'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {individualSummary.ashaHeadCounts.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="px-3 py-5 text-center text-slate-500">
                            {hi ? 'इस आशा के लिए कोई हेडकाउंट प्रविष्टि दर्ज नहीं है।' : 'No HeadCount entries logged for this ASHA yet.'}
                          </td>
                        </tr>
                      ) : (
                        individualSummary.ashaHeadCounts.map((hc) => {
                          const pct = Math.round((hc.surveyedPopulation / Math.max(1, hc.targetPopulation)) * 100);
                          return (
                            <tr key={hc.id}>
                              <td className="px-3 py-2 font-mono tabular-nums">{hc.surveyDate}</td>
                              <td className="px-3 py-2 text-right font-mono tabular-nums font-semibold text-teal-800">{hc.pregnantWomen}</td>
                              <td className="px-3 py-2 text-right font-mono tabular-nums font-semibold text-teal-800">{hc.lactatingMothers ?? 0}</td>
                              <td className="px-3 py-2 text-right font-mono tabular-nums">{hc.children0To1 ?? 0}</td>
                              <td className="px-3 py-2 text-right font-mono tabular-nums">{hc.children1To2 ?? 0}</td>
                              <td className="px-3 py-2 text-right font-mono tabular-nums">{hc.children2To3 ?? 0}</td>
                              <td className="px-3 py-2 text-right font-mono tabular-nums">{hc.children5Yr ?? 0}</td>
                              <td className="px-3 py-2 text-right font-mono tabular-nums">{getAge10(hc)}</td>
                              <td className="px-3 py-2 text-right font-mono tabular-nums">{getAge16(hc)}</td>
                              <td className="px-3 py-2 text-right font-mono tabular-nums font-semibold text-teal-700">
                                {pct}%
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ASHA Leaves & Claims Complete History */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-2">
                    {hi ? `छुट्टी इतिहास (${individualSummary.totalLeaveDays} दिन)` : `Leave History (${individualSummary.totalLeaveDays} days)`}
                  </h3>
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="px-3 py-2 font-semibold">{hi ? 'अवधि' : 'Period'}</th>
                          <th className="px-3 py-2 font-semibold text-right">{hi ? 'दिन' : 'Days'}</th>
                          <th className="px-3 py-2 font-semibold">{hi ? 'कारण' : 'Reason'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {individualSummary.ashaLeaves.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="px-3 py-4 text-center text-slate-500">
                              {hi ? 'कोई छुट्टी दर्ज नहीं' : 'No leaves logged'}
                            </td>
                          </tr>
                        ) : (
                          individualSummary.ashaLeaves.map((l) => (
                            <tr key={l.id}>
                              <td className="px-3 py-2 font-mono tabular-nums">{l.fromDate} → {l.toDate}</td>
                              <td className="px-3 py-2 text-right font-mono tabular-nums font-semibold">{l.days}</td>
                              <td className="px-3 py-2 text-slate-600">{l.reason}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-2">
                    {hi ? `क्लेम वाउचर जमा इतिहास (${individualSummary.ashaClaims.length})` : `Claim Voucher History (${individualSummary.ashaClaims.length})`}
                  </h3>
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="px-3 py-2 font-semibold">{hi ? 'माह' : 'Month'}</th>
                          <th className="px-3 py-2 font-semibold">{hi ? 'कब जमा करवाया' : 'Submitted Date'}</th>
                          <th className="px-3 py-2 font-semibold text-right">{hi ? 'स्थिति' : 'Status'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {individualSummary.ashaClaims.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="px-3 py-4 text-center text-slate-500">
                              {hi ? 'कोई वाउचर जमा दर्ज नहीं' : 'No claim vouchers logged'}
                            </td>
                          </tr>
                        ) : (
                          individualSummary.ashaClaims.map((c) => (
                            <tr key={c.id}>
                              <td className="px-3 py-2 font-mono tabular-nums font-semibold">
                                {c.month}
                                {c.voucherNo && <span className="block text-[10px] text-slate-400">#{c.voucherNo}</span>}
                              </td>
                              <td className="px-3 py-2 font-mono tabular-nums text-slate-900">{c.submittedDate}</td>
                              <td className="px-3 py-2 text-right">
                                <span className={c.isDelayed ? 'font-semibold text-amber-700' : 'text-teal-700 font-semibold'}>
                                  {c.isDelayed ? (hi ? 'देरी से' : 'Delayed') : (hi ? 'समय पर' : 'On Time')}
                                </span>
                                <span className="block text-[10px] text-slate-500">
                                  {c.status === 'paid' ? (hi ? 'सत्यापित' : 'Verified') : c.status === 'submitted' ? (hi ? 'वाउचर जमा' : 'Submitted') : (hi ? 'लंबित' : 'Pending')}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: OFFICIAL A4 LETTERHEAD HINDI PDF NOTICE (HOSPITAL HEADING + DISPATCH NO. + DATE + REASON) */}
      {subTab === 'notices' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="no-print space-y-4 lg:col-span-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <h3 className="text-base font-bold text-slate-900">
                  {hi ? 'कार्यालयीन A4 नोटिस सूची' : 'Official A4 Notices'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowNoticeForm((v) => !v)}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-800"
                >
                  <Plus className="h-4 w-4" />
                  <span>{hi ? 'नया A4 नोटिस' : 'New A4 Notice'}</span>
                </button>
              </div>

              {showNoticeForm && (
                <form onSubmit={handleCreateNotice} className="mt-4 space-y-3 border-b border-slate-200 pb-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700">
                      {hi ? 'सम्बंधित अस्पताल (शीर्ष हेडिंग के लिए) *' : 'Related Hospital (Heading) *'}
                    </label>
                    <select
                      value={noticeGroupId}
                      onChange={(e) => {
                        setNoticeGroupId(e.target.value);
                        setNoticeTargetAshaId('all');
                      }}
                      className="mt-1 w-full min-h-[40px] rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold"
                    >
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700">
                      {hi ? 'किस आशा / समूह के लिए (आशा-वार ट्रैकिंग)' : 'Target ASHA / All ASHAs'}
                    </label>
                    <select
                      value={noticeTargetAshaId}
                      onChange={(e) => setNoticeTargetAshaId(e.target.value)}
                      className="mt-1 w-full min-h-[40px] rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold"
                    >
                      <option value="all">{hi ? 'सभी आशा कार्यकर्ता (इस अस्पताल की)' : 'All ASHAs (This Hospital)'}</option>
                      {ashas
                        .filter((a) => !noticeGroupId || a.groupId === noticeGroupId)
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({a.subCenter})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700">
                        {hi ? 'डिस्पैच नंबर *' : 'Dispatch No. *'}
                      </label>
                      <input
                        required
                        placeholder="DISP/2026/02"
                        value={noticeDispatchNo}
                        onChange={(e) => setNoticeDispatchNo(e.target.value)}
                        className="mt-1 w-full min-h-[40px] rounded-xl border border-slate-200 px-3 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700">
                        {hi ? 'दिनांक *' : 'Date *'}
                      </label>
                      <input
                        type="date"
                        value={noticeDate}
                        onChange={(e) => setNoticeDate(e.target.value)}
                        className="mt-1 w-full min-h-[40px] rounded-xl border border-slate-200 px-3 text-xs tabular-nums"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700">
                      {hi ? 'कारण (कारण-वार चयन / लिखें) *' : 'Reason (Reason-wise) *'}
                    </label>
                    <select
                      value={NOTICE_REASONS.includes(noticeReason) ? noticeReason : '__custom__'}
                      onChange={(e) => {
                        if (e.target.value !== '__custom__') setNoticeReason(e.target.value);
                      }}
                      className="mt-1 w-full min-h-[40px] rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold"
                    >
                      {NOTICE_REASONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                      <option value="__custom__">{hi ? 'अन्य कारण लिखें' : 'Custom Reason'}</option>
                    </select>
                    <input
                      required
                      value={noticeReason}
                      onChange={(e) => setNoticeReason(e.target.value)}
                      placeholder={hi ? 'नोटिस का सटीक कारण लिखें...' : 'Enter notice reason...'}
                      className="mt-1.5 w-full min-h-[40px] rounded-xl border border-slate-200 px-3 text-xs"
                    />
                  </div>

                  <input
                    required
                    placeholder={hi ? 'नोटिस विषय (उदा. सेक्टर बैठक सूचना)' : 'Notice Title'}
                    value={noticeTitle}
                    onChange={(e) => setNoticeTitle(e.target.value)}
                    className="w-full min-h-[44px] rounded-xl border border-slate-200 px-3 text-sm"
                  />
                  <textarea
                    rows={3}
                    placeholder={hi ? 'नोटिस का पूरा विवरण लिखें...' : 'Write full official notice text...'}
                    value={noticeBody}
                    onChange={(e) => setNoticeBody(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <select
                      value={noticeCategory}
                      onChange={(e) => setNoticeCategory(e.target.value as NoticeCategory)}
                      className="min-h-[40px] rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold"
                    >
                      <option value="sector">Sector</option>
                      <option value="vhsnd">VHSND</option>
                      <option value="immunization">Immunization</option>
                      <option value="general">General</option>
                    </select>
                    <button type="submit" className="min-h-[40px] rounded-xl bg-slate-900 px-4 text-xs font-semibold text-white">
                      {editingNoticeId
                        ? hi ? 'नोटिस अपडेट करें' : 'Update A4 Notice'
                        : hi ? 'A4 नोटिस जारी करें' : 'Issue A4 Notice'}
                    </button>
                  </div>
                </form>
              )}

              {/* Reason-Wise Filter for Notices */}
              {noticeReasonOptions.length > 0 && (
                <div className="mt-3">
                  <select
                    value={noticeReasonFilter}
                    onChange={(e) => setNoticeReasonFilter(e.target.value)}
                    className="w-full min-h-[38px] rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700"
                  >
                    <option value="all">{hi ? `सभी कारण-वार नोटिस (${notices.length})` : `All Reasons (${notices.length})`}</option>
                    {noticeReasonOptions.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="divide-y divide-slate-100 mt-2">
                {filteredNotices.map((n) => {
                  const nGrp = groups.find((g) => g.id === n.groupId);
                  return (
                    <div key={n.id} className="flex items-center justify-between gap-1.5 py-3">
                      <button
                        type="button"
                        onClick={() => setPreviewNoticeId(n.id)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="text-[11px] font-semibold text-teal-800 truncate">
                          {nGrp?.name || 'PHC'}
                          {n.deliveredDate && (
                            <span className="ml-1.5 text-teal-700">· ✓ {hi ? 'प्राप्त' : 'Delivered'} ({n.deliveredDate})</span>
                          )}
                        </p>
                        <p className={`text-sm font-semibold truncate ${selectedNotice?.id === n.id ? 'text-teal-900' : 'text-slate-900'}`}>
                          {hi ? n.titleHi : n.titleEn}
                        </p>
                        <p className="text-[11px] text-slate-500 tabular-nums truncate">
                          {n.dispatchNumber || n.refNumber} · {n.date} {n.reason ? `· ${n.reason}` : ''}
                        </p>
                      </button>
                      {onUpdateNotice && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateNotice({
                                ...n,
                                deliveredDate: n.deliveredDate ? undefined : today,
                              })
                            }
                            title={hi ? 'प्राप्ति दर्ज करें / हटाएं' : 'Mark Delivered'}
                            className={`flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg border ${
                              n.deliveredDate
                                ? 'border-teal-600 bg-teal-50 text-teal-800'
                                : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                            }`}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => startEditNotice(n)}
                            aria-label="Edit Notice"
                            className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => setPreviewNoticeId(n.id)}
                        aria-label="Preview & Share"
                        className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                      >
                        <Share2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteNotice(n.id)}
                        aria-label="Delete"
                        className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Official A4 Size Letterhead Print Preview with Hospital Heading, Dispatch No., Date, Reason & QR */}
          <div className="lg:col-span-7 space-y-4">
            {selectedNotice ? (
              <>
                <div className="no-print rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="mb-2 text-[11px] font-semibold text-slate-500">
                    {hi ? 'A4 साइज प्रिंट / PDF, Word, WhatsApp व SMS शेयर:' : 'A4 Print / PDF, Word, WhatsApp & SMS Share:'}
                  </p>
                  <ReportShareBar
                    lang={lang}
                    compact
                    title={hi ? selectedNotice.titleHi : selectedNotice.titleEn}
                    shareText={getNoticeShareText(selectedNotice)}
                    onDownloadPdf={() => handleDownloadNoticePdf(selectedNotice)}
                    onPrintPdf={() => window.print()}
                    onExportWord={() => handleExportNoticeWord(selectedNotice)}
                  />
                </div>

                {/* Exact A4 Paper Ratio Sheet */}
                <div className="a4-notice-sheet mx-auto flex w-full max-w-[210mm] min-h-[245mm] flex-col justify-between rounded-2xl border border-slate-300 bg-white p-8 sm:p-10 shadow-sm">
                  <div>
                    {/* Top Heading: Automatically uses Related Hospital's Name */}
                    <div className="border-b-2 border-slate-900 pb-4 text-center">
                      <p className="text-xs font-semibold text-teal-800">
                        {hi
                          ? 'चिकित्सा एवं स्वास्थ्य विभाग · Hospital Management App'
                          : 'Department of Medical & Health Services · Hospital Management App'}
                      </p>
                      <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                        {selectedNoticeGroup?.name || (hi ? 'सम्बंधित अस्पताल / PHC' : 'Related Hospital / PHC')}
                      </h2>
                      <p className="mt-0.5 text-xs font-semibold text-slate-700">
                        {hi ? 'कार्यालय चिकित्सा अधिकारी प्रभारी (MOIC)' : 'Office of Medical Officer In-Charge (MOIC)'}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {selectedNoticeGroup?.moicName || ''} {selectedNoticeGroup?.shsName ? `· ${selectedNoticeGroup.shsName}` : ''}
                      </p>
                    </div>

                    {/* Below Heading: Dispatch Number, Date & Reason-wise Header */}
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs font-mono tabular-nums text-slate-800">
                      <span>
                        <strong>{hi ? 'डिस्पैच नंबर (Dispatch No.):' : 'Dispatch No.:'}</strong>{' '}
                        {selectedNotice.dispatchNumber || selectedNotice.refNumber}
                      </span>
                      <span>
                        <strong>{hi ? 'दिनांक (Date):' : 'Date:'}</strong> {selectedNotice.date}
                      </span>
                    </div>

                    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-800 space-y-1">
                      <p>
                        <strong>{hi ? 'कारण (Reason):' : 'Reason:'}</strong>{' '}
                        {selectedNotice.reason || '-'}
                      </p>
                      <p>
                        <strong>{hi ? 'प्रति (प्रेषित):' : 'To:'}</strong>{' '}
                        {selectedNotice.targetAshaName || (hi ? 'सभी आशा कार्यकर्ता' : 'All ASHA Workers')}
                      </p>
                    </div>

                    <h3 className="mt-6 text-center text-base font-bold underline underline-offset-4 text-slate-900">
                      {hi ? selectedNotice.titleHi : selectedNotice.titleEn}
                    </h3>

                    <p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-slate-800">
                      {hi ? selectedNotice.bodyHi : selectedNotice.bodyEn}
                    </p>
                  </div>

                  {/* A4 Footer: Real Scannable ISO-18004 QR Verification + MOIC Signature */}
                  <div className="mt-12 flex items-end justify-between gap-4 border-t border-slate-200 pt-6">
                    <div className="flex items-center gap-3">
                      <svg
                        width="88"
                        height="88"
                        viewBox={`-2 -2 ${Math.max(21, qrMatrix.length) + 4} ${Math.max(21, qrMatrix.length) + 4}`}
                        shapeRendering="crispEdges"
                        className="rounded border border-slate-200 bg-white shrink-0"
                        aria-label="Scannable ISO-18004 QR Verification Code"
                      >
                        <rect
                          x={-2}
                          y={-2}
                          width={Math.max(21, qrMatrix.length) + 4}
                          height={Math.max(21, qrMatrix.length) + 4}
                          fill="#ffffff"
                        />
                        {qrMatrix.map((row, rIdx) =>
                          row.map((on, cIdx) =>
                            on ? <rect key={`${rIdx}-${cIdx}`} x={cIdx} y={rIdx} width="1" height="1" fill="#0f172a" /> : null
                          )
                        )}
                      </svg>
                      <div className="text-[11px] text-slate-500">
                        <p className="flex items-center gap-1 font-semibold text-slate-700">
                          <QrCode className="h-3.5 w-3.5" />
                          <span>{hi ? 'A4 डिजिटल QR सत्यापन' : 'A4 Digital QR Verification'}</span>
                        </p>
                        <p className="font-mono tabular-nums">{selectedNotice.dispatchNumber || selectedNotice.refNumber}</p>
                        <p>{selectedNoticeGroup?.name}</p>
                      </div>
                    </div>

                    <div className="text-right text-xs text-slate-800">
                      <p className="font-bold">{selectedNoticeGroup?.moicName || 'MOIC'}</p>
                      <p className="text-slate-600">{selectedNoticeGroup?.name}</p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
                <Bell className="mx-auto mb-2 h-6 w-6 text-slate-400" />
                {hi ? 'प्रीव्यू देखने के लिए कोई नोटिस चुनें।' : 'Select or create a notice to preview.'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
