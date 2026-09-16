import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getRequestUser: vi.fn(),
  isOrganizationAdmin: vi.fn(),
  matchManagedCoupon: vi.fn(),
  securityFind: vi.fn(),
  securityUpsert: vi.fn(),
  securityDelete: vi.fn(),
  organizationFind: vi.fn(),
  organizationUpdate: vi.fn(),
  redemptionCreate: vi.fn(),
  redemptionFind: vi.fn(),
  redemptionCount: vi.fn(),
  managedCouponFind: vi.fn(),
}));

const transactionClient = {
  $queryRaw: vi.fn(),
  planCouponSecurityState: { findUnique: mocks.securityFind, upsert: mocks.securityUpsert, deleteMany: mocks.securityDelete },
  organization: { findUniqueOrThrow: mocks.organizationFind, update: mocks.organizationUpdate },
  planCouponRedemption: { findFirst: mocks.redemptionFind, create: mocks.redemptionCreate, count: mocks.redemptionCount },
  managedCoupon: { findUnique: mocks.managedCouponFind },
};

vi.mock('@/lib/org', () => ({ getRequestUser: mocks.getRequestUser, isOrganizationAdmin: mocks.isOrganizationAdmin }));
vi.mock('@/server/admin/managed-coupons', () => ({ matchManagedCoupon: mocks.matchManagedCoupon }));
vi.mock('@/lib/db', () => ({ prisma: {
  planCouponSecurityState: { findUnique: mocks.securityFind },
  $transaction: vi.fn((callback: (tx: typeof transactionClient) => unknown) => callback(transactionClient)),
} }));

import { POST } from './route';

function request(body: unknown) {
  return new NextRequest('http://localhost/api/plan-coupons/redeem', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('plan coupon redemption route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRequestUser.mockResolvedValue({ id: 'user-1', orgId: 'org-1', role: 'admin' });
    mocks.isOrganizationAdmin.mockReturnValue(true);
    mocks.securityFind.mockResolvedValue(null);
    mocks.organizationFind.mockResolvedValue({ plan: 'BASIC' });
    mocks.redemptionFind.mockResolvedValue(null);
    mocks.redemptionCount.mockResolvedValue(0);
    mocks.managedCouponFind.mockResolvedValue({ enabled: true, startsAt: new Date(0), endsAt: null, plan: 'ANY', maxUses: null });
  });

  it('requires an organization administrator', async () => {
    mocks.isOrganizationAdmin.mockReturnValue(false);
    const response = await POST(request({ plan: 'PRO', coupon: 'typed-value' }));
    expect(response.status).toBe(403);
    expect(mocks.matchManagedCoupon).not.toHaveBeenCalled();
  });

  it('records a failed exact-match attempt without storing the submitted value', async () => {
    mocks.matchManagedCoupon.mockResolvedValue(null);
    const response = await POST(request({ plan: 'PRO', coupon: 'typed-value' }));
    expect(response.status).toBe(400);
    expect(mocks.securityUpsert).toHaveBeenCalled();
    expect(JSON.stringify(mocks.securityUpsert.mock.calls)).not.toContain('typed-value');
    expect(mocks.organizationUpdate).not.toHaveBeenCalled();
  });

  it('activates the selected paid plan without creating a payment order', async () => {
    mocks.matchManagedCoupon.mockResolvedValue('standard');
    const response = await POST(request({ plan: 'ADVANCED', coupon: 'typed-value' }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true, plan: 'ADVANCED' });
    expect(mocks.organizationUpdate).toHaveBeenCalledWith({ where: { id: 'org-1' }, data: { plan: 'ADVANCED' } });
    expect(mocks.redemptionCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ couponId: 'standard', requestedPlan: 'ADVANCED' }) });
    expect(transactionClient.$queryRaw).toHaveBeenCalledTimes(3);
    for (const [queryParts] of transactionClient.$queryRaw.mock.calls) {
      expect(Array.from(queryParts as TemplateStringsArray).join('?')).toContain('::text AS "lockAcquired"');
    }
  });

  it('validates a coupon without changing the organization plan', async () => {
    mocks.matchManagedCoupon.mockResolvedValue('standard');
    const response = await POST(request({ plan: 'PRO', coupon: 'typed-value', action: 'VALIDATE' }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true, valid: true });
    expect(mocks.organizationUpdate).not.toHaveBeenCalled();
    expect(mocks.redemptionCreate).not.toHaveBeenCalled();
    expect(mocks.securityDelete).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
  });

  it('keeps a repeated successful redemption idempotent', async () => {
    mocks.matchManagedCoupon.mockResolvedValue('standard');
    mocks.organizationFind.mockResolvedValue({ plan: 'PRO' });
    mocks.redemptionFind.mockResolvedValue({ id: 'redemption-1' });
    const response = await POST(request({ plan: 'PRO', coupon: 'typed-value' }));
    expect(response.status).toBe(200);
    expect(mocks.organizationUpdate).not.toHaveBeenCalled();
    expect(mocks.redemptionCreate).not.toHaveBeenCalled();
  });

  it('allows a valid Pro coupon to downgrade an Advanced workspace', async () => {
    mocks.matchManagedCoupon.mockResolvedValue('standard');
    mocks.organizationFind.mockResolvedValue({ plan: 'ADVANCED' });
    const response = await POST(request({ plan: 'PRO', coupon: 'typed-value' }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true, plan: 'PRO' });
    expect(mocks.organizationUpdate).toHaveBeenCalledWith({ where: { id: 'org-1' }, data: { plan: 'PRO' } });
  });
});
