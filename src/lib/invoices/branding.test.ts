import { describe, expect, it } from 'vitest';
import {
  inclusiveGstBreakdown,
  normalizeInvoiceBrandColor,
} from './branding';

describe('invoice branding and GST', () => {
  it('treats the project payment as GST-inclusive when agency GST exists', () => {
    expect(inclusiveGstBreakdown(118_000, true)).toEqual({
      subtotal: 100_000,
      taxRate: 18,
      taxAmount: 18_000,
      total: 118_000,
    });
  });

  it('does not apply tax without an agency GST number', () => {
    expect(inclusiveGstBreakdown(118_000, false)).toEqual({
      subtotal: 118_000,
      taxRate: 0,
      taxAmount: 0,
      total: 118_000,
    });
  });

  it('accepts only six-digit hex brand colors', () => {
    expect(normalizeInvoiceBrandColor('#7c3aed')).toBe('#7C3AED');
    expect(normalizeInvoiceBrandColor('purple')).toBe('#09090B');
  });
});
