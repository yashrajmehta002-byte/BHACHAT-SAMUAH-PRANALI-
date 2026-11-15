import React, { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  FileSpreadsheet,
  FileText,
  Mail,
  MessageCircle,
  MessageSquare,
  Printer,
  Share2,
  X,
} from 'lucide-react';
import type { Language } from '../types/asha';
import {
  buildSmsHref,
  safePrintPage,
  shareViaEmail,
  shareViaSms,
  shareViaSystemOrCopy,
  shareViaWhatsApp,
} from '../utils/cryptoAndExport';

interface ReportShareBarProps {
  lang: Language;
  title: string;
  shareText: string;
  smsText?: string;
  onDownloadPdf?: () => void;
  onExportExcel?: () => void;
  onExportWord?: () => void;
  onPrintPdf?: () => void;
  compact?: boolean;
}

export const ReportShareBar: React.FC<ReportShareBarProps> = ({
  lang,
  title,
  shareText,
  smsText,
  onDownloadPdf,
  onExportExcel,
  onExportWord,
  onPrintPdf,
  compact = false,
}) => {
  const hi = lang === 'hi';
  const [feedback, setFeedback] = useState<string | null>(null);
  const [smsModalOpen, setSmsModalOpen] = useState(false);
  const [smsPhone, setSmsPhone] = useState('');
  const [smsDraft, setSmsDraft] = useState(smsText || shareText);

  useEffect(() => {
    setSmsDraft(smsText || shareText);
  }, [smsText, shareText]);

  const showToast = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2600);
  };

  const handleDownloadPdfClick = () => {
    try {
      if (onDownloadPdf) {
        onDownloadPdf();
        showToast(hi ? 'PDF (.pdf) डाउनलोड ✓' : 'PDF Downloaded ✓');
      } else if (onPrintPdf) {
        const ok = safePrintPage();
        if (!ok) {
          showToast(hi ? 'सीधे ब्राउज़र टैब में प्रिंट खोलें' : 'Open in new tab to print');
        }
      }
    } catch {
      showToast(hi ? 'PDF बनाने में त्रुटि' : 'PDF generation failed');
    }
  };

  const handlePrintClick = () => {
    const ok = safePrintPage();
    if (!ok) {
      showToast(
        hi ? 'प्रीव्यू फ़्रेम में प्रिंट ब्लॉक है — PDF (.pdf) बटन दबाएं' : 'Use PDF (.pdf) button here'
      );
    }
  };

  const handleExcelClick = () => {
    if (!onExportExcel) return;
    try {
      onExportExcel();
      showToast(hi ? 'Excel (.csv) डाउनलोड ✓' : 'Excel Downloaded ✓');
    } catch {
      showToast(hi ? 'Excel त्रुटि' : 'Excel failed');
    }
  };

  const handleWordClick = () => {
    if (!onExportWord) return;
    try {
      onExportWord();
      showToast(hi ? 'Word (.doc) डाउनलोड ✓' : 'Word Downloaded ✓');
    } catch {
      showToast(hi ? 'Word त्रुटि' : 'Word failed');
    }
  };

  const handleSystemShare = async () => {
    const result = await shareViaSystemOrCopy(title, shareText);
    if (result === 'copied') {
      showToast(hi ? 'कॉपी हो गया ✓' : 'Copied ✓');
    } else if (result === 'shared') {
      showToast(hi ? 'शेयर किया गया ✓' : 'Shared ✓');
    } else {
      showToast(hi ? 'शेयर उपलब्ध नहीं' : 'Unavailable');
    }
  };

  const handleCopyOnly = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      showToast(hi ? 'टेक्स्ट कॉपी ✓' : 'Copied ✓');
    } catch {
      showToast(hi ? 'कॉपी नहीं हो सका' : 'Copy failed');
    }
  };

  const btnBase = compact
    ? 'inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0'
    : 'inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0';

  const trimmedSms = smsDraft.length > 1400 ? `${smsDraft.slice(0, 1380)}...` : smsDraft;
  const smsHref = buildSmsHref(trimmedSms, smsPhone);

  return (
    <div className="no-print space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {(onDownloadPdf || onPrintPdf) && (
          <button
            type="button"
            onClick={handleDownloadPdfClick}
            className={`inline-flex ${compact ? 'min-h-[38px] rounded-lg px-3' : 'min-h-[40px] rounded-xl px-3.5'} items-center gap-1.5 bg-teal-700 py-1.5 text-xs font-semibold text-white hover:bg-teal-800 whitespace-nowrap shrink-0`}
          >
            <Download className="h-4 w-4 shrink-0" />
            <span>{onDownloadPdf ? 'PDF (.pdf)' : hi ? 'PDF / प्रिंट' : 'PDF / Print'}</span>
          </button>
        )}

        {onDownloadPdf && onPrintPdf && (
          <button type="button" onClick={handlePrintClick} className={btnBase}>
            <Printer className="h-4 w-4 text-slate-700 shrink-0" />
            <span>{hi ? 'प्रिंट' : 'Print'}</span>
          </button>
        )}

        {onExportExcel && (
          <button type="button" onClick={handleExcelClick} className={btnBase}>
            <FileSpreadsheet className="h-4 w-4 text-teal-700 shrink-0" />
            <span>Excel (.csv)</span>
          </button>
        )}

        {onExportWord && (
          <button type="button" onClick={handleWordClick} className={btnBase}>
            <FileText className="h-4 w-4 text-slate-700 shrink-0" />
            <span>Word (.doc)</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => shareViaWhatsApp(shareText)}
          className={btnBase}
        >
          <MessageCircle className="h-4 w-4 text-emerald-700 shrink-0" />
          <span>WhatsApp</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setSmsDraft(smsText || shareText);
            setSmsModalOpen(true);
          }}
          className={btnBase}
        >
          <MessageSquare className="h-4 w-4 text-sky-700 shrink-0" />
          <span>SMS</span>
        </button>

        <button
          type="button"
          onClick={() => shareViaEmail(title, shareText)}
          className={btnBase}
        >
          <Mail className="h-4 w-4 text-slate-600 shrink-0" />
          <span>{hi ? 'ईमेल' : 'Email'}</span>
        </button>

        <button type="button" onClick={handleSystemShare} className={btnBase}>
          <Share2 className="h-4 w-4 text-slate-700 shrink-0" />
          <span>{hi ? 'शेयर' : 'Share'}</span>
        </button>

        <button
          type="button"
          onClick={handleCopyOnly}
          aria-label={hi ? 'कॉपी करें' : 'Copy report text'}
          className={btnBase}
        >
          <Copy className="h-3.5 w-3.5 text-slate-600 shrink-0" />
          <span>{hi ? 'कॉपी' : 'Copy'}</span>
        </button>
      </div>

      {feedback && (
        <div className="inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800">
          <Check className="h-3.5 w-3.5 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {smsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2.5">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-sky-700" />
                <span>{hi ? 'SMS रिपोर्ट भेजें / कॉपी करें' : 'Send / Copy SMS Report'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setSmsModalOpen(false)}
                aria-label="Close"
                className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                {hi ? 'मोबाइल नंबर (वैकल्पिक — 10 अंक)' : 'Recipient Mobile No. (Optional)'}
              </label>
              <input
                type="tel"
                value={smsPhone}
                onChange={(e) => setSmsPhone(e.target.value)}
                placeholder={hi ? 'उदा. 9829011223 (या खाली छोड़ें)' : 'e.g. 9829011223'}
                className="mt-1 w-full min-h-[40px] rounded-xl border border-slate-200 px-3 text-sm font-mono tabular-nums"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <label>{hi ? 'SMS संदेश' : 'SMS Message'}</label>
                <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                  {trimmedSms.length}/1400
                </span>
              </div>
              <textarea
                rows={5}
                value={smsDraft}
                onChange={(e) => setSmsDraft(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs leading-relaxed text-slate-800"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <a
                href={smsHref}
                onClick={() => {
                  const win = window as Window & {
                    AshaNative?: { sendSms?: (num: string, msg: string) => void };
                  };
                  if (win.AshaNative && typeof win.AshaNative.sendSms === 'function') {
                    shareViaSms(trimmedSms, smsPhone);
                  }
                }}
                className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-sky-700 px-3 text-xs font-semibold text-white hover:bg-sky-800"
              >
                <MessageSquare className="h-4 w-4" />
                <span>{hi ? 'फ़ोन SMS ऐप खोलें' : 'Open SMS App'}</span>
              </a>

              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(trimmedSms);
                    showToast(hi ? 'SMS टेक्स्ट कॉपी हो गया ✓' : 'SMS text copied ✓');
                    setSmsModalOpen(false);
                  } catch {
                    showToast(hi ? 'कॉपी नहीं हो सका' : 'Copy failed');
                  }
                }}
                className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 hover:bg-slate-50"
              >
                <Copy className="h-4 w-4" />
                <span>{hi ? 'कॉपी करें' : 'Copy SMS'}</span>
              </button>

              <button
                type="button"
                onClick={() => shareViaWhatsApp(trimmedSms)}
                className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
              >
                <MessageCircle className="h-4 w-4" />
                <span>WhatsApp</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              {hi
                ? 'नोट: Android/iPhone फ़ोन पर "फ़ोन SMS ऐप खोलें" से सीधा Messages खुलता है। कंप्यूटर पर "कॉपी करें" का उपयोग करें।'
                : 'On mobile, "Open SMS App" launches your device Messages app; on desktop, use "Copy SMS".'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
