import type { InvoicePartySnapshot } from './types';

type BillingEntity = {
  name: string;
  legalEntityName?: string | null;
  billingEmail?: string | null;
  billingAddressLine1?: string | null;
  billingAddressLine2?: string | null;
  billingCity?: string | null;
  billingState?: string | null;
  billingPostalCode?: string | null;
  billingCountry?: string | null;
  gstNumber?: string | null;
};

const REQUIRED_ADDRESS_FIELDS = [
  ['billingAddressLine1', 'address line 1'],
  ['billingCity', 'city'],
  ['billingState', 'state / region'],
  ['billingPostalCode', 'postal code'],
  ['billingCountry', 'country'],
] as const;

export function missingBillingProfileFields(
  entity: BillingEntity,
  options: { requireLegalName: boolean; label: string },
) {
  const missing: string[] = [];
  if (options.requireLegalName && !entity.legalEntityName?.trim()) {
    missing.push(`${options.label} legal entity name`);
  }
  for (const [key, label] of REQUIRED_ADDRESS_FIELDS) {
    if (!entity[key]?.trim()) missing.push(`${options.label} ${label}`);
  }
  return missing;
}

export function billingSnapshot(
  entity: BillingEntity,
  email: string,
): InvoicePartySnapshot {
  return {
    name: entity.name.trim(),
    legalEntityName: entity.legalEntityName?.trim() || entity.name.trim(),
    email: email.trim().toLowerCase(),
    addressLine1: entity.billingAddressLine1?.trim() || '',
    addressLine2: entity.billingAddressLine2?.trim() || '',
    city: entity.billingCity?.trim() || '',
    state: entity.billingState?.trim() || '',
    postalCode: entity.billingPostalCode?.trim() || '',
    country: entity.billingCountry?.trim() || '',
    gstNumber: entity.gstNumber?.trim().toUpperCase() || '',
  };
}

export function invoiceDueDate(issueDate: Date) {
  return new Date(issueDate.getTime() + 14 * 24 * 60 * 60 * 1000);
}

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function invoicePaymentStatus(amount: number, paidAmount: number) {
  const paid = roundMoney(Math.max(0, paidAmount));
  if (paid <= 0) return 'UNPAID';
  if (paid + 0.005 < roundMoney(amount)) return 'PARTIALLY_PAID';
  return 'FULLY_PAID';
}
