import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getRequestUser, isOrganizationAdmin } from '@/lib/org';
import { isPlanDowngrade, normalizePlan } from '@/lib/plan-entitlements';
import { getOnboardingManagedCoupon, matchManagedCoupon } from '@/server/admin/managed-coupons';
import { planPriceWithCoupon } from '@/lib/plan-pricing';
import { pricingLocation } from '@/lib/request-country';

export const runtime = 'nodejs';

const inputSchema = z.object({
  plan: z.enum(['PRO', 'ADVANCED']),
  coupon: z.string().min(1).max(64),
  action: z.enum(['VALIDATE', 'REDEEM']).default('REDEEM'),
}).strict();

const MAX_FAILURES = 5;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1_000;
const LOCK_MS = 30 * 60 * 1_000;
const noStoreHeaders = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };

function retrySeconds(lockedUntil: Date) {
  return Math.max(1, Math.ceil((lockedUntil.getTime() - Date.now()) / 1_000));
}

async function registerFailure(userId: string) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`plan-coupon:${userId}`}, 0::bigint))::text AS "lockAcquired"`;
    const now = new Date();
    const state = await tx.planCouponSecurityState.findUnique({ where: { userId } });
    if (state?.lockedUntil && state.lockedUntil > now) return state.lockedUntil;
    const inWindow = Boolean(state && now.getTime() - state.windowStartedAt.getTime() < ATTEMPT_WINDOW_MS);
    const failedAttempts = inWindow ? state!.failedAttempts + 1 : 1;
    const lockedUntil = failedAttempts >= MAX_FAILURES ? new Date(now.getTime() + LOCK_MS) : null;
    await tx.planCouponSecurityState.upsert({
      where: { userId },
      create: { userId, failedAttempts, windowStartedAt: now, lockedUntil },
      update: { failedAttempts, windowStartedAt: inWindow ? state!.windowStartedAt : now, lockedUntil },
    });
    return lockedUntil;
  });
}

export async function POST(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: 'Oops! Please sign in to continue.' }, { status: 401, headers: noStoreHeaders });
  if (!isOrganizationAdmin(user)) return NextResponse.json({ error: 'Oops! You do not have enough permissions.' }, { status: 403, headers: noStoreHeaders });

  const input = inputSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: 'Enter a valid coupon code.' }, { status: 400, headers: noStoreHeaders });
  if (isPlanDowngrade(user.organization.plan, input.data.plan)) {
    return NextResponse.json({ error: 'Paid plans can only be upgraded. Cancel the current plan to switch to Free.' }, { status: 409, headers: noStoreHeaders });
  }

  const securityState = await prisma.planCouponSecurityState.findUnique({ where: { userId: user.id } });
  if (securityState?.lockedUntil && securityState.lockedUntil > new Date()) {
    const seconds = retrySeconds(securityState.lockedUntil);
    return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429, headers: { ...noStoreHeaders, 'Retry-After': String(seconds) } });
  }

  const submittedCoupon = await matchManagedCoupon(input.data.coupon, input.data.plan);
  if (!submittedCoupon) {
    const lockedUntil = await registerFailure(user.id);
    const status = lockedUntil ? 429 : 400;
    return NextResponse.json(
      { error: lockedUntil ? 'Too many attempts. Try again later.' : 'Coupon code could not be applied.' },
      { status, headers: lockedUntil ? { ...noStoreHeaders, 'Retry-After': String(retrySeconds(lockedUntil)) } : noStoreHeaders },
    );
  }
  const onboardingCoupon = user.organization.onboardingState?.needsOnboarding
    ? await getOnboardingManagedCoupon(input.data.plan)
    : null;
  const coupon = onboardingCoupon && onboardingCoupon.discountPercent > submittedCoupon.discountPercent
    ? onboardingCoupon
    : submittedCoupon;

  if (input.data.action === 'VALIDATE') {
    const allowed = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`plan-coupon:${user.id}`}, 0::bigint))::text AS "lockAcquired"`;
      const currentSecurityState = await tx.planCouponSecurityState.findUnique({ where: { userId: user.id } });
      if (currentSecurityState?.lockedUntil && currentSecurityState.lockedUntil > new Date()) return false;
      await tx.planCouponSecurityState.deleteMany({ where: { userId: user.id } });
      return true;
    });
    if (!allowed) return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429, headers: noStoreHeaders });
    const price = planPriceWithCoupon(input.data.plan, pricingLocation(request.headers).region, coupon.discountPercent);
    return NextResponse.json({
      success: true,
      valid: true,
      discountPercent: coupon.discountPercent,
      listAmount: price.listAmount,
      baseAmount: price.baseAmount,
      discountAmount: price.discountAmount,
      taxAmount: price.taxAmount,
      totalAmount: price.totalAmount,
      currency: price.currency,
    }, { headers: noStoreHeaders });
  }

  if (coupon.discountPercent !== 100) {
    return NextResponse.json({ error: 'Complete payment to redeem this coupon.' }, { status: 400, headers: noStoreHeaders });
  }

  const activatedPlan = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`plan-coupon:${user.id}`}, 0::bigint))::text AS "lockAcquired"`;
    const currentSecurityState = await tx.planCouponSecurityState.findUnique({ where: { userId: user.id } });
    if (currentSecurityState?.lockedUntil && currentSecurityState.lockedUntil > new Date()) return null;
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`managed-coupon:${coupon.id}`}, 0::bigint))::text AS "lockAcquired"`;
    const managedCoupon = await tx.managedCoupon.findUnique({ where: { id: coupon.id } });
    const now = new Date();
    if (!managedCoupon || !managedCoupon.enabled || managedCoupon.startsAt > now
      || (managedCoupon.endsAt && managedCoupon.endsAt <= now)
      || managedCoupon.discountPercent !== 100
      || (managedCoupon.plan !== 'ANY' && managedCoupon.plan !== input.data.plan)) return null;
    const totalUses = await tx.planCouponRedemption.count({ where: { couponId: coupon.id } });
    if (managedCoupon.maxUses !== null && totalUses >= managedCoupon.maxUses) return null;
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`plan-coupon-org:${user.orgId}`}, 0::bigint))::text AS "lockAcquired"`;
    const organization = await tx.organization.findUniqueOrThrow({ where: { id: user.orgId }, select: { plan: true } });
    const currentPlan = normalizePlan(organization.plan);
    const nextPlan = input.data.plan;
    if (isPlanDowngrade(currentPlan, nextPlan)) return 'DOWNGRADE' as const;
    if (nextPlan !== currentPlan) await tx.organization.update({ where: { id: user.orgId }, data: { plan: nextPlan } });
    const previousRedemption = await tx.planCouponRedemption.findFirst({ where: { orgId: user.orgId, couponId: coupon.id, requestedPlan: input.data.plan }, select: { id: true } });
    if (!previousRedemption) {
      await tx.planCouponRedemption.create({ data: {
        orgId: user.orgId,
        redeemedById: user.id,
        couponId: coupon.id,
        requestedPlan: input.data.plan,
        activatedPlan: nextPlan,
      } });
    }
    await tx.planCouponSecurityState.deleteMany({ where: { userId: user.id } });
    return nextPlan;
  });

  if (!activatedPlan) return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429, headers: noStoreHeaders });
  if (activatedPlan === 'DOWNGRADE') return NextResponse.json({ error: 'Paid plans can only be upgraded. Cancel the current plan to switch to Free.' }, { status: 409, headers: noStoreHeaders });
  return NextResponse.json({ success: true, plan: activatedPlan }, { headers: noStoreHeaders });
}
