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
      paymentTerms: 'net_30',
    });

    expect(result.error).toBeUndefined();
    expect(result.data).toMatchObject({
      paymentType: 'RETAINER',
      paymentAmount: 2500,
      paymentFrequency: 'quarterly',
      paymentTerms: 'NET_30',
    });
  });

  it('removes recurrence from a one-time payment', () => {
    const result = parseProjectCommercials({
      paymentType: 'ONE_TIME',
      paymentAmount: 8000,
      paymentFrequency: 'monthly',
      paymentStartDate: '2026-01-15',
      paymentTerms: 'DUE_ON_RECEIPT',
    });

    expect(result.data?.paymentFrequency).toBeNull();
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
