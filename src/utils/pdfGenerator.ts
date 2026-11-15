// Genuine multi-page Hindi + English A4 PDF generator using browser Canvas 2D Devanagari shaping + jsPDF
import { jsPDF } from 'jspdf';
import type { AshaWorker, ClaimRecord, HeadCountEntry, LeaveRecord, NoticeItem } from '../types/asha';
import { triggerBlobDownload } from './cryptoAndExport';

const PAGE_W = 1240; // A4 @ 150 DPI
const PAGE_H = 1754;
const MARGIN = 68;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FONT_FAMILY = "'Noto Sans Devanagari', 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif";
const MONO_FONT = "'JetBrains Mono', monospace";

function createA4Page(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = PAGE_W;
  canvas.height = PAGE_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);
  ctx.textBaseline = 'top';
  return { canvas, ctx };
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const clean = String(text ?? '-');
  const paragraphs = clean.split(/\r?\n/);
  const lines: string[] = [];

  for (const para of paragraphs) {
    if (!para.trim()) {
      lines.push('');
      continue;
    }
    const words = para.split(/\s+/);
    let current = '';

    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (ctx.measureText(candidate).width <= maxWidth) {
        current = candidate;
      } else {
        if (current) lines.push(current);
        if (ctx.measureText(word).width <= maxWidth) {
          current = word;
        } else {
          // Break very long single tokens cleanly
          let chunk = '';
          for (const ch of word) {
            if (ctx.measureText(chunk + ch).width > maxWidth && chunk) {
              lines.push(chunk);
              chunk = ch;
            } else {
              chunk += ch;
            }
          }
          current = chunk;
        }
      }
    }
    if (current) lines.push(current);
  }
  return lines.length > 0 ? lines : ['-'];
}

function saveCanvasesAsPdf(pages: HTMLCanvasElement[], filename: string): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  pages.forEach((canvas, idx) => {
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.font = `500 18px ${FONT_FAMILY}`;
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'right';
      ctx.fillText(`Page ${idx + 1} / ${pages.length}`, PAGE_W - MARGIN, PAGE_H - 42);
      ctx.textAlign = 'left';
      ctx.fillText('Hospital Management App · Offline Register', MARGIN, PAGE_H - 42);
    }
    if (idx > 0) doc.addPage('a4', 'portrait');
    const imgData = canvas.toDataURL('image/jpeg', 0.92);
    doc.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
  });

  const blob = doc.output('blob');
  triggerBlobDownload(blob, filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
}

function drawDocumentHeader(
  ctx: CanvasRenderingContext2D,
  title: string,
  subtitle: string
): number {
  let y = MARGIN;
  ctx.fillStyle = '#0f766e';
  ctx.font = `700 20px ${FONT_FAMILY}`;
  ctx.fillText('Hospital Management App', MARGIN, y);
  y += 30;

  ctx.fillStyle = '#0f172a';
  ctx.font = `700 30px ${FONT_FAMILY}`;
  for (const line of wrapLines(ctx, title, CONTENT_W)) {
    ctx.fillText(line, MARGIN, y);
    y += 38;
  }

  if (subtitle) {
    ctx.fillStyle = '#475569';
    ctx.font = `500 19px ${FONT_FAMILY}`;
    for (const line of wrapLines(ctx, subtitle, CONTENT_W)) {
      ctx.fillText(line, MARGIN, y);
      y += 26;
    }
  }

  y += 10;
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(MARGIN, y);
  ctx.lineTo(PAGE_W - MARGIN, y);
  ctx.stroke();
  return y + 18;
}

function drawTableSection(
  pages: HTMLCanvasElement[],
  currentPageRef: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; y: number },
  sectionTitle: string | null,
  headers: string[],
  rows: (string | number)[][],
  totalRow?: (string | number)[]
): void {
  const maxBottom = PAGE_H - MARGIN - 40;
  const colCount = Math.max(1, headers.length);
  const colW = CONTENT_W / colCount;
  const cellPadX = 8;
  const cellPadY = 8;
  const fontSize = colCount >= 9 ? 14 : colCount >= 6 ? 16 : 18;
  const lineH = fontSize + 6;

  const ensureSpace = (needed: number) => {
    if (currentPageRef.y + needed > maxBottom) {
      const next = createA4Page();
      pages.push(next.canvas);
      currentPageRef.canvas = next.canvas;
      currentPageRef.ctx = next.ctx;
      currentPageRef.y = MARGIN;
      return true;
    }
    return false;
  };

  if (sectionTitle) {
    ensureSpace(70);
    const { ctx } = currentPageRef;
    ctx.fillStyle = '#0f172a';
    ctx.font = `700 22px ${FONT_FAMILY}`;
    ctx.fillText(sectionTitle, MARGIN, currentPageRef.y);
    currentPageRef.y += 34;
  }

  const drawRow = (cells: (string | number)[], bg: string, bold: boolean, textColor = '#0f172a') => {
    const { ctx } = currentPageRef;
    ctx.font = `${bold ? '700' : '500'} ${fontSize}px ${FONT_FAMILY}`;
    const wrapped = cells.map((c) => wrapLines(ctx, String(c ?? '-'), colW - cellPadX * 2));
    const maxLines = Math.max(1, ...wrapped.map((w) => w.length));
    const rowH = maxLines * lineH + cellPadY * 2;

    if (ensureSpace(rowH)) {
      if (!bold) {
        // Repeat table header on new page
        drawRow(headers, '#f1f5f9', true, '#334155');
      }
      currentPageRef.ctx.font = `${bold ? '700' : '500'} ${fontSize}px ${FONT_FAMILY}`;
    }

    const activeCtx = currentPageRef.ctx;
    const startY = currentPageRef.y;
    activeCtx.fillStyle = bg;
    activeCtx.fillRect(MARGIN, startY, CONTENT_W, rowH);

    activeCtx.strokeStyle = '#cbd5e1';
    activeCtx.lineWidth = 1;
    activeCtx.strokeRect(MARGIN, startY, CONTENT_W, rowH);

    for (let i = 0; i < colCount; i++) {
      const x = MARGIN + i * colW;
      if (i > 0) {
        activeCtx.beginPath();
        activeCtx.moveTo(x, startY);
        activeCtx.lineTo(x, startY + rowH);
        activeCtx.stroke();
      }
      activeCtx.fillStyle = textColor;
      activeCtx.font = `${bold ? '700' : '500'} ${fontSize}px ${FONT_FAMILY}`;
      const lines = wrapped[i] || ['-'];
      lines.forEach((ln, lIdx) => {
        activeCtx.fillText(ln, x + cellPadX, startY + cellPadY + lIdx * lineH);
      });
    }
    currentPageRef.y += rowH;
  };

  drawRow(headers, '#f1f5f9', true, '#334155');
  if (rows.length === 0) {
    drawRow(
      headers.map((_, i) => (i === 0 ? 'कोई डेटा उपलब्ध नहीं (No records)' : '-')),
      '#ffffff',
      false,
      '#64748b'
    );
  } else {
    rows.forEach((r, idx) => drawRow(r, idx % 2 === 1 ? '#f8fafc' : '#ffffff', false));
  }
  if (totalRow) {
    drawRow(totalRow, '#f0fdfa', true, '#115e59');
  }
  currentPageRef.y += 22;
}

export function downloadTablePdf(params: {
  filename: string;
  title: string;
  subtitle: string;
  headers: string[];
  rows: (string | number)[][];
  totalRow?: (string | number)[];
}): void {
  const first = createA4Page();
  const pages: HTMLCanvasElement[] = [first.canvas];
  const yStart = drawDocumentHeader(first.ctx, params.title, params.subtitle);
  const ref = { canvas: first.canvas, ctx: first.ctx, y: yStart };
  drawTableSection(pages, ref, null, params.headers, params.rows, params.totalRow);
  saveCanvasesAsPdf(pages, params.filename);
}

export function downloadIndividualAshaPdf(params: {
  filename: string;
  asha: AshaWorker;
  hospitalName: string;
  summary: {
    presentCount: number;
    absentCount: number;
    attendancePct: number;
    meetingRows: { date: string; title: string; inTime: string; outTime: string; present: boolean }[];
    receivedNotices: NoticeItem[];
    personalNoticesCount: number;
    generalNoticesCount: number;
    ashaLeaves: LeaveRecord[];
    totalLeaveDays: number;
    ashaClaims: ClaimRecord[];
    latestClaimDate: string;
    delayedClaimsCount: number;
    ashaHeadCounts: HeadCountEntry[];
  };
}): void {
  const { asha, hospitalName, summary } = params;
  const first = createA4Page();
  const pages: HTMLCanvasElement[] = [first.canvas];
  let y = drawDocumentHeader(
    first.ctx,
    `आशा-वार पूर्ण रिपोर्ट — ${asha.name}`,
    `${hospitalName} · ${asha.subCenter} · AWC: ${asha.awcName || '-'} · 📱 ${asha.phone || '-'}`
  );

  // 4 KPI Summary Strip
  const kpis = [
    { label: 'बैठक उपस्थिति', val: `${summary.presentCount}/${summary.meetingRows.length} (${summary.attendancePct}%)` },
    { label: 'मिले नोटिस', val: `${summary.receivedNotices.length} (व्यक्तिगत ${summary.personalNoticesCount})` },
    { label: 'कुल छुट्टियाँ', val: `${summary.totalLeaveDays} दिन` },
    { label: 'क्लेम वाउचर', val: `${summary.ashaClaims.length} (ताज़ा: ${summary.latestClaimDate})` },
  ];
  const boxW = (CONTENT_W - 36) / 4;
  kpis.forEach((k, i) => {
    const x = MARGIN + i * (boxW + 12);
    first.ctx.fillStyle = '#f8fafc';
    first.ctx.fillRect(x, y, boxW, 84);
    first.ctx.strokeStyle = '#cbd5e1';
    first.ctx.lineWidth = 1.5;
    first.ctx.strokeRect(x, y, boxW, 84);
    first.ctx.fillStyle = '#64748b';
    first.ctx.font = `600 16px ${FONT_FAMILY}`;
    first.ctx.fillText(k.label, x + 12, y + 14);
    first.ctx.fillStyle = '#0f766e';
    first.ctx.font = `700 21px ${FONT_FAMILY}`;
    first.ctx.fillText(k.val, x + 12, y + 42);
  });
  y += 108;

  const ref = { canvas: first.canvas, ctx: first.ctx, y };

  drawTableSection(
    pages,
    ref,
    '1. बैठक व ट्रेनिंग उपस्थिति विवरण',
    ['तिथि', 'बैठक / ट्रेनिंग', 'समय', 'स्थिति'],
    summary.meetingRows.map((m) => [
      m.date,
      m.title,
      `${m.inTime} → ${m.outTime}`,
      m.present ? 'उपस्थित ✓' : 'अनुपस्थित',
    ])
  );

  drawTableSection(
    pages,
    ref,
    '2. मिले हुए नोटिस विवरण',
    ['दिनांक', 'डिस्पैच नंबर', 'कारण', 'विषय'],
    summary.receivedNotices.map((n) => [
      n.date,
      n.dispatchNumber || n.refNumber,
      n.reason || '-',
      n.titleHi || n.titleEn,
    ])
  );

  drawTableSection(
    pages,
    ref,
    '3. हेडकाउंट (गर्भवती, धात्री व 0–16 वर्ष)',
    ['तिथि', 'गर्भवती', 'धात्री', '0-1', '1-2', '2-3', '5व', '10व', '16व'],
    summary.ashaHeadCounts.map((hc) => [
      hc.surveyDate,
      hc.pregnantWomen,
      hc.lactatingMothers ?? 0,
      hc.children0To1 ?? 0,
      hc.children1To2 ?? 0,
      hc.children2To3 ?? 0,
      hc.children5Yr ?? 0,
      hc.children10Yr ?? Math.round((hc.children10And16Yr ?? 0) / 2),
      hc.children16Yr ?? Math.max(0, (hc.children10And16Yr ?? 0) - Math.round((hc.children10And16Yr ?? 0) / 2)),
    ])
  );

  drawTableSection(
    pages,
    ref,
    '4. छुट्टी इतिहास',
    ['अवधि', 'दिन', 'कारण'],
    summary.ashaLeaves.map((l) => [`${l.fromDate} → ${l.toDate}`, l.days, l.reason])
  );

  drawTableSection(
    pages,
    ref,
    '5. क्लेम वाउचर जमा इतिहास',
    ['माह', 'जमा तिथि', 'वाउचर नं.', 'स्थिति'],
    summary.ashaClaims.map((c) => [
      c.month,
      c.submittedDate,
      c.voucherNo || '-',
      `${c.isDelayed ? 'देरी से' : 'समय पर'} (${c.status === 'paid' ? 'सत्यापित' : c.status === 'submitted' ? 'जमा' : 'लंबित'})`,
    ])
  );

  saveCanvasesAsPdf(pages, params.filename);
}

export function downloadNoticeA4Pdf(params: {
  filename: string;
  notice: NoticeItem;
  groupName: string;
  moicName: string;
  shsName: string;
  qrMatrix: boolean[][];
}): void {
  const { notice, groupName, moicName, shsName, qrMatrix } = params;
  const page = createA4Page();
  const { ctx } = page;
  let y = MARGIN + 12;

  // Hospital Official Letterhead Heading
  ctx.textAlign = 'center';
  ctx.fillStyle = '#115e59';
  ctx.font = `600 20px ${FONT_FAMILY}`;
  ctx.fillText('चिकित्सा एवं स्वास्थ्य विभाग · Hospital Management App', PAGE_W / 2, y);
  y += 36;

  ctx.fillStyle = '#0f172a';
  ctx.font = `700 38px ${FONT_FAMILY}`;
  ctx.fillText(groupName || 'सम्बंधित अस्पताल / PHC', PAGE_W / 2, y);
  y += 50;

  ctx.fillStyle = '#334155';
  ctx.font = `600 22px ${FONT_FAMILY}`;
  ctx.fillText('कार्यालय चिकित्सा अधिकारी प्रभारी (MOIC)', PAGE_W / 2, y);
  y += 32;

  if (moicName || shsName) {
    ctx.fillStyle = '#64748b';
    ctx.font = `500 18px ${FONT_FAMILY}`;
    ctx.fillText(`${moicName}${shsName ? ` · ${shsName}` : ''}`, PAGE_W / 2, y);
    y += 30;
  }

  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(MARGIN, y + 6);
  ctx.lineTo(PAGE_W - MARGIN, y + 6);
  ctx.stroke();
  y += 34;

  // Dispatch Number & Date row
  ctx.textAlign = 'left';
  ctx.fillStyle = '#0f172a';
  ctx.font = `700 21px ${MONO_FONT}`;
  const disp = notice.dispatchNumber || notice.refNumber;
  ctx.fillText(`डिस्पैच नंबर: ${disp}`, MARGIN, y);
  ctx.textAlign = 'right';
  ctx.fillText(`दिनांक: ${notice.date}`, PAGE_W - MARGIN, y);
  ctx.textAlign = 'left';
  y += 42;

  // Reason & Target Box
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(MARGIN, y, CONTENT_W, 92);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(MARGIN, y, CONTENT_W, 92);
  ctx.fillStyle = '#0f172a';
  ctx.font = `600 20px ${FONT_FAMILY}`;
  ctx.fillText(`कारण (Reason): ${notice.reason || '-'}`, MARGIN + 18, y + 16);
  ctx.fillText(`प्रति (प्रेषित): ${notice.targetAshaName || 'सभी आशा कार्यकर्ता'}`, MARGIN + 18, y + 52);
  y += 130;

  // Notice Subject
  const title = notice.titleHi || notice.titleEn;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#0f172a';
  ctx.font = `700 26px ${FONT_FAMILY}`;
  for (const ln of wrapLines(ctx, title, CONTENT_W - 40)) {
    ctx.fillText(ln, PAGE_W / 2, y);
    const w = ctx.measureText(ln).width;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(PAGE_W / 2 - w / 2, y + 32);
    ctx.lineTo(PAGE_W / 2 + w / 2, y + 32);
    ctx.stroke();
    y += 40;
  }
  y += 28;

  // Body Text
  ctx.textAlign = 'left';
  ctx.fillStyle = '#1e293b';
  ctx.font = `400 22px ${FONT_FAMILY}`;
  const bodyLines = wrapLines(ctx, notice.bodyHi || notice.bodyEn, CONTENT_W);
  for (const ln of bodyLines) {
    if (y > PAGE_H - 310) break;
    ctx.fillText(ln, MARGIN, y);
    y += 36;
  }

  // Footer QR Code & MOIC Signature
  const footerY = PAGE_H - 250;
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(MARGIN, footerY);
  ctx.lineTo(PAGE_W - MARGIN, footerY);
  ctx.stroke();

  if (qrMatrix.length > 0) {
    const qrSizePx = 152;
    const quiet = 2;
    const modCount = qrMatrix.length + quiet * 2;
    const cell = qrSizePx / modCount;
    const qrX = MARGIN;
    const qrY = footerY + 24;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(qrX, qrY, qrSizePx, qrSizePx);
    ctx.strokeStyle = '#cbd5e1';
    ctx.strokeRect(qrX, qrY, qrSizePx, qrSizePx);
    ctx.fillStyle = '#0f172a';
    qrMatrix.forEach((row, r) => {
      row.forEach((on, c) => {
        if (on) {
          ctx.fillRect(
            qrX + (c + quiet) * cell,
            qrY + (r + quiet) * cell,
            Math.ceil(cell),
            Math.ceil(cell)
          );
        }
      });
    });

    ctx.fillStyle = '#334155';
    ctx.font = `700 18px ${FONT_FAMILY}`;
    ctx.fillText('A4 डिजिटल QR सत्यापन', qrX + qrSizePx + 18, qrY + 34);
    ctx.fillStyle = '#64748b';
    ctx.font = `500 17px ${MONO_FONT}`;
    ctx.fillText(disp, qrX + qrSizePx + 18, qrY + 64);
    ctx.font = `500 17px ${FONT_FAMILY}`;
    ctx.fillText(groupName, qrX + qrSizePx + 18, qrY + 94);
  }

  ctx.textAlign = 'right';
  ctx.fillStyle = '#0f172a';
  ctx.font = `700 22px ${FONT_FAMILY}`;
  ctx.fillText(moicName || 'MOIC', PAGE_W - MARGIN, footerY + 92);
  ctx.fillStyle = '#475569';
  ctx.font = `500 19px ${FONT_FAMILY}`;
  ctx.fillText(groupName, PAGE_W - MARGIN, footerY + 124);
  ctx.textAlign = 'left';

  saveCanvasesAsPdf([page.canvas], params.filename);
}
