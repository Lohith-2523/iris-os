import { roundMoney } from './billing-profile';

export const DEFAULT_INVOICE_BRAND_COLOR = '#09090B';
export const GST_RATE = 18;
export const MAX_INVOICE_LOGO_BYTES = 512 * 1024;

export function normalizeInvoiceBrandColor(value: unknown) {
  const candidate = String(value || '').trim().toUpperCase();
  return /^#[0-9A-F]{6}$/.test(candidate) ? candidate : DEFAULT_INVOICE_BRAND_COLOR;
}

export function validateInvoiceLogoDataUrl(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return { value: null as string | null };
  }
  if (typeof value !== 'string') return { error: 'Invoice logo must be an image.' };
  const match = value.match(/^data:(image\/(?:png|jpeg));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return { error: 'Invoice logo must be a PNG or JPEG image.' };
  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.length === 0 || bytes.length > MAX_INVOICE_LOGO_BYTES) {
    return { error: 'Invoice logo must be 512 KB or smaller.' };
  }
  const isPng = bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9;
  if ((match[1] === 'image/png' && !isPng) || (match[1] === 'image/jpeg' && !isJpeg)) {
    return { error: 'Invoice logo contents do not match the selected image type.' };
  }
  return { value };
}

export function inclusiveGstBreakdown(grossAmount: number, hasAgencyGst: boolean) {
  const total = roundMoney(grossAmount);
  if (!hasAgencyGst) {
    return { subtotal: total, taxRate: 0, taxAmount: 0, total };
  }
  const subtotal = roundMoney(total / (1 + GST_RATE / 100));
  return {
    subtotal,
    taxRate: GST_RATE,
    taxAmount: roundMoney(total - subtotal),
    total,
  };
}
