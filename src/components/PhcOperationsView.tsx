import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  Calendar,
  Camera,
  Check,
  CheckSquare,
  ClipboardList,
  Edit3,
  FileCheck2,
  Plus,
  Trash2,
  Users,
} from 'lucide-react';
import { compressImageFile, downloadExcelCsv, downloadWordDoc, escapeHtml } from '../utils/cryptoAndExport';
import { downloadTablePdf } from '../utils/pdfGenerator';
import { ReportShareBar } from './ReportShareBar';
import type {
  AshaWorker,
  ClaimRecord,
  HeadCountEntry,
  Language,
  LeaveRecord,
  MeetingSession,
  NoticeItem,
  PhcGroup,
} from '../types/asha';

interface PhcOperationsViewProps {
  lang: Language;
  groups: PhcGroup[];
  activeGroupId: string;
  ashas: AshaWorker[];
  meetings: MeetingSession[];
  leaves: LeaveRecord[];
  claims: ClaimRecord[];
  headCounts: HeadCountEntry[];
  notices?: NoticeItem[];
  onAddMeeting: (m: MeetingSession) => void;
  onUpdateMeeting?: (m: MeetingSession) => void;
  onDeleteMeeting?: (id: string) => void;
  onToggleAttendance: (meetingId: string, ashaId: string) => void;
  onBulkMarkPresent: (meetingId: string) => void;
  onUpdateAttendanceTime: (meetingId: string, ashaId: string, field: 'inTime' | 'outTime', val: string) => void;
  onAddLeave: (l: LeaveRecord) => void;
  onUpdateLeave?: (l: LeaveRecord) => void;
  onDeleteLeave: (id: string) => void;
  onAddBulkClaims: (claims: ClaimRecord[]) => void;
  onUpdateClaim?: (c: ClaimRecord) => void;
  onCycleClaimStatus: (id: string) => void;
  onDeleteClaim: (id: string) => void;
  onAddHeadCount: (hc: HeadCountEntry) => void;
  onUpdateHeadCount?: (hc: HeadCountEntry) => void;
  onDeleteHeadCount?: (id: string) => void;
  onOpenAshaReport?: (ashaId: string) => void;
}

export const PhcOperationsView: React.FC<PhcOperationsViewProps> = ({
  lang,
  groups,
  activeGroupId,
  ashas,
  meetings,
  leaves,
  claims,
  headCounts,
  notices = [],
  onAddMeeting,
  onUpdateMeeting,
  onDeleteMeeting,
  onToggleAttendance,
  onBulkMarkPresent,
  onUpdateAttendanceTime,
  onAddLeave,
  onUpdateLeave,
  onDeleteLeave,
  onAddBulkClaims,
  onUpdateClaim,
  onCycleClaimStatus,
  onDeleteClaim,
  onAddHeadCount,
  onUpdateHeadCount,
  onDeleteHeadCount,
  onOpenAshaReport,
}) => {
  const hi = lang === 'hi';
  const [subTab, setSubTab] = useState<'meetings' | 'leaves' | 'claims' | 'headcount' | 'hospital_report'>('meetings');
  const [opsGroupId, setOpsGroupId] = useState<string>(activeGroupId || groups[0]?.id || 'all');

  useEffect(() => {
    setOpsGroupId(activeGroupId || 'all');
  }, [activeGroupId]);

  const currentGroup =
    groups.find((g) => g.id === (opsGroupId === 'all' ? groups[0]?.id : opsGroupId)) || groups[0];

  const scopedAshas = useMemo(
    () => (opsGroupId === 'all' ? ashas : ashas.filter((a) => a.groupId === opsGroupId)),
    [ashas, opsGroupId]
  );
  const scopedMeetings = useMemo(
    () => (opsGroupId === 'all' ? meetings : meetings.filter((m) => m.groupId === opsGroupId)),
    [meetings, opsGroupId]
  );
  const scopedLeaves = useMemo(
    () => (opsGroupId === 'all' ? leaves : leaves.filter((l) => l.groupId === opsGroupId)),
    [leaves, opsGroupId]
  );
  const scopedClaims = useMemo(
    () => (opsGroupId === 'all' ? claims : claims.filter((c) => c.groupId === opsGroupId)),
    [claims, opsGroupId]
  );
  const scopedHeadCounts = useMemo(
    () => (opsGroupId === 'all' ? headCounts : headCounts.filter((hc) => hc.groupId === opsGroupId)),
    [headCounts, opsGroupId]
  );

  // Meeting state
  const [editingMeetingId, setEditingMeetingId] = useState<string | null>(null);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingType, setMeetingType] = useState<'sector_meeting' | 'training'>('sector_meeting');
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>(meetings[0]?.id || '');

  // Leave state
  const leavePhotoRef = useRef<HTMLInputElement>(null);
  const [editingLeaveId, setEditingLeaveId] = useState<string | null>(null);
  const [leaveAshaId, setLeaveAshaId] = useState(scopedAshas[0]?.id || '');
  const [leaveFrom, setLeaveFrom] = useState(new Date().toISOString().slice(0, 10));
  const [leaveTo, setLeaveTo] = useState(new Date().toISOString().slice(0, 10));
  const [leaveReason, setLeaveReason] = useState('');
  const [leavePhoto, setLeavePhoto] = useState<string | undefined>(undefined);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  // Claims Voucher state (no amount — records who submitted voucher and when)
  const [editingClaimId, setEditingClaimId] = useState<string | null>(null);
  const [claimAshaId, setClaimAshaId] = useState<string>('all');
  const [claimMonth, setClaimMonth] = useState(new Date().toISOString().slice(0, 7));
  const [claimDate, setClaimDate] = useState(new Date().toISOString().slice(0, 10));
  const [claimVoucherNo, setClaimVoucherNo] = useState('');
  const [claimNotice, setClaimNotice] = useState<string | null>(null);

  // Head Count state (per ASHA worker with Pregnant, Dhatri, and 0-1, 1-2, 2-3, 5, 10, 16 yrs columns)
  const [editingHcId, setEditingHcId] = useState<string | null>(null);
  const [hcAshaId, setHcAshaId] = useState(scopedAshas[0]?.id || '');
  const [hcSubCenter, setHcSubCenter] = useState(
    scopedAshas[0]?.subCenter || currentGroup?.subCenters[0] || ''
  );
  const [hcTarget, setHcTarget] = useState(String(scopedAshas[0]?.population || 1100));
  const [hcSurveyed, setHcSurveyed] = useState(String(Math.max(0, (scopedAshas[0]?.population || 1100) - 40)));
  const [hcCouples, setHcCouples] = useState('180');
  const [hcPregnant, setHcPregnant] = useState('22');
  const [hcLactating, setHcLactating] = useState('18');
  const [hc0To1, setHc0To1] = useState('26');
  const [hc1To2, setHc1To2] = useState('24');
  const [hc2To3, setHc2To3] = useState('22');
  const [hc5Yr, setHc5Yr] = useState('20');
  const [hc10Yr, setHc10Yr] = useState('23');
  const [hc16Yr, setHc16Yr] = useState('19');

  // Keep selected ASHA/Meeting synced cleanly when hospital scope changes
  useEffect(() => {
    if (!scopedAshas.some((a) => a.id === leaveAshaId)) {
      setLeaveAshaId(scopedAshas[0]?.id || '');
    }
    if (!scopedAshas.some((a) => a.id === hcAshaId)) {
      const nextAsha = scopedAshas[0];
      setHcAshaId(nextAsha?.id || '');
      if (nextAsha) {
        setHcSubCenter(nextAsha.subCenter);
        setHcTarget(String(nextAsha.population || 1000));
        setHcSurveyed(String(Math.max(0, (nextAsha.population || 1000) - 35)));
      }
    }
    if (claimAshaId !== 'all' && !scopedAshas.some((a) => a.id === claimAshaId)) {
      setClaimAshaId('all');
    }
    if (!scopedMeetings.some((m) => m.id === selectedMeetingId)) {
      setSelectedMeetingId(scopedMeetings[0]?.id || '');
    }
  }, [opsGroupId, scopedAshas, scopedMeetings, leaveAshaId, hcAshaId, claimAshaId, selectedMeetingId]);

  const activeMeeting =
    scopedMeetings.find((m) => m.id === selectedMeetingId) || scopedMeetings[0] || null;

  const startEditMeeting = (m: MeetingSession) => {
    setEditingMeetingId(m.id);
    setMeetingTitle(m.title);
    setMeetingType(m.type);
    setMeetingDate(m.date);
  };

  const handleCreateMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingTitle.trim() || !currentGroup) return;

    if (editingMeetingId && onUpdateMeeting) {
      const existing = meetings.find((m) => m.id === editingMeetingId);
      if (existing) {
        onUpdateMeeting({
          ...existing,
          title: meetingTitle.trim(),
          type: meetingType,
          date: meetingDate,
        });
        setEditingMeetingId(null);
        setMeetingTitle('');
        return;
      }
    }

    const targetAshas = ashas.filter((a) => a.groupId === currentGroup.id);
    const created: MeetingSession = {
      id: `mtg-${Date.now()}`,
      groupId: currentGroup.id,
      title: meetingTitle.trim(),
      type: meetingType,
      date: meetingDate,
      venue: currentGroup.name,
      attendance: targetAshas.map((a) => ({
        ashaId: a.id,
        present: false,
        inTime: '10:00',
        outTime: '14:00',
      })),
    };
    onAddMeeting(created);
    setSelectedMeetingId(created.id);
    setMeetingTitle('');
  };

  const isLeaveDateInvalid = Boolean(leaveFrom && leaveTo && new Date(leaveTo) < new Date(leaveFrom));

  const computeLeaveDays = (from: string, to: string) => {
    const d1 = new Date(from);
    const d2 = new Date(to);
    if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime())) return 1;
    if (d2 < d1) return 0;
    const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diff);
  };

  const startEditLeave = (l: LeaveRecord) => {
    setEditingLeaveId(l.id);
    setLeaveAshaId(l.ashaId);
    setLeaveFrom(l.fromDate);
    setLeaveTo(l.toDate);
    setLeaveReason(l.reason);
    setLeavePhoto(l.photoDataUrl);
    setLeaveError(null);
  };

  const handleSaveLeave = (e: React.FormEvent) => {
    e.preventDefault();
    setLeaveError(null);
    if (isLeaveDateInvalid) {
      setLeaveError(
        hi
          ? 'त्रुटि: "कब तक" की तारीख "कब से" से पहले नहीं हो सकती।'
          : 'Invalid dates: "To" date cannot be earlier than "From" date.'
      );
      return;
    }
    const worker = scopedAshas.find((a) => a.id === leaveAshaId);
    if (!worker) {
      setLeaveError(hi ? 'कृपया सही आशा कार्यकर्ता चुनें।' : 'Please select a valid ASHA worker.');
      return;
    }
    const grp = groups.find((g) => g.id === worker.groupId) || currentGroup;
    const limit = grp?.annualLeaveLimit || 12;
    const year = new Date(leaveFrom).getFullYear();
    const days = computeLeaveDays(leaveFrom, leaveTo);
    const usedSoFar = leaves
      .filter((l) => l.ashaId === worker.id && l.year === year && l.id !== editingLeaveId)
      .reduce((sum, l) => sum + l.days, 0);

    if (usedSoFar + days > limit) {
      setLeaveError(
        hi
          ? `सालाना सीमा रोक: ${worker.name} पहले ही ${usedSoFar}/${limit} दिन की छुट्टी ले चुकी हैं।`
          : `Annual Limit Block: ${worker.name} has already used ${usedSoFar}/${limit} leave days.`
      );
      return;
    }

    if (editingLeaveId && onUpdateLeave) {
      const existing = leaves.find((l) => l.id === editingLeaveId);
      onUpdateLeave({
        id: editingLeaveId,
        groupId: worker.groupId,
        ashaId: worker.id,
        ashaName: worker.name,
        fromDate: leaveFrom,
        toDate: leaveTo,
        days,
        reason: leaveReason.trim() || (hi ? 'आकस्मिक अवकाश' : 'Casual Leave'),
        photoDataUrl: leavePhoto,
        year,
        createdAt: existing?.createdAt || new Date().toISOString(),
      });
      setEditingLeaveId(null);
    } else {
      onAddLeave({
        id: `lv-${Date.now()}`,
        groupId: worker.groupId,
        ashaId: worker.id,
        ashaName: worker.name,
        fromDate: leaveFrom,
        toDate: leaveTo,
        days,
        reason: leaveReason.trim() || (hi ? 'आकस्मिक अवकाश' : 'Casual Leave'),
        photoDataUrl: leavePhoto,
        year,
        createdAt: new Date().toISOString(),
      });
    }
    setLeaveReason('');
    setLeavePhoto(undefined);
  };

  const startEditClaim = (c: ClaimRecord) => {
    setEditingClaimId(c.id);
    setClaimAshaId(c.ashaId);
    setClaimMonth(c.month);
    setClaimDate(c.submittedDate);
    setClaimVoucherNo(c.voucherNo || '');
    setClaimNotice(null);
  };

  const handleSubmitClaimVoucher = () => {
    setClaimNotice(null);
    const dayNum = Number(claimDate.split('-')[2] || 1);
    const cleanVoucherNo = claimVoucherNo.trim();

    if (editingClaimId && onUpdateClaim) {
      const existing = claims.find((c) => c.id === editingClaimId);
      if (existing) {
        const duplicateOther = claims.some(
          (c) => c.id !== editingClaimId && c.ashaId === existing.ashaId && c.month === claimMonth
        );
        if (duplicateOther) {
          setClaimNotice(
            hi
              ? `डुप्लिकेट रोक: ${claimMonth} माह का वाउचर ${existing.ashaName} के लिए पहले से दर्ज है।`
              : `Duplicate guard: Voucher for ${claimMonth} already exists for ${existing.ashaName}.`
          );
          return;
        }
        const grp = groups.find((g) => g.id === existing.groupId) || currentGroup;
        const dueDay = grp?.claimDueDay || 5;
        onUpdateClaim({
          ...existing,
          month: claimMonth,
          submittedDate: claimDate,
          voucherNo: cleanVoucherNo || undefined,
          isDelayed: dayNum > dueDay,
        });
        setEditingClaimId(null);
        setClaimAshaId('all');
        setClaimVoucherNo('');
        return;
      }
    }

    const targetAshas =
      claimAshaId === 'all'
        ? scopedAshas
        : scopedAshas.filter((a) => a.id === claimAshaId);
    if (targetAshas.length === 0) return;

    const freshAshas = targetAshas.filter(
      (a) => !claims.some((c) => c.ashaId === a.id && c.month === claimMonth)
    );
    const skippedCount = targetAshas.length - freshAshas.length;

    if (freshAshas.length === 0) {
      setClaimNotice(
        hi
          ? `डुप्लिकेट रोक: ${claimMonth} माह का वाउचर चुनी गई आशा के लिए पहले से दर्ज है।`
          : `Duplicate guard: Voucher for ${claimMonth} is already recorded for selected ASHA(s).`
      );
      return;
    }

    const batch: ClaimRecord[] = freshAshas.map((a, idx) => {
      const grp = groups.find((g) => g.id === a.groupId) || currentGroup;
      const dueDay = grp?.claimDueDay || 5;
      return {
        id: `clm-${Date.now()}-${a.id}`,
        groupId: a.groupId,
        ashaId: a.id,
        ashaName: a.name,
        month: claimMonth,
        submittedDate: claimDate,
        voucherNo: cleanVoucherNo
          ? freshAshas.length > 1
            ? `${cleanVoucherNo}-${idx + 1}`
            : cleanVoucherNo
          : undefined,
        isDelayed: dayNum > dueDay,
        status: 'submitted',
      };
    });
    onAddBulkClaims(batch);
    setClaimVoucherNo('');
    if (skippedCount > 0) {
      setClaimNotice(
        hi
          ? `${freshAshas.length} नए वाउचर दर्ज हुए (${skippedCount} पहले से ${claimMonth} के लिए दर्ज थे)।`
          : `Added ${freshAshas.length} vouchers (${skippedCount} already logged for ${claimMonth}).`
      );
    }
  };

  const getAge10Count = (hc: HeadCountEntry) =>
    hc.children10Yr ?? Math.round((hc.children10And16Yr ?? 0) / 2);
  const getAge16Count = (hc: HeadCountEntry) =>
    hc.children16Yr ?? Math.max(0, (hc.children10And16Yr ?? 0) - Math.round((hc.children10And16Yr ?? 0) / 2));

  const startEditHeadCount = (hc: HeadCountEntry) => {
    setEditingHcId(hc.id);
    setHcAshaId(hc.ashaId || scopedAshas[0]?.id || '');
    setHcSubCenter(hc.subCenter);
    setHcTarget(String(hc.targetPopulation));
    setHcSurveyed(String(hc.surveyedPopulation));
    setHcCouples(String(hc.eligibleCouples));
    setHcPregnant(String(hc.pregnantWomen));
    setHcLactating(String(hc.lactatingMothers ?? 0));
    setHc0To1(String(hc.children0To1 ?? 0));
    setHc1To2(String(hc.children1To2 ?? 0));
    setHc2To3(String(hc.children2To3 ?? 0));
    setHc5Yr(String(hc.children5Yr ?? 0));
    setHc10Yr(String(getAge10Count(hc)));
    setHc16Yr(String(getAge16Count(hc)));
  };

  const handleSaveHeadCount = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedAsha = scopedAshas.find((a) => a.id === hcAshaId) || scopedAshas[0];
    const resolvedGroupId = selectedAsha?.groupId || currentGroup?.id || 'phc-som';
    const c01 = Math.max(0, Number(hc0To1) || 0);
    const c12 = Math.max(0, Number(hc1To2) || 0);
    const c23 = Math.max(0, Number(hc2To3) || 0);
    const c5 = Math.max(0, Number(hc5Yr) || 0);
    const c10 = Math.max(0, Number(hc10Yr) || 0);
    const c16 = Math.max(0, Number(hc16Yr) || 0);
    const payload: HeadCountEntry = {
      id: editingHcId || `hc-${Date.now()}`,
      groupId: resolvedGroupId,
      ashaId: selectedAsha?.id,
      ashaName: selectedAsha?.name || (hi ? 'अन्य' : 'General'),
      subCenter: hcSubCenter || selectedAsha?.subCenter || currentGroup?.subCenters[0] || 'SC',
      targetPopulation: Math.max(1, Number(hcTarget) || 1),
      surveyedPopulation: Math.max(0, Number(hcSurveyed) || 0),
      eligibleCouples: Math.max(0, Number(hcCouples) || 0),
      pregnantWomen: Math.max(0, Number(hcPregnant) || 0),
      lactatingMothers: Math.max(0, Number(hcLactating) || 0),
      children0To1: c01,
      children1To2: c12,
      children2To3: c23,
      children5Yr: c5,
      children10Yr: c10,
      children16Yr: c16,
      children10And16Yr: c10 + c16,
      childrenUnder5: c01 + c12 + c23 + c5,
      surveyDate: new Date().toISOString().slice(0, 10),
    };
    if (editingHcId && onUpdateHeadCount) {
      onUpdateHeadCount(payload);
      setEditingHcId(null);
    } else {
      onAddHeadCount(payload);
    }
  };

  const headCountTotals = useMemo(() => {
    return scopedHeadCounts.reduce(
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
        children10Yr: acc.children10Yr + getAge10Count(hc),
        children16Yr: acc.children16Yr + getAge16Count(hc),
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
    );
  }, [scopedHeadCounts]);

  const handleExportHeadCountCsv = () => {
    const headers = [
      'ASHA Worker',
      'Sub-Center',
      'Date',
      'Target Pop',
      'Surveyed Pop',
      'Coverage %',
      'Eligible Couples',
      'Pregnant Women',
      'Dhatri (Lactating Mothers)',
      '0-1 Yr',
      '1-2 Yr',
      '2-3 Yr',
      '5 Yr',
      '10 Yr',
      '16 Yr',
    ];
    const rows = scopedHeadCounts.map((hc) => {
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
        getAge10Count(hc),
        getAge16Count(hc),
      ];
    });
    const totalPct = Math.round(
      (headCountTotals.surveyedPopulation / Math.max(1, headCountTotals.targetPopulation)) * 100
    );
    rows.push([
      'TOTAL (कुल योग)',
      `${scopedHeadCounts.length} entries`,
      new Date().toISOString().slice(0, 10),
      headCountTotals.targetPopulation,
      headCountTotals.surveyedPopulation,
      `${totalPct}%`,
      headCountTotals.eligibleCouples,
      headCountTotals.pregnantWomen,
      headCountTotals.lactatingMothers,
      headCountTotals.children0To1,
      headCountTotals.children1To2,
      headCountTotals.children2To3,
      headCountTotals.children5Yr,
      headCountTotals.children10Yr,
      headCountTotals.children16Yr,
    ]);
    downloadExcelCsv(`HeadCountSurvey_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  const handleExportHeadCountWord = () => {
    const rowsHtml = scopedHeadCounts
      .map((hc) => {
        const pct = Math.round((hc.surveyedPopulation / Math.max(1, hc.targetPopulation)) * 100);
        return `<tr><td>${escapeHtml(hc.ashaName || '-')}</td><td>${escapeHtml(hc.subCenter)}</td><td>${hc.targetPopulation}</td><td>${hc.surveyedPopulation} (${pct}%)</td><td>${hc.eligibleCouples}</td><td>${hc.pregnantWomen}</td><td>${hc.lactatingMothers ?? 0}</td><td>${hc.children0To1 ?? 0}</td><td>${hc.children1To2 ?? 0}</td><td>${hc.children2To3 ?? 0}</td><td>${hc.children5Yr ?? 0}</td><td>${getAge10Count(hc)}</td><td>${getAge16Count(hc)}</td></tr>`;
      })
      .join('');
    const totalPct = Math.round(
      (headCountTotals.surveyedPopulation / Math.max(1, headCountTotals.targetPopulation)) * 100
    );
    const totalRowHtml = `<tr style="font-weight:bold;background:#f0fdfa"><td>कुल योग (TOTAL)</td><td>${scopedHeadCounts.length}</td><td>${headCountTotals.targetPopulation}</td><td>${headCountTotals.surveyedPopulation} (${totalPct}%)</td><td>${headCountTotals.eligibleCouples}</td><td>${headCountTotals.pregnantWomen}</td><td>${headCountTotals.lactatingMothers}</td><td>${headCountTotals.children0To1}</td><td>${headCountTotals.children1To2}</td><td>${headCountTotals.children2To3}</td><td>${headCountTotals.children5Yr}</td><td>${headCountTotals.children10Yr}</td><td>${headCountTotals.children16Yr}</td></tr>`;
    downloadWordDoc(
      `HeadCountSurvey_${new Date().toISOString().slice(0, 10)}.doc`,
      'Hospital Management App - Head Count Survey',
      `<h2>Hospital Management App — आशा-वार हेड काउंट सर्वे</h2><table><thead><tr><th>ASHA Worker</th><th>Sub-Center</th><th>Target</th><th>Surveyed</th><th>Couples</th><th>Pregnant</th><th>Dhatri (Lactating)</th><th>0-1 Yr</th><th>1-2 Yr</th><th>2-3 Yr</th><th>5 Yr</th><th>10 Yr</th><th>16 Yr</th></tr></thead><tbody>${rowsHtml}${totalRowHtml}</tbody></table>`
    );
  };

  const headCountShareText = useMemo(() => {
    const lines = scopedHeadCounts.map((hc) => {
      const pct = Math.round((hc.surveyedPopulation / Math.max(1, hc.targetPopulation)) * 100);
      return `• ${hc.ashaName || hc.subCenter} (${hc.subCenter}, ${pct}%): गर्भवती:${hc.pregnantWomen}, धात्री:${hc.lactatingMothers ?? 0} | 0-1y:${hc.children0To1 ?? 0}, 1-2y:${hc.children1To2 ?? 0}, 2-3y:${hc.children2To3 ?? 0}, 5y:${hc.children5Yr ?? 0}, 10y:${getAge10Count(hc)}, 16y:${getAge16Count(hc)}`;
    });
    const totalLine = `\n*कुल योग:* गर्भवती:${headCountTotals.pregnantWomen}, धात्री:${headCountTotals.lactatingMothers} | 0-1y:${headCountTotals.children0To1}, 1-2y:${headCountTotals.children1To2}, 2-3y:${headCountTotals.children2To3}, 5y:${headCountTotals.children5Yr}, 10y:${headCountTotals.children10Yr}, 16y:${headCountTotals.children16Yr}`;
    return `*Hospital Management App — ASHA Head Count Survey*\n${lines.join('\n') || 'No entries'}${scopedHeadCounts.length > 0 ? totalLine : ''}`;
  }, [scopedHeadCounts, headCountTotals]);

  // Hospital-Wise ASHA Complete Matrix inside Operations
  const hospitalAshaRows = useMemo(() => {
    return scopedAshas.map((a) => {
      const grpName = a.hospitalName || groups.find((g) => g.id === a.groupId)?.name || '-';
      const relMeetings = meetings.filter(
        (m) => m.groupId === a.groupId || m.attendance.some((e) => e.ashaId === a.id)
      );
      const presentMeetings = relMeetings.filter((m) =>
        m.attendance.some((e) => e.ashaId === a.id && e.present)
      ).length;
      const noticesCount = notices.filter(
        (n) =>
          n.targetAshaId === a.id ||
          ((!n.targetAshaId || n.targetAshaId === 'all') && n.groupId === a.groupId)
      ).length;
      const leaveDays = leaves
        .filter((l) => l.ashaId === a.id)
        .reduce((s, l) => s + l.days, 0);
      const ashaClaims = claims.filter((c) => c.ashaId === a.id);
      const latestClaimDate = ashaClaims[0]?.submittedDate || '-';
      const delayedClaimsCount = ashaClaims.filter((c) => c.isDelayed).length;
      const latestHc = headCounts.find((hc) => hc.ashaId === a.id);
      return {
        asha: a,
        hospitalName: grpName,
        presentMeetings,
        totalMeetings: relMeetings.length,
        noticesCount,
        leaveDays,
        latestClaimDate,
        claimsCount: ashaClaims.length,
        delayedClaimsCount,
        pregnant: latestHc?.pregnantWomen ?? 0,
        dhatri: latestHc?.lactatingMothers ?? 0,
      };
    });
  }, [scopedAshas, groups, meetings, notices, leaves, claims, headCounts]);

  const opsHospitalLabel =
    opsGroupId === 'all'
      ? hi
        ? 'सभी अस्पताल समूह'
        : 'All Hospitals'
      : groups.find((g) => g.id === opsGroupId)?.name || currentGroup?.name || '-';

  const handleExportHospitalOpsCsv = () => {
    const headers = [
      'Hospital Name',
      'ASHA Name',
      'Phone',
      'Sub-Center',
      'AWC Name',
      'Meetings Present',
      'Total Meetings',
      'Notices Received',
      'Leave Days',
      'Claim Vouchers',
      'Latest Voucher Submitted Date',
      'Pregnant Women',
      'Dhatri (Lactating)',
    ];
    const rows = hospitalAshaRows.map((r) => [
      r.hospitalName,
      r.asha.name,
      r.asha.phone,
      r.asha.subCenter,
      r.asha.awcName || '-',
      r.presentMeetings,
      r.totalMeetings,
      r.noticesCount,
      r.leaveDays,
      r.claimsCount,
      r.latestClaimDate,
      r.pregnant,
      r.dhatri,
    ]);
    downloadExcelCsv(`Hospital_ASHA_Report_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  const handleExportHospitalOpsWord = () => {
    const rowsHtml = hospitalAshaRows
      .map(
        (r) =>
          `<tr><td>${escapeHtml(r.hospitalName)}</td><td>${escapeHtml(r.asha.name)} (${escapeHtml(r.asha.phone || '-')})</td><td>${escapeHtml(r.asha.subCenter)}</td><td>${r.presentMeetings}/${r.totalMeetings}</td><td>${r.noticesCount}</td><td>${r.leaveDays}</td><td>${escapeHtml(r.latestClaimDate)} (${r.claimsCount})</td><td>${r.pregnant}</td><td>${r.dhatri}</td></tr>`
      )
      .join('');
    downloadWordDoc(
      `Hospital_ASHA_Report_${new Date().toISOString().slice(0, 10)}.doc`,
      `Hospital-Wise ASHA Report - ${opsHospitalLabel}`,
      `<h2>Hospital Management App — अस्पताल-वार आशा रिपोर्ट (${escapeHtml(opsHospitalLabel)})</h2><table><thead><tr><th>Hospital</th><th>ASHA</th><th>Sub-Center</th><th>Meetings</th><th>Notices</th><th>Leaves</th><th>Voucher Date</th><th>Pregnant</th><th>Dhatri</th></tr></thead><tbody>${rowsHtml}</tbody></table>`
    );
  };

  const hospitalOpsShareText = useMemo(() => {
    const lines = hospitalAshaRows
      .slice(0, 12)
      .map(
        (r, idx) =>
          `${idx + 1}. *${r.asha.name}* (${r.asha.subCenter}) — बैठक:${r.presentMeetings}/${r.totalMeetings}, नोटिस:${r.noticesCount}, छुट्टी:${r.leaveDays}d, वाउचर जमा:${r.latestClaimDate}, गर्भवती:${r.pregnant}, धात्री:${r.dhatri}`
      );
    return `*Hospital Management App — ${opsHospitalLabel}*\nकुल आशा: ${hospitalAshaRows.length}\n${lines.join('\n')}`;
  }, [hospitalAshaRows, opsHospitalLabel]);

  return (
    <div className="space-y-5">
      {/* Top Hospital Filter + Operations Subtabs */}
      <div className="no-print flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1">
          {(
            [
              { id: 'meetings', label: hi ? 'बैठक व उपस्थिति' : 'Meetings & Attendance' },
              { id: 'leaves', label: hi ? 'छुट्टी व सीमा' : 'Leaves & Limit' },
              { id: 'claims', label: hi ? 'क्लेम वाउचर व तिथि' : 'Claim Vouchers' },
              { id: 'headcount', label: hi ? 'हेड काउंट (गर्भवती/धात्री)' : 'Head Count (PW/Dhatri)' },
              { id: 'hospital_report', label: hi ? 'अस्पताल-वार आशा रिपोर्ट' : 'Hospital-Wise ASHA Report' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id)}
              className={`min-h-[40px] rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                subTab === tab.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Building2 className="h-4 w-4 text-teal-700 shrink-0" />
          <select
            value={opsGroupId}
            onChange={(e) => setOpsGroupId(e.target.value)}
            aria-label={hi ? 'अस्पताल चुनें' : 'Select Hospital'}
            className="min-h-[40px] rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800"
          >
            <option value="all">{hi ? 'सभी अस्पताल समूह' : 'All Hospitals'}</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* SUBTAB 1: MEETINGS & BULK ATTENDANCE */}
      {subTab === 'meetings' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="no-print space-y-4 lg:col-span-4">
            <form onSubmit={handleCreateMeeting} className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  {editingMeetingId
                    ? hi ? 'बैठक संपादित करें' : 'Edit Meeting'
                    : hi ? 'बैठक / ट्रेनिंग बनाएं' : 'Create Meeting / Training'}
                </h3>
                {editingMeetingId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingMeetingId(null);
                      setMeetingTitle('');
                    }}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-900"
                  >
                    {hi ? 'रद्द' : 'Cancel'}
                  </button>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {hi ? 'विषय / शीर्षक' : 'Session Title'}
                </label>
                <input
                  required
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  placeholder={hi ? 'सेक्टर बैठक' : 'Sector Meeting'}
                  className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={meetingType}
                  onChange={(e) => setMeetingType(e.target.value as 'sector_meeting' | 'training')}
                  className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold"
                >
                  <option value="sector_meeting">{hi ? 'सेक्टर बैठक' : 'Sector Meeting'}</option>
                  <option value="training">{hi ? 'ट्रेनिंग' : 'Training'}</option>
                </select>
                <input
                  type="date"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                  className="min-h-[44px] rounded-xl border border-slate-200 px-2.5 text-xs tabular-nums"
                />
              </div>
              <button
                type="submit"
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800"
              >
                <Plus className="h-4 w-4" />
                <span>
                  {editingMeetingId
                    ? hi ? 'बैठक अपडेट करें' : 'Update Session'
                    : hi ? 'सत्र जोड़ें' : 'Create Session'}
                </span>
              </button>
            </form>

            <div className="rounded-2xl border border-slate-200 bg-white p-3 divide-y divide-slate-100">
              {scopedMeetings.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMeetingId(m.id)}
                  className={`flex min-h-[48px] w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left transition-colors ${
                    activeMeeting?.id === m.id ? 'bg-teal-50 text-teal-900' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">{m.title}</p>
                    <p className="text-[11px] text-slate-500 tabular-nums">{m.date}</p>
                  </div>
                  <span className="text-xs font-semibold tabular-nums text-teal-700">
                    {m.attendance.filter((a) => a.present).length}/{m.attendance.length}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-8">
            {activeMeeting ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{activeMeeting.title}</h3>
                    <p className="text-xs text-slate-500 tabular-nums">
                      {activeMeeting.date} · {activeMeeting.attendance.filter((a) => a.present).length}/
                      {activeMeeting.attendance.length} {hi ? 'उपस्थित' : 'Present'}
                    </p>
                  </div>
                  <div className="no-print flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onBulkMarkPresent(activeMeeting.id)}
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap"
                    >
                      <CheckSquare className="h-4 w-4" />
                      <span>{hi ? 'सभी को उपस्थित (Bulk) करें' : 'Mark All Present (Bulk)'}</span>
                    </button>
                    {onUpdateMeeting && (
                      <button
                        type="button"
                        onClick={() => startEditMeeting(activeMeeting)}
                        aria-label="Edit Meeting"
                        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                    )}
                    {onDeleteMeeting && (
                      <button
                        type="button"
                        onClick={() => onDeleteMeeting(activeMeeting.id)}
                        aria-label="Delete Meeting"
                        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-rose-50 hover:text-rose-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="no-print py-3 border-b border-slate-100">
                  <ReportShareBar
                    lang={lang}
                    compact
                    title={activeMeeting.title}
                    shareText={`*Hospital Management App*\n${activeMeeting.title} (${activeMeeting.date})\nउपस्थित: ${activeMeeting.attendance.filter((a) => a.present).length}/${activeMeeting.attendance.length}`}
                    onDownloadPdf={() =>
                      downloadTablePdf({
                        filename: `Meeting_${activeMeeting.date}.pdf`,
                        title: activeMeeting.title,
                        subtitle: `${activeMeeting.date} · ${activeMeeting.venue}`,
                        headers: ['आशा', 'उप-केंद्र', 'स्थिति', 'समय'],
                        rows: activeMeeting.attendance.map((entry) => {
                          const a = ashas.find((w) => w.id === entry.ashaId);
                          return [
                            a?.name || entry.ashaId,
                            a?.subCenter || '-',
                            entry.present ? 'उपस्थित' : 'अनुपस्थित',
                            `${entry.inTime} - ${entry.outTime}`,
                          ];
                        }),
                      })
                    }
                    onPrintPdf={() => window.print()}
                    onExportExcel={() => {
                      const headers = ['ASHA', 'Sub-Center', 'Present', 'In Time', 'Out Time'];
                      const rows = activeMeeting.attendance.map((entry) => {
                        const a = ashas.find((w) => w.id === entry.ashaId);
                        return [a?.name || entry.ashaId, a?.subCenter || '-', entry.present ? 'Present' : 'Absent', entry.inTime, entry.outTime];
                      });
                      downloadExcelCsv(`Meeting_${activeMeeting.date}.csv`, headers, rows);
                    }}
                    onExportWord={() => {
                      const rows = activeMeeting.attendance
                        .map((entry) => {
                          const a = ashas.find((w) => w.id === entry.ashaId);
                          return `<tr><td>${escapeHtml(a?.name || entry.ashaId)}</td><td>${escapeHtml(a?.subCenter || '-')}</td><td>${entry.present ? 'Present' : 'Absent'}</td><td>${escapeHtml(entry.inTime)} - ${escapeHtml(entry.outTime)}</td></tr>`;
                        })
                        .join('');
                      downloadWordDoc(`Meeting_${activeMeeting.date}.doc`, activeMeeting.title, `<h2>${escapeHtml(activeMeeting.title)} (${escapeHtml(activeMeeting.date)})</h2><table><thead><tr><th>ASHA</th><th>Sub-Center</th><th>Status</th><th>Time</th></tr></thead><tbody>${rows}</tbody></table>`);
                    }}
                  />
                </div>

                <div className="divide-y divide-slate-100">
                  {activeMeeting.attendance.map((entry) => {
                    const asha = ashas.find((a) => a.id === entry.ashaId);
                    if (!asha) return null;
                    return (
                      <div key={entry.ashaId} className="flex flex-wrap items-center justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900">{asha.name}</p>
                          <p className="text-xs text-slate-500">{asha.subCenter}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            value={entry.inTime}
                            onChange={(e) =>
                              onUpdateAttendanceTime(activeMeeting.id, entry.ashaId, 'inTime', e.target.value)
                            }
                            aria-label="In time"
                            className="min-h-[40px] rounded-lg border border-slate-200 px-2 text-xs font-mono tabular-nums"
                          />
                          <input
                            type="time"
                            value={entry.outTime}
                            onChange={(e) =>
                              onUpdateAttendanceTime(activeMeeting.id, entry.ashaId, 'outTime', e.target.value)
                            }
                            aria-label="Out time"
                            className="min-h-[40px] rounded-lg border border-slate-200 px-2 text-xs font-mono tabular-nums"
                          />
                          <button
                            type="button"
                            onClick={() => onToggleAttendance(activeMeeting.id, entry.ashaId)}
                            className={`inline-flex min-h-[40px] items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold whitespace-nowrap ${
                              entry.present
                                ? 'border-teal-700 bg-teal-50 text-teal-900'
                                : 'border-slate-200 bg-white text-slate-600'
                            }`}
                          >
                            {entry.present && <Check className="h-3.5 w-3.5" />}
                            <span>{entry.present ? (hi ? 'उपस्थित' : 'Present') : (hi ? 'अनुपस्थित' : 'Absent')}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="py-10 text-center text-sm text-slate-500">
                <Calendar className="mx-auto mb-2 h-6 w-6 text-slate-400" />
                {hi ? 'बाएँ फ़ॉर्म से बैठक जोड़ें।' : 'Create a meeting session from the left form.'}
              </p>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 2: LEAVES WITH LIMIT ENFORCEMENT */}
      {subTab === 'leaves' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <form onSubmit={handleSaveLeave} className="no-print rounded-2xl border border-slate-200 bg-white p-5 space-y-3 lg:col-span-5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-bold text-slate-900">
                {editingLeaveId
                  ? hi ? 'छुट्टी संपादित करें' : 'Edit Leave Record'
                  : hi ? 'छुट्टी दर्ज करें (सालाना सीमा जांच सहित)' : 'Log Leave (With Annual Limit Check)'}
              </h3>
              {editingLeaveId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingLeaveId(null);
                    setLeaveReason('');
                    setLeavePhoto(undefined);
                    setLeaveError(null);
                  }}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-900"
                >
                  {hi ? 'रद्द करें' : 'Cancel'}
                </button>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                {hi ? 'आशा चुनें' : 'Select ASHA'}
              </label>
              <select
                value={leaveAshaId}
                onChange={(e) => setLeaveAshaId(e.target.value)}
                className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                {scopedAshas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.subCenter})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">{hi ? 'कब से' : 'From'}</label>
                <input
                  type="date"
                  value={leaveFrom}
                  onChange={(e) => {
                    setLeaveFrom(e.target.value);
                    setLeaveError(null);
                  }}
                  className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-200 px-3 py-2 text-xs tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">{hi ? 'कब तक' : 'To'}</label>
                <input
                  type="date"
                  value={leaveTo}
                  onChange={(e) => {
                    setLeaveTo(e.target.value);
                    setLeaveError(null);
                  }}
                  className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-200 px-3 py-2 text-xs tabular-nums"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">{hi ? 'कारण' : 'Reason'}</label>
              <input
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => leavePhotoRef.current?.click()}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                <Camera className="h-4 w-4" />
                <span>{leavePhoto ? (hi ? 'फ़ोटो संलग्न ✓' : 'Photo Attached ✓') : (hi ? 'आवेदन फ़ोटो संलग्न करें' : 'Attach Leave Photo')}</span>
              </button>
              <input
                ref={leavePhotoRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (!file) return;
                  const { dataUrl } = await compressImageFile(file, 720, 0.65);
                  setLeavePhoto(dataUrl);
                }}
              />
              <span className={`text-xs font-semibold tabular-nums ${isLeaveDateInvalid ? 'text-rose-700' : 'text-slate-600'}`}>
                {isLeaveDateInvalid
                  ? hi ? 'अमान्य तिथि' : 'Invalid date'
                  : `${computeLeaveDays(leaveFrom, leaveTo)} ${hi ? 'दिन' : 'days'}`}
              </span>
            </div>
            {leaveError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800">
                {leaveError}
              </div>
            )}
            <button
              type="submit"
              disabled={isLeaveDateInvalid}
              className="min-h-[44px] w-full rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
            >
              {editingLeaveId
                ? hi ? 'छुट्टी अपडेट करें' : 'Update Leave'
                : hi ? 'छुट्टी दर्ज करें' : 'Record Leave'}
            </button>
          </form>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-7">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-3">
              {hi ? 'छुट्टी इतिहास' : 'Leave History'} ({currentGroup?.annualLeaveLimit || 12} {hi ? 'दिन सालाना सीमा' : 'days/yr limit'})
            </h3>
            <div className="divide-y divide-slate-100">
              {scopedLeaves.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  {hi ? 'कोई छुट्टी दर्ज नहीं है।' : 'No leave records yet.'}
                </p>
              ) : (
                scopedLeaves.map((l) => (
                  <div key={l.id} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{l.ashaName}</p>
                      <p className="text-xs text-slate-500 tabular-nums">
                        {l.fromDate} → {l.toDate} · <strong>{l.days} {hi ? 'दिन' : 'days'}</strong> · {l.reason}
                      </p>
                    </div>
                    <div className="no-print flex items-center gap-1.5 shrink-0">
                      {l.photoDataUrl && (
                        <img src={l.photoDataUrl} alt="Leave" className="h-9 w-9 rounded-lg object-cover border border-slate-200" />
                      )}
                      {onUpdateLeave && (
                        <button
                          type="button"
                          onClick={() => startEditLeave(l)}
                          aria-label="Edit Leave"
                          className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onDeleteLeave(l.id)}
                        aria-label="Delete Leave"
                        className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: CLAIM VOUCHER SUBMISSION DATE & DELAY TRACKING (NO AMOUNT) */}
      {subTab === 'claims' && (
        <div className="space-y-4">
          <div className="no-print rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingClaimId
                    ? hi ? 'क्लेम वाउचर तिथि संपादित करें' : 'Edit Claim Voucher Date'
                    : hi ? 'क्लेम वाउचर जमा रजिस्टर (केवल जमा तिथि व समय पालन)' : 'Claim Voucher Submission Register'}
                </h3>
                <p className="text-xs text-slate-500">
                  {hi
                    ? `इसमें कोई राशि नहीं रखी जाती — केवल यह दर्ज होता है कि आशा ने किस माह का क्लेम वाउचर किस तारीख को जमा करवाया (नियत तिथि: माह की ${currentGroup?.claimDueDay || 5} तारीख)।`
                    : `Records only when each ASHA submitted her claim voucher (no monetary amount · due by ${currentGroup?.claimDueDay || 5}th of month).`}
                </p>
              </div>
              {editingClaimId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingClaimId(null);
                    setClaimAshaId('all');
                    setClaimVoucherNo('');
                    setClaimNotice(null);
                  }}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-900"
                >
                  {hi ? 'संपादन रद्द करें' : 'Cancel Edit'}
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex flex-wrap gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    {hi ? 'आशा कार्यकर्ता चुनें' : 'Select ASHA'}
                  </label>
                  <select
                    disabled={Boolean(editingClaimId)}
                    value={claimAshaId}
                    onChange={(e) => setClaimAshaId(e.target.value)}
                    className="mt-1 min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 disabled:bg-slate-100"
                  >
                    {!editingClaimId && (
                      <option value="all">
                        {hi ? `सभी ${scopedAshas.length} आशा (एक साथ जमा)` : `All ${scopedAshas.length} ASHAs (Bulk)`}
                      </option>
                    )}
                    {scopedAshas.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} — {a.subCenter}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">{hi ? 'माह (किस माह का वाउचर)' : 'Claim Month'}</label>
                  <input
                    type="month"
                    value={claimMonth}
                    onChange={(e) => setClaimMonth(e.target.value)}
                    className="mt-1 min-h-[44px] rounded-xl border border-slate-200 px-3 text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">{hi ? 'कब जमा करवाया (तिथि)' : 'Submitted Date'}</label>
                  <input
                    type="date"
                    value={claimDate}
                    onChange={(e) => setClaimDate(e.target.value)}
                    className="mt-1 min-h-[44px] rounded-xl border border-slate-200 px-3 text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">{hi ? 'वाउचर नं. (वैकल्पिक)' : 'Voucher No. (Opt.)'}</label>
                  <input
                    type="text"
                    value={claimVoucherNo}
                    onChange={(e) => setClaimVoucherNo(e.target.value)}
                    placeholder={hi ? 'जैसे VCH-01' : 'e.g. VCH-01'}
                    className="mt-1 w-36 min-h-[44px] rounded-xl border border-slate-200 px-3 text-sm"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleSubmitClaimVoucher}
                disabled={scopedAshas.length === 0}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-50 whitespace-nowrap"
              >
                <FileCheck2 className="h-4 w-4" />
                <span>
                  {editingClaimId
                    ? hi ? 'वाउचर अपडेट करें' : 'Update Voucher'
                    : claimAshaId === 'all'
                      ? hi
                        ? `सभी ${scopedAshas.length} आशा का वाउचर जमा दर्ज करें`
                        : `Log Voucher for ${scopedAshas.length} ASHAs`
                      : hi
                        ? 'वाउचर जमा दर्ज करें'
                        : 'Record Voucher Date'}
                </span>
              </button>
            </div>
            {claimNotice && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-900">
                {claimNotice}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 divide-y divide-slate-100">
            {scopedClaims.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">
                {hi ? 'कोई क्लेम वाउचर रिकॉर्ड नहीं है।' : 'No claim voucher submissions recorded.'}
              </p>
            ) : (
              scopedClaims.map((c) => (
                <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">{c.ashaName}</p>
                      {c.voucherNo && (
                        <span className="font-mono text-[11px] font-semibold text-slate-500">
                          #{c.voucherNo}
                        </span>
                      )}
                      {c.isDelayed ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {hi ? 'देरी से जमा' : 'Delayed'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700">
                          <Check className="h-3.5 w-3.5" />
                          {hi ? 'समय पर जमा' : 'On Time'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 tabular-nums">
                      {hi ? 'माह:' : 'Month:'} <span className="font-semibold">{c.month}</span> ·{' '}
                      {hi ? 'जमा तिथि:' : 'Submitted Date:'}{' '}
                      <span className="font-mono font-semibold text-slate-900">{c.submittedDate}</span>
                    </p>
                  </div>
                  <div className="no-print flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onCycleClaimStatus(c.id)}
                      className={`min-h-[38px] rounded-lg border px-3 py-1 text-xs font-semibold whitespace-nowrap ${
                        c.status === 'paid'
                          ? 'border-teal-200 bg-teal-50 text-teal-800'
                          : 'border-slate-200 bg-slate-50 text-slate-700'
                      }`}
                    >
                      {c.status === 'paid'
                        ? hi
                          ? 'वाउचर सत्यापित ✓'
                          : 'Verified ✓'
                        : c.status === 'submitted'
                          ? hi
                            ? 'वाउचर जमा'
                            : 'Voucher Submitted'
                          : hi
                            ? 'लंबित'
                            : 'Pending'}
                    </button>
                    {onUpdateClaim && (
                      <button
                        type="button"
                        onClick={() => startEditClaim(c)}
                        aria-label="Edit Claim"
                        className="flex min-h-[38px] min-w-[38px] items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onDeleteClaim(c.id)}
                      aria-label="Delete Claim"
                      className="flex min-h-[38px] min-w-[38px] items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 4: HEAD COUNT SURVEY & COVERAGE VARIANCE */}
      {subTab === 'headcount' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <form onSubmit={handleSaveHeadCount} className="no-print rounded-2xl border border-slate-200 bg-white p-5 space-y-3 lg:col-span-5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-bold text-slate-900">
                {editingHcId
                  ? hi ? 'हेडकाउंट प्रविष्टि संपादित करें' : 'Edit Head Count Entry'
                  : hi ? 'आशा-वार हेड काउंट प्रविष्टि' : 'ASHA-Wise Head Count Entry'}
              </h3>
              {editingHcId && (
                <button
                  type="button"
                  onClick={() => setEditingHcId(null)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-900"
                >
                  {hi ? 'रद्द करें' : 'Cancel'}
                </button>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                {hi ? 'आशा कार्यकर्ता चुनें *' : 'Select ASHA Worker *'}
              </label>
              <select
                value={hcAshaId}
                onChange={(e) => {
                  const id = e.target.value;
                  setHcAshaId(id);
                  const chosen = scopedAshas.find((a) => a.id === id);
                  if (chosen) {
                    setHcSubCenter(chosen.subCenter);
                    setHcTarget(String(chosen.population || 1000));
                    setHcSurveyed(String(Math.max(0, (chosen.population || 1000) - 35)));
                  }
                }}
                className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900"
              >
                {scopedAshas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} — {a.subCenter}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">{hi ? 'उप-केंद्र (Sub-Center)' : 'Sub-Center'}</label>
              <input
                list="hc-sc-list"
                value={hcSubCenter}
                onChange={(e) => setHcSubCenter(e.target.value)}
                className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
              <datalist id="hc-sc-list">
                {(currentGroup?.subCenters || []).map((sc) => (
                  <option key={sc} value={sc} />
                ))}
              </datalist>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">{hi ? 'लक्ष्य जनसंख्या' : 'Target Pop.'}</label>
                <input type="number" min={0} value={hcTarget} onChange={(e) => setHcTarget(e.target.value)} className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-200 px-3 text-sm tabular-nums" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">{hi ? 'सर्वे जनसंख्या' : 'Surveyed Pop.'}</label>
                <input type="number" min={0} value={hcSurveyed} onChange={(e) => setHcSurveyed(e.target.value)} className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-200 px-3 text-sm tabular-nums" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">{hi ? 'लक्ष्य दंपति' : 'Eligible Couples'}</label>
                <input type="number" min={0} value={hcCouples} onChange={(e) => setHcCouples(e.target.value)} className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-200 px-3 text-sm tabular-nums" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-teal-800">{hi ? 'गर्भवती (Pregnant)' : 'Pregnant Women'}</label>
                <input type="number" min={0} value={hcPregnant} onChange={(e) => setHcPregnant(e.target.value)} className="mt-1 w-full min-h-[44px] rounded-xl border border-teal-200 bg-teal-50/40 px-3 text-sm tabular-nums" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-teal-800">{hi ? 'धात्री (Dhatri / Lactating)' : 'Dhatri (Lactating)'}</label>
                <input type="number" min={0} value={hcLactating} onChange={(e) => setHcLactating(e.target.value)} className="mt-1 w-full min-h-[44px] rounded-xl border border-teal-200 bg-teal-50/40 px-3 text-sm tabular-nums" />
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <p className="text-xs font-bold text-teal-800 mb-2">
                {hi ? 'आयु-वर्ग अनुसार बच्चे (0-1, 1-2, 2-3, 5, 10, 16 वर्ष)' : 'Age-Based Child Counts (0-1, 1-2, 2-3, 5, 10, 16 Yrs)'}
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700">
                    {hi ? '0 से 1 वर्ष' : '0–1 Years'}
                  </label>
                  <input type="number" min={0} value={hc0To1} onChange={(e) => setHc0To1(e.target.value)} className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-200 px-2.5 text-sm tabular-nums" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700">
                    {hi ? '1 से 2 वर्ष' : '1–2 Years'}
                  </label>
                  <input type="number" min={0} value={hc1To2} onChange={(e) => setHc1To2(e.target.value)} className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-200 px-2.5 text-sm tabular-nums" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700">
                    {hi ? '2 से 3 वर्ष' : '2–3 Years'}
                  </label>
                  <input type="number" min={0} value={hc2To3} onChange={(e) => setHc2To3(e.target.value)} className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-200 px-2.5 text-sm tabular-nums" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700">
                    {hi ? '5 वर्ष' : '5 Years'}
                  </label>
                  <input type="number" min={0} value={hc5Yr} onChange={(e) => setHc5Yr(e.target.value)} className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-200 px-2.5 text-sm tabular-nums" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700">
                    {hi ? '10 वर्ष' : '10 Years'}
                  </label>
                  <input type="number" min={0} value={hc10Yr} onChange={(e) => setHc10Yr(e.target.value)} className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-200 px-2.5 text-sm tabular-nums" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700">
                    {hi ? '16 वर्ष' : '16 Years'}
                  </label>
                  <input type="number" min={0} value={hc16Yr} onChange={(e) => setHc16Yr(e.target.value)} className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-200 px-2.5 text-sm tabular-nums" />
                </div>
              </div>
            </div>

            <button type="submit" className="min-h-[44px] w-full rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800">
              {editingHcId
                ? hi ? 'संशोधित हेडकाउंट अपडेट करें' : 'Update Head Count Entry'
                : hi ? 'हेडकाउंट प्रविष्टि सेव करें' : 'Save Head Count Entry'}
            </button>
          </form>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {hi ? 'आशा-वार आयु-वर्ग हेडकाउंट तालिका' : 'ASHA-Wise Age-Group HeadCount Table'}
              </h3>
            </div>

            {scopedHeadCounts.length > 0 && (
              <div className="mt-3 pb-3 border-b border-slate-100">
                <ReportShareBar
                  lang={lang}
                  compact
                  title="Hospital Management App - Head Count Survey"
                  shareText={headCountShareText}
                  onDownloadPdf={() => {
                    const totalPct = Math.round(
                      (headCountTotals.surveyedPopulation / Math.max(1, headCountTotals.targetPopulation)) * 100
                    );
                    downloadTablePdf({
                      filename: `HeadCountSurvey_${new Date().toISOString().slice(0, 10)}.pdf`,
                      title: hi ? 'आशा-वार हेड काउंट सर्वे रिपोर्ट' : 'ASHA Head Count Survey Report',
                      subtitle: `${opsHospitalLabel} · ${scopedHeadCounts.length} entries`,
                      headers: ['आशा / SC', 'कवरेज', 'गर्भवती', 'धात्री', '0-1', '1-2', '2-3', '5व', '10व', '16व'],
                      rows: scopedHeadCounts.map((hc) => {
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
                          getAge10Count(hc),
                          getAge16Count(hc),
                        ];
                      }),
                      totalRow: [
                        `कुल योग (${scopedHeadCounts.length})`,
                        `${headCountTotals.surveyedPopulation}/${headCountTotals.targetPopulation} (${totalPct}%)`,
                        headCountTotals.pregnantWomen,
                        headCountTotals.lactatingMothers,
                        headCountTotals.children0To1,
                        headCountTotals.children1To2,
                        headCountTotals.children2To3,
                        headCountTotals.children5Yr,
                        headCountTotals.children10Yr,
                        headCountTotals.children16Yr,
                      ],
                    });
                  }}
                  onPrintPdf={() => window.print()}
                  onExportExcel={handleExportHeadCountCsv}
                  onExportWord={handleExportHeadCountWord}
                />
              </div>
            )}

            {scopedHeadCounts.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-500">
                <Users className="mx-auto mb-2 h-6 w-6 text-slate-400" />
                {hi ? 'कोई सर्वे डेटा नहीं है।' : 'No head count surveys recorded.'}
              </p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-2 pr-3 font-semibold">{hi ? 'आशा व उप-केंद्र' : 'ASHA & Sub-Center'}</th>
                      <th className="py-2 pr-2 font-semibold text-right tabular-nums whitespace-nowrap">{hi ? 'गर्भवती' : 'Preg.'}</th>
                      <th className="py-2 pr-2 font-semibold text-right tabular-nums whitespace-nowrap">{hi ? 'धात्री' : 'Dhatri'}</th>
                      <th className="py-2 pr-2 font-semibold text-right tabular-nums whitespace-nowrap">{hi ? '0–1' : '0–1y'}</th>
                      <th className="py-2 pr-2 font-semibold text-right tabular-nums whitespace-nowrap">{hi ? '1–2' : '1–2y'}</th>
                      <th className="py-2 pr-2 font-semibold text-right tabular-nums whitespace-nowrap">{hi ? '2–3' : '2–3y'}</th>
                      <th className="py-2 pr-2 font-semibold text-right tabular-nums whitespace-nowrap">{hi ? '5व' : '5y'}</th>
                      <th className="py-2 pr-2 font-semibold text-right tabular-nums whitespace-nowrap">{hi ? '10व' : '10y'}</th>
                      <th className="py-2 pr-2 font-semibold text-right tabular-nums whitespace-nowrap">{hi ? '16व' : '16y'}</th>
                      <th className="py-2 font-semibold text-right tabular-nums whitespace-nowrap">{hi ? 'कवरेज' : 'Cov'}</th>
                      {(onDeleteHeadCount || onUpdateHeadCount) && <th className="no-print py-2 pl-2" />}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {scopedHeadCounts.map((hc) => {
                      const pct = Math.round((hc.surveyedPopulation / Math.max(1, hc.targetPopulation)) * 100);
                      const variance = hc.surveyedPopulation - hc.targetPopulation;
                      return (
                        <tr key={hc.id} className={editingHcId === hc.id ? 'bg-teal-50/50' : ''}>
                          <td className="py-2.5 pr-3">
                            <p className="font-bold text-slate-900">{hc.ashaName || hc.subCenter}</p>
                            <p className="text-[11px] text-slate-500 tabular-nums">
                              {hc.subCenter} · EC: {hc.eligibleCouples}
                            </p>
                          </td>
                          <td className="py-2.5 pr-2 text-right font-mono tabular-nums font-semibold text-teal-800">{hc.pregnantWomen}</td>
                          <td className="py-2.5 pr-2 text-right font-mono tabular-nums font-semibold text-teal-800">{hc.lactatingMothers ?? 0}</td>
                          <td className="py-2.5 pr-2 text-right font-mono tabular-nums text-slate-800">{hc.children0To1 ?? 0}</td>
                          <td className="py-2.5 pr-2 text-right font-mono tabular-nums text-slate-800">{hc.children1To2 ?? 0}</td>
                          <td className="py-2.5 pr-2 text-right font-mono tabular-nums text-slate-800">{hc.children2To3 ?? 0}</td>
                          <td className="py-2.5 pr-2 text-right font-mono tabular-nums text-slate-800">{hc.children5Yr ?? 0}</td>
                          <td className="py-2.5 pr-2 text-right font-mono tabular-nums text-slate-800">{getAge10Count(hc)}</td>
                          <td className="py-2.5 pr-2 text-right font-mono tabular-nums text-slate-800">{getAge16Count(hc)}</td>
                          <td className="py-2.5 text-right tabular-nums">
                            <span className={`font-bold ${pct >= 95 ? 'text-teal-700' : 'text-amber-700'}`}>{pct}%</span>
                            <span className="block text-[10px] text-slate-500">
                              {variance >= 0 ? `+${variance}` : variance}
                            </span>
                          </td>
                          {(onDeleteHeadCount || onUpdateHeadCount) && (
                            <td className="no-print py-2.5 pl-2 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {onUpdateHeadCount && (
                                  <button
                                    type="button"
                                    onClick={() => startEditHeadCount(hc)}
                                    aria-label="Edit HeadCount"
                                    className="flex min-h-[32px] min-w-[32px] items-center justify-center rounded-lg text-slate-500 hover:bg-teal-50 hover:text-teal-700"
                                  >
                                    <Edit3 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                                {onDeleteHeadCount && (
                                  <button
                                    type="button"
                                    onClick={() => onDeleteHeadCount(hc.id)}
                                    aria-label="Delete"
                                    className="flex min-h-[32px] min-w-[32px] items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-700"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-300 bg-teal-50/70 font-bold text-slate-900">
                      <td className="py-2.5 pr-3">
                        {hi ? `कुल योग (${scopedHeadCounts.length})` : `Total (${scopedHeadCounts.length})`}
                        <span className="block text-[10px] font-normal text-slate-600 tabular-nums">
                          EC: {headCountTotals.eligibleCouples}
                        </span>
                      </td>
                      <td className="py-2.5 pr-2 text-right font-mono tabular-nums text-teal-900">{headCountTotals.pregnantWomen}</td>
                      <td className="py-2.5 pr-2 text-right font-mono tabular-nums text-teal-900">{headCountTotals.lactatingMothers}</td>
                      <td className="py-2.5 pr-2 text-right font-mono tabular-nums">{headCountTotals.children0To1}</td>
                      <td className="py-2.5 pr-2 text-right font-mono tabular-nums">{headCountTotals.children1To2}</td>
                      <td className="py-2.5 pr-2 text-right font-mono tabular-nums">{headCountTotals.children2To3}</td>
                      <td className="py-2.5 pr-2 text-right font-mono tabular-nums">{headCountTotals.children5Yr}</td>
                      <td className="py-2.5 pr-2 text-right font-mono tabular-nums">{headCountTotals.children10Yr}</td>
                      <td className="py-2.5 pr-2 text-right font-mono tabular-nums">{headCountTotals.children16Yr}</td>
                      <td className="py-2.5 text-right font-mono tabular-nums text-teal-800">
                        {Math.round(
                          (headCountTotals.surveyedPopulation / Math.max(1, headCountTotals.targetPopulation)) * 100
                        )}
                        %
                      </td>
                      {(onDeleteHeadCount || onUpdateHeadCount) && <td className="no-print" />}
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 5: HOSPITAL-WISE ASHA REPORT DIRECTLY INSIDE OPERATIONS */}
      {subTab === 'hospital_report' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <p className="text-xs font-semibold text-teal-700">Hospital Management App</p>
                <h3 className="text-lg font-bold text-slate-900">
                  {opsHospitalLabel} — {hi ? 'अस्पताल-वार आशा पूर्ण रिपोर्ट' : 'Hospital-Wise ASHA Report'}
                </h3>
                <p className="text-xs text-slate-500 tabular-nums">
                  {hi
                    ? `कुल ${hospitalAshaRows.length} आशा कार्यकर्ता · किसी भी आशा की "पूर्ण रिपोर्ट" खोलकर बैठक, नोटिस, छुट्टी, क्लेम व हेडकाउंट देखें`
                    : `${hospitalAshaRows.length} ASHAs · Click "Complete Report" on any row to view full individual breakdown`}
                </p>
              </div>
            </div>

            {hospitalAshaRows.length > 0 && (
              <div className="no-print pb-3 border-b border-slate-100">
                <ReportShareBar
                  lang={lang}
                  compact
                  title={`Hospital Management App — ${opsHospitalLabel} ASHA Report`}
                  shareText={hospitalOpsShareText}
                  onDownloadPdf={() =>
                    downloadTablePdf({
                      filename: `Hospital_ASHA_Report_${new Date().toISOString().slice(0, 10)}.pdf`,
                      title: `${opsHospitalLabel} — ${hi ? 'अस्पताल-वार आशा रिपोर्ट' : 'Hospital-Wise ASHA Report'}`,
                      subtitle: `${hospitalAshaRows.length} ASHAs`,
                      headers: ['अस्पताल / आशा', 'SC / AWC', 'बैठक', 'नोटिस', 'छुट्टी', 'वाउचर तिथि', 'गर्भवती', 'धात्री'],
                      rows: hospitalAshaRows.map((r) => [
                        `${r.hospitalName}\n${r.asha.name}`,
                        `${r.asha.subCenter}\n${r.asha.awcName || '-'}`,
                        `${r.presentMeetings}/${r.totalMeetings}`,
                        r.noticesCount,
                        `${r.leaveDays} दिन`,
                        `${r.latestClaimDate} (${r.claimsCount})`,
                        r.pregnant,
                        r.dhatri,
                      ]),
                    })
                  }
                  onPrintPdf={() => window.print()}
                  onExportExcel={handleExportHospitalOpsCsv}
                  onExportWord={handleExportHospitalOpsWord}
                />
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 pr-3 font-semibold">{hi ? 'अस्पताल व आशा' : 'Hospital & ASHA'}</th>
                    <th className="py-2 pr-3 font-semibold">{hi ? 'सब सेंटर / AWC' : 'Sub-Center / AWC'}</th>
                    <th className="py-2 pr-2 font-semibold text-right tabular-nums">{hi ? 'बैठक' : 'Meetings'}</th>
                    <th className="py-2 pr-2 font-semibold text-right tabular-nums">{hi ? 'नोटिस' : 'Notices'}</th>
                    <th className="py-2 pr-2 font-semibold text-right tabular-nums">{hi ? 'छुट्टी' : 'Leaves'}</th>
                    <th className="py-2 pr-2 font-semibold text-right tabular-nums">{hi ? 'वाउचर जमा' : 'Voucher Date'}</th>
                    <th className="py-2 pr-2 font-semibold text-right tabular-nums">{hi ? 'गर्भवती' : 'Preg.'}</th>
                    <th className="py-2 pr-3 font-semibold text-right tabular-nums">{hi ? 'धात्री' : 'Dhatri'}</th>
                    {onOpenAshaReport && <th className="no-print py-2 text-right font-semibold">{hi ? 'आशा रिपोर्ट' : 'Action'}</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {hospitalAshaRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-500">
                        {hi ? 'इस अस्पताल में कोई आशा रिकॉर्ड नहीं है।' : 'No ASHAs found for this hospital.'}
                      </td>
                    </tr>
                  ) : (
                    hospitalAshaRows.map((r) => (
                      <tr key={r.asha.id}>
                        <td className="py-2.5 pr-3">
                          <p className="text-[11px] font-semibold text-teal-800">{r.hospitalName}</p>
                          <p className="font-bold text-slate-900">{r.asha.name}</p>
                          <p className="text-[11px] text-slate-500 tabular-nums">{r.asha.phone || '-'}</p>
                        </td>
                        <td className="py-2.5 pr-3 text-slate-700">
                          <p>{r.asha.subCenter}</p>
                          <p className="text-[11px] text-slate-500">{r.asha.awcName || '-'}</p>
                        </td>
                        <td className="py-2.5 pr-2 text-right font-mono tabular-nums font-semibold text-teal-700">
                          {r.presentMeetings}/{r.totalMeetings}
                        </td>
                        <td className="py-2.5 pr-2 text-right font-mono tabular-nums">{r.noticesCount}</td>
                        <td className="py-2.5 pr-2 text-right font-mono tabular-nums">{r.leaveDays}d</td>
                        <td className="py-2.5 pr-2 text-right font-mono tabular-nums">
                          <span>{r.latestClaimDate}</span>
                          {r.claimsCount > 0 && (
                            <span className={`block text-[10px] ${r.delayedClaimsCount > 0 ? 'text-amber-700 font-semibold' : 'text-teal-700'}`}>
                              {r.delayedClaimsCount > 0 ? (hi ? 'देरी' : 'Late') : (hi ? 'समय पर' : 'On Time')}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 pr-2 text-right font-mono tabular-nums">{r.pregnant}</td>
                        <td className="py-2.5 pr-3 text-right font-mono tabular-nums">{r.dhatri}</td>
                        {onOpenAshaReport && (
                          <td className="no-print py-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => onOpenAshaReport(r.asha.id)}
                              className="inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-teal-200 bg-teal-50 px-2.5 text-[11px] font-semibold text-teal-800 hover:bg-teal-100 whitespace-nowrap"
                            >
                              <ClipboardList className="h-3.5 w-3.5" />
                              <span>{hi ? 'पूर्ण रिपोर्ट' : 'Complete Report'}</span>
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
