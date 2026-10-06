import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  clientFindMany: vi.fn(),
  invoiceFindMany: vi.fn(),
  invoiceCreateMany: vi.fn(),
  invoiceUpdate: vi.fn(),
  transactionCreateManyAndReturn: vi.fn(),
  getOrganization: vi.fn(),
  getRequestUser: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    client: { findMany: mocks.clientFindMany },
    invoice: { findMany: mocks.invoiceFindMany },
    $transaction: vi.fn(async (work: (tx: unknown) => unknown) => work({
      invoice: { createMany: mocks.invoiceCreateMany, update: mocks.invoiceUpdate },
      transaction: { createManyAndReturn: mocks.transactionCreateManyAndReturn },
    })),
  },
}));
vi.mock('@/lib/org', () => ({
  getOrganization: mocks.getOrganization,
  getRequestUser: mocks.getRequestUser,
  isOrganizationAdmin: () => true,
}));

import { POST } from './route';

const client = {
  id: 'client-1',
  name: 'Northstar Studio',
  legalEntityName: 'Northstar Studio Pvt Ltd',
  billingAddressLine1: '12 Market Road',
  billingAddressLine2: '',
  billingCity: 'Bengaluru',
  billingState: 'Karnataka',
  billingPostalCode: '560001',
  billingCountry: 'India',
  gstNumber: '',
};

describe('historical revenue import', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getOrganization.mockResolvedValue({
      id: 'org-1', name: 'Iris Agency', legalEntityName: 'Iris Agency Pvt Ltd', billingEmail: 'billing@iris.test',
      billingAddressLine1: '1 Main Street', billingAddressLine2: '', billingCity: 'Mumbai', billingState: 'Maharashtra',
      billingPostalCode: '400001', billingCountry: 'India', gstNumber: '', bankNames: ['HDFC Bank'],
    });
    mocks.getRequestUser.mockResolvedValue({ id: 'user-1', orgId: 'org-1', role: 'admin' });
    mocks.clientFindMany.mockResolvedValue([client]);
    mocks.invoiceFindMany.mockResolvedValue([]);
    mocks.invoiceCreateMany.mockResolvedValue({ count: 1 });
    mocks.transactionCreateManyAndReturn.mockImplementation(async ({ data }) => (
      data.map((record: object, index: number) => ({ id: `transaction-${index + 1}`, ...record }))
    ));
  });

  it('creates a fully paid invoice and linked transaction with the transaction date', async () => {
    const response = await POST(new NextRequest('https://iris.example/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bulk: true,
        historicalRevenue: true,
        transactions: [{
          historicalRevenue: true,
          sourceRow: 2,
          date: '2024-03-15T00:00:00.000Z',
          clientReference: 'Northstar Studio [client-1]',
          details: 'Historical brand retainer',
          type: 'NEFT',
          yourAccount: 'HDFC Bank',
          amount: 125000,
          category: 'Revenue',
        }],
      }),
    }));

    expect(response.status).toBe(200);
    expect(mocks.invoiceCreateMany).toHaveBeenCalledWith({ data: [expect.objectContaining({
      clientId: 'client-1',
      source: 'HISTORICAL_IMPORT',
      status: 'FULLY_PAID',
      amount: 125000,
      paidAmount: 125000,
      issuedDate: new Date('2024-03-15T00:00:00.000Z'),
      dueDate: new Date('2024-03-15T00:00:00.000Z'),
    })] });
    const invoiceId = mocks.invoiceCreateMany.mock.calls[0][0].data[0].id;
    expect(mocks.transactionCreateManyAndReturn).toHaveBeenCalledWith({ data: [expect.objectContaining({
      invoiceId,
      clientId: 'client-1',
      date: new Date('2024-03-15T00:00:00.000Z'),
      amount: 125000,
    })] });
  });

  it('rejects a historical row that does not reference a current client', async () => {
    const response = await POST(new NextRequest('https://iris.example/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bulk: true,
        historicalRevenue: true,
        transactions: [{ historicalRevenue: true, sourceRow: 2, date: '2024-03-15', clientReference: 'Unknown', details: 'Old revenue', type: 'NEFT', yourAccount: 'HDFC Bank', amount: 1000, category: 'Revenue' }],
      }),
    }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual(expect.objectContaining({ rejected: [{ row: 2, reason: expect.stringContaining('valid client') }] }));
    expect(mocks.invoiceCreateMany).not.toHaveBeenCalled();
  });

  it('bulk-inserts historical invoices and transactions instead of writing each row sequentially', async () => {
    const transactions = Array.from({ length: 100 }, (_, index) => ({
      historicalRevenue: true,
      sourceRow: index + 2,
      date: '2024-03-15T00:00:00.000Z',
      clientReference: 'Northstar Studio [client-1]',
      details: `Historical revenue ${index + 1}`,
      type: 'NEFT',
      yourAccount: 'HDFC Bank',
      amount: 1000 + index,
      category: 'Revenue',
    }));

    const response = await POST(new NextRequest('https://iris.example/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bulk: true, historicalRevenue: true, transactions }),
    }));

    expect(response.status).toBe(200);
    expect(mocks.invoiceCreateMany).toHaveBeenCalledTimes(1);
    const invoiceRecords = mocks.invoiceCreateMany.mock.calls[0][0].data;
    expect(invoiceRecords).toHaveLength(100);
    expect(mocks.transactionCreateManyAndReturn).toHaveBeenCalledTimes(1);
    const transactionRecords = mocks.transactionCreateManyAndReturn.mock.calls[0][0].data;
    expect(transactionRecords).toHaveLength(100);
    const invoiceIds = new Set(invoiceRecords.map((invoice: { id: string }) => invoice.id));
    expect(invoiceIds.size).toBe(100);
    expect(transactionRecords.every((transaction: { invoiceId: string }) => invoiceIds.has(transaction.invoiceId))).toBe(true);
  });
});
