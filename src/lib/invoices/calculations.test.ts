import { describe, expect, it } from 'vitest';
import {
  allocateProjectValue,
  calculateInvoiceItems,
  calculateInvoiceItemsWithOverallTax,
} from './calculations';

describe('invoice calculations', () => {
  it('calculates item-level taxes and totals', () => {
    const result = calculateInvoiceItems([
      { description: 'Strategy', quantity: 2, unitPrice: 100, taxRate: 18 },
      { description: 'Hosting', quantity: 1, unitPrice: 50, taxRate: 0 },
    ]);
    expect(result.subtotal).toBe(250);
    expect(result.taxAmount).toBe(36);
    expect(result.total).toBe(286);
  });

  it('rejects tax outside the supported range', () => {
    expect(() => calculateInvoiceItems([
      { description: 'Strategy', quantity: 1, unitPrice: 100, taxRate: 41 },
    ])).toThrow('between 0% and 40%');
  });

  it('applies one tax rate to the invoice subtotal', () => {
    const result = calculateInvoiceItemsWithOverallTax([
      { description: 'Strategy', quantity: 2, unitPrice: 100 },
      { description: 'Hosting', quantity: 1, unitPrice: 50 },
    ], 18);
    expect(result.subtotal).toBe(250);
    expect(result.taxAmount).toBe(45);
    expect(result.total).toBe(295);
    expect(result.lineItems.every((item) => item.taxAmount === 0)).toBe(true);
  });

  it('splits a project value exactly across the requested deliverables', () => {
    const result = allocateProjectValue({
      deliverables: ['Discovery', 'Design', 'Launch'],
      itemCount: 3,
      total: 10_000,
      taxRate: 18,
      fallbackDescription: 'Website',
    });
    expect(result.lineItems.map((item) => item.description)).toEqual(['Discovery', 'Design', 'Launch']);
    expect(result.total).toBe(10_000);
  });
});
