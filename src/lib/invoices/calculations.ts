import { roundMoney } from './billing-profile';
import type { InvoiceLineItem } from './types';

export const INVOICE_TYPES = ['TAX'] as const;
export type InvoiceType = (typeof INVOICE_TYPES)[number];
export const MAX_INVOICE_ITEMS = 8;

export type InvoiceLineItemInput = {
  description: unknown;
  quantity: unknown;
  unitPrice: unknown;
  taxRate?: unknown;
};

export function calculateInvoiceItems(values: InvoiceLineItemInput[]) {
  if (!Array.isArray(values) || values.length < 1 || values.length > MAX_INVOICE_ITEMS) {
    throw new Error(`An invoice must contain between 1 and ${MAX_INVOICE_ITEMS} items.`);
  }
  const lineItems: InvoiceLineItem[] = values.map((value, index) => {
    const description = String(value.description || '').trim();
    const quantity = Number(value.quantity);
    const unitPrice = Number(value.unitPrice);
    const taxRate = value.taxRate === undefined ? 18 : Number(value.taxRate);
    if (!description) throw new Error(`Item ${index + 1} needs a name or deliverable.`);
    if (!Number.isFinite(quantity) || quantity <= 0) throw new Error(`Item ${index + 1} quantity must be greater than zero.`);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) throw new Error(`Item ${index + 1} price must be zero or greater.`);
    if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 40) {
      throw new Error(`Item ${index + 1} tax must be between 0% and 40%.`);
    }
    const amount = roundMoney(quantity * unitPrice);
    const taxAmount = roundMoney(amount * taxRate / 100);
    return {
      description,
      quantity,
      unitPrice: roundMoney(unitPrice),
      amount,
      taxRate,
      taxAmount,
      total: roundMoney(amount + taxAmount),
    };
  });
  const subtotal = roundMoney(lineItems.reduce((sum, item) => sum + item.amount, 0));
  const taxAmount = roundMoney(lineItems.reduce((sum, item) => sum + (item.taxAmount || 0), 0));
  const total = roundMoney(subtotal + taxAmount);
  const taxRate = subtotal > 0 ? roundMoney((taxAmount / subtotal) * 100) : 0;
  return { lineItems, subtotal, taxAmount, total, taxRate };
}

export function calculateInvoiceItemsWithOverallTax(
  values: InvoiceLineItemInput[],
  invoiceTaxRate: unknown,
) {
  const taxRate = Number(invoiceTaxRate);
  if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 40) {
    throw new Error('Invoice tax must be between 0% and 40%.');
  }
  const untaxed = calculateInvoiceItems(values.map((value) => ({ ...value, taxRate: 0 })));
  const taxAmount = roundMoney(untaxed.subtotal * taxRate / 100);
  return {
    ...untaxed,
    lineItems: untaxed.lineItems.map((item) => ({
      ...item,
      taxRate: 0,
      taxAmount: 0,
      total: item.amount,
    })),
    taxRate,
    taxAmount,
    total: roundMoney(untaxed.subtotal + taxAmount),
  };
}

export function allocateProjectValue(input: {
  deliverables: string[];
  itemCount: number;
  total: number;
  taxRate: number;
  fallbackDescription: string;
}) {
  const itemCount = Math.max(1, Math.min(MAX_INVOICE_ITEMS, Math.trunc(input.itemCount)));
  const total = roundMoney(input.total);
  if (!Number.isFinite(total) || total <= 0) throw new Error('Project value must be greater than zero.');
  const names = input.deliverables.map((item) => item.trim()).filter(Boolean);
  const grossShare = roundMoney(total / itemCount);
  let allocatedGross = 0;
  const items: InvoiceLineItemInput[] = Array.from({ length: itemCount }, (_, index) => {
    const gross = index === itemCount - 1 ? roundMoney(total - allocatedGross) : grossShare;
    allocatedGross = roundMoney(allocatedGross + gross);
    const unitPrice = input.taxRate > 0 ? roundMoney(gross / (1 + input.taxRate / 100)) : gross;
    return {
      description: names[index] || `${input.fallbackDescription} — Deliverable ${index + 1}`,
      quantity: 1,
      unitPrice,
      taxRate: input.taxRate,
    };
  });
  const calculated = calculateInvoiceItems(items);
  // Rounding each tax line can occasionally differ from the configured project
  // value by one cent. Carry that cent on the final tax line to preserve the
  // signed commercial total exactly.
  const difference = roundMoney(total - calculated.total);
  if (difference !== 0) {
    const last = calculated.lineItems[calculated.lineItems.length - 1];
    last.taxAmount = roundMoney((last.taxAmount || 0) + difference);
    last.total = roundMoney(last.amount + last.taxAmount);
    calculated.taxAmount = roundMoney(calculated.taxAmount + difference);
    calculated.total = total;
    calculated.taxRate = calculated.subtotal > 0
      ? roundMoney((calculated.taxAmount / calculated.subtotal) * 100)
      : 0;
  }
  return calculated;
}
