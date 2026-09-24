import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  getRequestUser: vi.fn(),
  isOrganizationAdmin: vi.fn(),
  orderFetch: vi.fn(),
  paymentFetch: vi.fn(),
  verifySignature: vi.fn(),
  transaction: vi.fn(),
  organizationUpdate: vi.fn(),
  paymentUpsert: vi.fn(),
  redemptionFind: vi.fn(),
  redemptionCreate: vi.fn(),
}));

const transactionClient = {
  organization: { update: mocks.organizationUpdate },
  platformPayment: { upsert: mocks.paymentUpsert },
  planCouponRedemption: { findFirst: mocks.redemptionFind, create: mocks.redemptionCreate },
};

vi.mock('@/lib/org', () => ({
  getRequestUser: mocks.getRequestUser,
  isOrganizationAdmin: mocks.isOrganizationAdmin,
}));
vi.mock('@/lib/razorpay', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/razorpay')>();
  return {
    ...original,
    getRazorpay: () => ({
      client: { orders: { fetch: mocks.orderFetch }, payments: { fetch: mocks.paymentFetch } },
      secret: 'secret',
    }),
    verifyRazorpaySignature: mocks.verifySignature,
  };
});
vi.mock('@/lib/db', () => ({
  prisma: {
    $transaction: mocks.transaction,
  },
}));

import { POST } from './route';

const paymentRequest = () => new NextRequest('http://localhost/api/verify-payment', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    razorpay_order_id: 'order_123',
    razorpay_payment_id: 'pay_123',
    razorpay_signature: 'a'.repeat(64),
  }),
});

describe('payment verification coupon usage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRequestUser.mockResolvedValue({
      id: 'user-1',
      orgId: 'org-1',
      role: 'admin',
      organization: { plan: 'BASIC' },
    });
    mocks.isOrganizationAdmin.mockReturnValue(true);
    mocks.verifySignature.mockReturnValue(true);
    mocks.orderFetch.mockResolvedValue({
      id: 'order_123',
      amount: 4_247,
      currency: 'USD',
      notes: {
        userId: 'user-1',
        purpose: 'plan_purchase',
        plan: 'PRO',
        pricingRegion: 'INTERNATIONAL',
        couponId: 'save-10',
        discountPercent: '10',
      },
    });
    mocks.paymentFetch.mockResolvedValue({
      id: 'pay_123',
      order_id: 'order_123',
      amount: 4_247,
      currency: 'USD',
      status: 'captured',
    });
    mocks.redemptionFind.mockResolvedValue(null);
    mocks.transaction.mockImplementation((callback: (tx: typeof transactionClient) => unknown) => callback(transactionClient));
  });

  it('does not consume a coupon while the payment is incomplete', async () => {
    mocks.paymentFetch.mockResolvedValue({
      id: 'pay_123',
      order_id: 'order_123',
      amount: 4_247,
      currency: 'USD',
      status: 'authorized',
    });

    const response = await POST(paymentRequest());

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Payment has not completed.' });
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.redemptionCreate).not.toHaveBeenCalled();
  });

  it('records coupon usage only after Razorpay reports a captured payment', async () => {
    const response = await POST(paymentRequest());

    expect(response.status).toBe(200);
    expect(mocks.paymentUpsert).toHaveBeenCalled();
    expect(mocks.redemptionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        couponId: 'save-10',
        requestedPlan: 'PRO',
        activatedPlan: 'PRO',
      }),
    });
  });
});
