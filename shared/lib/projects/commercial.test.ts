import { describe, expect, it } from 'vitest';
import {
  generateProjectPaymentOccurrences,
  parseProjectCommercials,
} from './commercial';

describe('project commercials', () => {
  it('normalizes a retainer configuration', () => {
    const result = parseProjectCommercials({
      paymentType: 'retainer',
      paymentAmount: '2500',
      paymentFrequency: 'quarterly',
      paymentStartDate: '2026-01-15',
      paymentTerms: 'Payment is due within 30 days of the invoice date.',
    });

    expect(result.error).toBeUndefined();
    expect(result.data).toMatchObject({
      paymentType: 'RETAINER',
      paymentAmount: 2500,
      paymentFrequency: 'quarterly',
      paymentTerms: 'Payment is due within 30 days of the invoice date.',
    });
  });

  it('removes recurrence from a one-time payment', () => {
    const result = parseProjectCommercials({
      paymentType: 'ONE_TIME',
      paymentAmount: 8000,
      paymentFrequency: 'monthly',
      paymentStartDate: '2026-01-15',
      paymentTerms: 'Payment is due on receipt.',
    });

    expect(result.data?.paymentFrequency).toBeNull();
  });

  it('keeps payment terms optional', () => {
    const result = parseProjectCommercials({
      paymentType: 'RETAINER',
      paymentAmount: 2500,
      paymentFrequency: 'monthly',
      paymentStartDate: '2026-01-15',
      paymentTerms: '',
    });

    expect(result.error).toBeUndefined();
    expect(result.data?.paymentTerms).toBeNull();
  });

  it('recognizes a one-time payment once', () => {
    expect(generateProjectPaymentOccurrences({
      paymentType: 'ONE_TIME',
      paymentAmount: 8000,
      paymentStartDate: '2025-01-15',
      startDate: '2025-01-01',
    })).toHaveLength(1);
  });
});
