// Web Crypto AES-GCM encryption for Aadhaar & Bank details, plus Excel CSV, Word, and real ISO-18004 QR SVG helpers
import QRCode from 'qrcode';

export function escapeHtml(raw: unknown): string {
  return String(raw ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function maskAadhaar(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 4) return digits;
  return `XXXX-XXXX-${digits.slice(-4)}`;
}

export function maskBankAccount(raw: string): string {
  const clean = raw.trim();
  if (clean.length <= 4) return clean;
  return `${'X'.repeat(Math.max(4, clean.length - 4))}${clean.slice(-4)}`;
}

function getSubtleCrypto(): SubtleCrypto | null {
  const c = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  return c?.subtle ? c.subtle : null;
}

async function deriveAesKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const subtle = getSubtleCrypto();
  if (!subtle) {
    throw new Error('Web Crypto API unavailable');
  }
  const enc = new TextEncoder();
  const baseKey = await subtle.importKey(
    'raw',
    enc.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptSensitiveText(plainText: string, passphrase: string): Promise<string> {
  const subtle = getSubtleCrypto();
  if (!plainText || !passphrase || !subtle) return '';
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAesKey(passphrase, salt);
  const encoded = new TextEncoder().encode(plainText);
  const cipherBuffer = await subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);

  const combined = new Uint8Array(salt.length + iv.length + cipherBuffer.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(cipherBuffer), salt.length + iv.length);

  let binary = '';
  combined.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

export async function decryptSensitiveText(cipherBase64: string, passphrase: string): Promise<string> {
  const subtle = getSubtleCrypto();
  if (!cipherBase64 || !passphrase || !subtle) return '';
  const binary = atob(cipherBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const salt = bytes.slice(0, 16);
  const iv = bytes.slice(16, 28);
  const data = bytes.slice(28);
  const key = await deriveAesKey(passphrase, salt);
  const plainBuffer = await subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  return new TextDecoder().decode(plainBuffer);
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const nav = navigator as Navigator & {
    msSaveOrOpenBlob?: (b: Blob, name: string) => boolean;
  };
  if (typeof nav.msSaveOrOpenBlob === 'function') {
    nav.msSaveOrOpenBlob(blob, filename);
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 60_000);
}

export function downloadExcelCsv(filename: string, headers: string[], rows: (string | number)[][]): void {
  const escapeCell = (val: string | number) => {
    const str = String(val ?? '');
    if (/[",\r\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const csvLines = [
    headers.map(escapeCell).join(','),
    ...rows.map((r) => r.map(escapeCell).join(',')),
  ];
  // UTF-8 BOM + CRLF so Hindi Devanagari & rows render cleanly in Excel / Google Sheets
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvLines.join('\r\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  triggerBlobDownload(blob, filename);
}

export function downloadWordDoc(filename: string, title: string, htmlBody: string): void {
  const docHtml = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    body { font-family: 'Noto Sans Devanagari', Arial, sans-serif; color: #0f172a; line-height: 1.5; }
    h2, h3 { color: #0f172a; margin-bottom: 6px; }
    table { border-collapse: collapse; width: 100%; margin-top: 12px; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 11px; text-align: left; vertical-align: top; }
    th { background: #f1f5f9; font-weight: bold; }
  </style>
</head>
<body>${htmlBody}</body>
</html>`;
  const blob = new Blob(['\ufeff', docHtml], { type: 'application/msword;charset=utf-8' });
  triggerBlobDownload(blob, filename);
}

// Genuine scannable ISO-18004 QR Code matrix for official A4 PDF/Print notices
export function buildVerificationMatrix(seedText: string): boolean[][] {
  const payload = (seedText || 'HMA-VERIFIED').slice(0, 220);
  const qr = QRCode.create(payload, { errorCorrectionLevel: 'M' });
  const size = qr.modules.size;
  const grid: boolean[][] = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => Boolean(qr.modules.get(r, c)))
  );
  return grid;
}

export function shareViaWhatsApp(text: string): void {
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => a.remove(), 1000);
}

export function buildSmsHref(text: string, phone = ''): string {
  const cleanPhone = phone.replace(/[^\d+]/g, '');
  const isApple = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const sep = isApple ? '&' : '?';
  const trimmed = text.length > 1400 ? `${text.slice(0, 1380)}...` : text;
  return `sms:${cleanPhone}${sep}body=${encodeURIComponent(trimmed)}`;
}

export function shareViaSms(text: string, phone = ''): void {
  const cleanPhone = phone.replace(/[^\d+]/g, '');
  const trimmed = text.length > 1400 ? `${text.slice(0, 1380)}...` : text;
  const win = window as Window & {
    AshaNative?: { sendSms?: (num: string, msg: string) => void };
  };
  if (win.AshaNative && typeof win.AshaNative.sendSms === 'function') {
    win.AshaNative.sendSms(cleanPhone, trimmed);
    return;
  }
  const a = document.createElement('a');
  a.href = buildSmsHref(trimmed, cleanPhone);
  document.body.appendChild(a);
  a.click();
  setTimeout(() => a.remove(), 1000);
}

export function shareViaEmail(subject: string, body: string): void {
  const a = document.createElement('a');
  a.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => a.remove(), 1000);
}

export function safePrintPage(): boolean {
  try {
    const inIframe = window.self !== window.top;
    window.print();
    return !inIframe;
  } catch {
    return false;
  }
}

export async function shareViaSystemOrCopy(
  title: string,
  text: string
): Promise<'shared' | 'copied' | 'failed'> {
  if (navigator.share) {
    try {
      await navigator.share({ title, text });
      return 'shared';
    } catch {
      // Fall back to clipboard if user cancels or iframe blocks Web Share
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'failed';
  }
}

export async function compressImageFile(
  file: File,
  maxDimension = 480,
  quality = 0.65
): Promise<{ dataUrl: string; kb: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image'));
    reader.onload = () => {
      const src = typeof reader.result === 'string' ? reader.result : '';
      if (!src) {
        reject(new Error('Invalid image'));
        return;
      }
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to decode image'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ dataUrl: src, kb: Math.round((src.length * 0.75) / 1024) });
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressed = canvas.toDataURL('image/jpeg', quality);
        const kb = Math.max(1, Math.round((compressed.length * 0.75) / 1024));
        resolve({ dataUrl: compressed, kb });
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}


