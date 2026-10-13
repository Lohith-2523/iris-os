// @vitest-environment node
import { createHmac } from 'node:crypto';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({
  user: vi.fn(), admin: vi.fn(), create: vi.fn(), fetch: vi.fn(), paymentFetch: vi.fn(), update: vi.fn(), paymentUpsert: vi.fn(),
  matchCoupon: vi.fn(), getOnboardingCoupon: vi.fn(), redemptionFind: vi.fn(), redemptionCreate: vi.fn(),
}));
vi.mock('@/lib/org', () => ({ getRequestUser: mocks.user, isOrganizationAdmin: mocks.admin }));
vi.mock('@/server/admin/managed-coupons', () => ({ matchManagedCoupon: mocks.matchCoupon, getOnboardingManagedCoupon: mocks.getOnboardingCoupon }));
vi.mock('@/lib/db', () => {
  const tx = {
    organization: { update: mocks.update },
    platformPayment: { upsert: mocks.paymentUpsert },
    planCouponRedemption: { findFirst: mocks.redemptionFind, create: mocks.redemptionCreate },
  };
  return { prisma: { ...tx, $transaction: (callback: (value: typeof tx) => unknown) => callback(tx) } };
});
vi.mock('razorpay', () => ({ default: class { orders = { create: mocks.create, fetch: mocks.fetch }; payments = { fetch: mocks.paymentFetch }; } }));
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
  mocks.create.mockResolvedValue({ id: 'order_123', amount: 1_297, currency: 'USD' });
  mocks.fetch.mockResolvedValue({ id: 'order_123', amount: 1_297, currency: 'USD', notes: { userId: 'user-1', purpose: 'plan_purchase', plan: 'PRO', pricingRegion: 'INTERNATIONAL' } });
  mocks.paymentFetch.mockResolvedValue({ order_id: 'order_123', status: 'captured', amount: 1_297, currency: 'USD' });
  mocks.update.mockResolvedValue({});
  mocks.matchCoupon.mockResolvedValue(null);
  mocks.getOnboardingCoupon.mockResolvedValue(null);
  mocks.redemptionFind.mockResolvedValue(null);
});

describe('Razorpay plan endpoints', () => {
  it('creates an international Pro order with server-owned pricing and GST', async () => {
    const response = await createOrder(request({ plan: 'PRO', amount: 100, currency: 'INR' }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ order_id: 'order_123', amount: 1_297, currency: 'USD', key_id: 'test-key', plan: 'PRO', list_amount: 2_199, base_amount: 1_099, discount_amount: 0, discount_percent: null, tax_amount: 198 });
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ amount: 1_297, currency: 'USD', notes: expect.objectContaining({ plan: 'PRO', pricingRegion: 'INTERNATIONAL', country: 'US' }) }));
  });

  it('creates an Indian Advanced order in paise', async () => {
    mocks.create.mockResolvedValue({ id: 'order_123', amount: 117_882, currency: 'INR' });
    const response = await createOrder(request({ plan: 'ADVANCED' }, 'IN'));
    expect(await response.json()).toEqual(expect.objectContaining({ amount: 117_882, currency: 'INR', base_amount: 99_900, tax_amount: 17_982 }));
  });

  it('creates a coupon order from the original price rather than the promotional price', async () => {
    mocks.matchCoupon.mockResolvedValue({ id: 'coupon-10', discountPercent: 10 });
    mocks.create.mockResolvedValue({ id: 'order_123', amount: 106_094, currency: 'INR' });
    const response = await createOrder(request({ plan: 'PRO', coupon: 'SAVE10' }, 'IN'));
    expect(await response.json()).toEqual(expect.objectContaining({
      amount: 106_094,
      list_amount: 99_900,
      base_amount: 89_910,
      discount_amount: 9_990,
      discount_percent: 10,
      tax_amount: 16_184,
    }));
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({
      amount: 106_094,
      notes: expect.objectContaining({ couponId: 'coupon-10', discountPercent: '10', baseAmount: '89910' }),
    }));
  });

  it('automatically applies the 50% coupon during onboarding and counts it only after captured payment', async () => {
    mocks.user.mockResolvedValue({
      id: 'user-1', orgId: 'org-1',
      organization: { plan: 'BASIC', onboardingState: { needsOnboarding: true } },
    });
    mocks.getOnboardingCoupon.mockResolvedValue({ id: 'onboarding-50', discountPercent: 50 });
    mocks.create.mockResolvedValue({ id: 'order_123', amount: 58_882, currency: 'INR' });

    const orderResponse = await createOrder(request({ plan: 'PRO' }, 'IN'));

    expect(await orderResponse.json()).toEqual(expect.objectContaining({
      amount: 58_882,
      list_amount: 99_900,
      base_amount: 49_900,
      discount_amount: 50_000,
      discount_percent: 50,
      tax_amount: 8_982,
    }));
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({
      notes: expect.objectContaining({ couponId: 'onboarding-50', discountPercent: '50', baseAmount: '49900', taxAmount: '8982' }),
    }));
    expect(mocks.redemptionCreate).not.toHaveBeenCalled();

    mocks.fetch.mockResolvedValue({
      id: 'order_123', amount: 58_882, currency: 'INR',
      notes: { userId: 'user-1', purpose: 'plan_purchase', plan: 'PRO', pricingRegion: 'INDIA', couponId: 'onboarding-50', discountPercent: '50' },
    });
    mocks.paymentFetch.mockResolvedValue({ order_id: 'order_123', status: 'captured', amount: 58_882, currency: 'INR' });

    const verificationResponse = await verifyPayment(request(payment));

    expect(verificationResponse.status).toBe(200);
    expect(mocks.redemptionCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ couponId: 'onboarding-50', requestedPlan: 'PRO' }) });
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

  it('does not create a checkout order for a paid-plan downgrade', async () => {
    mocks.user.mockResolvedValue({ id: 'user-1', orgId: 'org-1', organization: { plan: 'ADVANCED' } });

    const response = await createOrder(request({ plan: 'PRO' }));

    expect(response.status).toBe(409);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('verifies and records a paid coupon redemption at the discounted original price', async () => {
    mocks.fetch.mockResolvedValue({
      id: 'order_123', amount: 106_094, currency: 'INR',
      notes: { userId: 'user-1', purpose: 'plan_purchase', plan: 'PRO', pricingRegion: 'INDIA', couponId: 'coupon-10', discountPercent: '10' },
    });
    mocks.paymentFetch.mockResolvedValue({ order_id: 'order_123', status: 'captured', amount: 106_094, currency: 'INR' });
    const response = await verifyPayment(request(payment));
    expect(response.status).toBe(200);
    expect(mocks.paymentUpsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ baseAmount: 89_910, taxAmount: 16_184, totalAmount: 106_094 }) }));
    expect(mocks.redemptionCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ couponId: 'coupon-10', requestedPlan: 'PRO' }) });
  });

  it('rejects a verified Pro purchase that would downgrade an Advanced workspace', async () => {
    mocks.user.mockResolvedValue({ id: 'user-1', orgId: 'org-1', organization: { plan: 'ADVANCED' } });
    const response = await verifyPayment(request(payment));
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: 'Paid plans can only be upgraded. Cancel the current plan to switch to Free.' });
    expect(mocks.update).not.toHaveBeenCalled();
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
    mocks.fetch.mockResolvedValue({ id: 'order_123', amount: 1_297, currency: 'USD', notes: { userId: 'user-2', purpose: 'plan_purchase', plan: 'PRO', pricingRegion: 'INTERNATIONAL' } });
    expect((await verifyPayment(request(payment))).status).toBe(403);
  });
});
