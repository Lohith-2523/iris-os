import { describe, expect, it } from 'vitest';
import {
  invoiceDueDate,
  invoicePaymentStatus,
  missingBillingProfileFields,
} from './billing-profile';

describe('invoice billing rules', () => {
  it('requires a complete address and the agency legal name', () => {
    expect(missingBillingProfileFields({
      name: 'Iris Studio',
      legalEntityName: '',
      billingAddressLine1: '1 Main Street',
      billingCity: '',
      billingState: 'Karnataka',
      billingPostalCode: '560001',
      billingCountry: 'India',
    }, { requireLegalName: true, label: 'agency' })).toEqual([
      'agency legal entity name',
      'agency city',
    ]);
  });

  it('sets every invoice due date fourteen days after its issue date', () => {
    const issueDate = new Date('2026-07-28T12:00:00.000Z');
    expect(invoiceDueDate(issueDate).toISOString()).toBe('2026-08-11T12:00:00.000Z');
  });

  it('derives exactly the three immutable payment states', () => {
    expect(invoicePaymentStatus(1000, 0)).toBe('UNPAID');
    expect(invoicePaymentStatus(1000, 250)).toBe('PARTIALLY_PAID');
    expect(invoicePaymentStatus(1000, 1000)).toBe('FULLY_PAID');
    expect(invoicePaymentStatus(1000, 1200)).toBe('FULLY_PAID');
  });
});
