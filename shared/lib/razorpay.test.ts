// @vitest-environment node
import { createHmac } from 'node:crypto';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({
  user: vi.fn(), admin: vi.fn(), create: vi.fn(), fetch: vi.fn(), update: vi.fn(), paymentUpsert: vi.fn(),
  matchCoupon: vi.fn(), redemptionFind: vi.fn(), redemptionCreate: vi.fn(),
}));
vi.mock('@/lib/org', () => ({ getRequestUser: mocks.user, isOrganizationAdmin: mocks.admin }));
vi.mock('@/server/admin/managed-coupons', () => ({ matchManagedCoupon: mocks.matchCoupon }));
vi.mock('@/lib/db', () => {
  const tx = {
    organization: { update: mocks.update },
    platformPayment: { upsert: mocks.paymentUpsert },
    planCouponRedemption: { findFirst: mocks.redemptionFind, create: mocks.redemptionCreate },
  };
  return { prisma: { ...tx, $transaction: (callback: (value: typeof tx) => unknown) => callback(tx) } };
});
vi.mock('razorpay', () => ({ default: class { orders = { create: mocks.create, fetch: mocks.fetch }; } }));
import { POST as createOrder } from '@/app/api/create-order/route';
import { POST as verifyPayment } from '@/app/api/verify-payment/route';

const signature = createHmac('sha256', 'test-secret').update('order_123|pay_123').digest('hex');
const payment = { razorpay_order_id: 'order_123', razorpay_payment_id: 'pay_123', razorpay_signature: signature };
const request = (body: unknown, country = 'US') => new NextRequest('http://localhost/api/payment', {
  method: 'POST', body: JSON.stringify(body), headers: { 'x-vercel-ip-country': country },
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('RAZORPAY_KEY_ID', 'test-key'); vi.stubEnv('RAZORPAY_KEY_SECRET', 'test-secret');
  mocks.user.mockResolvedValue({ id: 'user-1', orgId: 'org-1', organization: { plan: 'BASIC' } }); mocks.admin.mockReturnValue(true);
  mocks.create.mockResolvedValue({ id: 'order_123', amount: 2_359, currency: 'USD' });
  mocks.fetch.mockResolvedValue({ id: 'order_123', amount: 2_359, currency: 'USD', notes: { userId: 'user-1', purpose: 'plan_purchase', plan: 'PRO', pricingRegion: 'INTERNATIONAL' } });
  mocks.update.mockResolvedValue({});
  mocks.matchCoupon.mockResolvedValue(null);
  mocks.redemptionFind.mockResolvedValue(null);
});

describe('Razorpay plan endpoints', () => {
  it('creates an international Pro order with server-owned pricing and GST', async () => {
    const response = await createOrder(request({ plan: 'PRO', amount: 100, currency: 'INR' }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ order_id: 'order_123', amount: 2_359, currency: 'USD', key_id: 'test-key', plan: 'PRO', list_amount: 3_999, base_amount: 1_999, discount_amount: 0, discount_percent: null, tax_amount: 360 });
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ amount: 2_359, currency: 'USD', notes: expect.objectContaining({ plan: 'PRO', pricingRegion: 'INTERNATIONAL', country: 'US' }) }));
  });

  it('creates an Indian Advanced order in paise', async () => {
    mocks.create.mockResolvedValue({ id: 'order_123', amount: 188_682, currency: 'INR' });
    const response = await createOrder(request({ plan: 'ADVANCED' }, 'IN'));
    expect(await response.json()).toEqual(expect.objectContaining({ amount: 188_682, currency: 'INR', base_amount: 159_900, tax_amount: 28_782 }));
  });

  it('creates a coupon order from the original price rather than the promotional price', async () => {
    mocks.matchCoupon.mockResolvedValue({ id: 'coupon-10', discountPercent: 10 });
    mocks.create.mockResolvedValue({ id: 'order_123', amount: 169_814, currency: 'INR' });
    const response = await createOrder(request({ plan: 'PRO', coupon: 'SAVE10' }, 'IN'));
    expect(await response.json()).toEqual(expect.objectContaining({
      amount: 169_814,
      list_amount: 159_900,
      base_amount: 143_910,
      discount_amount: 15_990,
      discount_percent: 10,
      tax_amount: 25_904,
    }));
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({
      amount: 169_814,
      notes: expect.objectContaining({ couponId: 'coupon-10', discountPercent: '10', baseAmount: '143910' }),
    }));
  });

  it.each([{}, { plan: 'BASIC' }, { plan: 'pro' }, null])('rejects invalid paid plan input %#', async body => {
    expect((await createOrder(request(body))).status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('requires an authenticated administrator', async () => {
    mocks.user.mockResolvedValueOnce(null);
    expect((await createOrder(request({ plan: 'PRO' }))).status).toBe(401);
    mocks.admin.mockReturnValueOnce(false);
    expect((await verifyPayment(request(payment))).status).toBe(403);
  });

  it.each([401, 500])('handles provider status %s without exposing details', async statusCode => {
    mocks.create.mockRejectedValue({ statusCode, error: 'secret provider details' });
    const response = await createOrder(request({ plan: 'PRO' }));
    expect(response.status).toBe(statusCode);
    expect(await response.text()).not.toContain('secret');
  });

  it('activates the server-recorded plan after a matching signature', async () => {
    const response = await verifyPayment(request(payment));
    expect(await response.json()).toEqual({ success: true, order_id: 'order_123', payment_id: 'pay_123', plan: 'PRO' });
    expect(mocks.update).toHaveBeenCalledWith({ where: { id: 'org-1' }, data: { plan: 'PRO' } });
  });

  it('verifies and records a paid coupon redemption at the discounted original price', async () => {
    mocks.fetch.mockResolvedValue({
      id: 'order_123', amount: 169_814, currency: 'INR',
      notes: { userId: 'user-1', purpose: 'plan_purchase', plan: 'PRO', pricingRegion: 'INDIA', couponId: 'coupon-10', discountPercent: '10' },
    });
    const response = await verifyPayment(request(payment));
    expect(response.status).toBe(200);
    expect(mocks.paymentUpsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ baseAmount: 143_910, taxAmount: 25_904, totalAmount: 169_814 }) }));
    expect(mocks.redemptionCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ couponId: 'coupon-10', requestedPlan: 'PRO' }) });
  });

  it('allows a verified Pro purchase to downgrade an Advanced workspace', async () => {
    mocks.user.mockResolvedValue({ id: 'user-1', orgId: 'org-1', organization: { plan: 'ADVANCED' } });
    const response = await verifyPayment(request(payment));
    expect(await response.json()).toEqual(expect.objectContaining({ success: true, plan: 'PRO' }));
    expect(mocks.update).toHaveBeenCalledWith({ where: { id: 'org-1' }, data: { plan: 'PRO' } });
  });

  it('rejects a mismatching signature without changing the plan', async () => {
    expect((await verifyPayment(request({ ...payment, razorpay_signature: '0'.repeat(64) }))).status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('rejects tampered order pricing without changing the plan', async () => {
    mocks.fetch.mockResolvedValue({ id: 'order_123', amount: 100, currency: 'USD', notes: { userId: 'user-1', purpose: 'plan_purchase', plan: 'PRO', pricingRegion: 'INTERNATIONAL' } });
    expect((await verifyPayment(request(payment))).status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('rejects missing fields and another user’s order', async () => {
    expect((await verifyPayment(request({}))).status).toBe(400);
    mocks.fetch.mockResolvedValue({ id: 'order_123', amount: 2_359, currency: 'USD', notes: { userId: 'user-2', purpose: 'plan_purchase', plan: 'PRO', pricingRegion: 'INTERNATIONAL' } });
    expect((await verifyPayment(request(payment))).status).toBe(403);
  });
});
