import 'server-only';

import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { prisma } from '@/lib/db';

export const ONBOARDING_COUPON_ID = 'onboarding-50';

const SYSTEM_MANAGED_COUPONS = [
  { id: 'standard', label: 'Legacy standard access', codeSalt: 'b34b34a089f593b19a526313b093286a', codeDigest: 'f3f1465d91fbba35b91313da6eb6d2ca192d0aca5634cb9a30fa2fe5697a6eff', codeHint: 'Legacy code', plan: 'ANY' },
  { id: 'sgrl', label: 'Legacy SGRL access', codeSalt: '6e41a792a1e972bb47ba4d3f78f70d5d', codeDigest: '9980ded5c40d2381a54668480c8a30e23842bc343074a2eb1df14125df58a8d4', codeHint: 'Legacy code', plan: 'ANY' },
  { id: 'sls', label: 'Legacy SLS access', codeSalt: '2ccdfc86a019e827fd302509db47dbf8', codeDigest: 'a2ffc5cebb40a639075b6561b386dc84005e2ee3465718de98f541e272065696', codeHint: 'Legacy code', plan: 'ANY' },
  { id: ONBOARDING_COUPON_ID, label: 'Automatic onboarding offer', codeSalt: '9e71e63ef790a66cf2148b32f1bc665d', codeDigest: 'c677f89557edc6b55e2aadf7ca34fc6e5297d783548672574e144c07281e64af', codeHint: 'Automatic onboarding', plan: 'ANY', discountPercent: 50, maxUses: 205 },
];

export async function ensureLegacyManagedCoupons() {
  await prisma.managedCoupon.createMany({ data: SYSTEM_MANAGED_COUPONS, skipDuplicates: true });
  await prisma.managedCoupon.updateMany({
    where: { id: ONBOARDING_COUPON_ID, OR: [{ discountPercent: { not: 50 } }, { maxUses: null }, { maxUses: { not: 205 } }] },
    data: { discountPercent: 50, maxUses: 205 },
  });
}

export async function getOnboardingManagedCoupon(requestedPlan: string) {
  await ensureLegacyManagedCoupons();
  const now = new Date();
  const coupon = await prisma.managedCoupon.findFirst({
    where: {
      id: ONBOARDING_COUPON_ID,
      enabled: true,
      startsAt: { lte: now },
      AND: [
        { OR: [{ plan: requestedPlan }, { plan: 'ANY' }] },
        { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
      ],
    },
  });
  if (!coupon) return null;
  const uses = await prisma.planCouponRedemption.count({ where: { couponId: coupon.id } });
  if (coupon.maxUses !== null && uses >= coupon.maxUses) return null;
  return { id: coupon.id, discountPercent: coupon.discountPercent };
}

export function hashManagedCoupon(code: string, salt = randomBytes(16).toString('hex')) {
  return { salt, digest: scryptSync(code.trim(), salt, 32).toString('hex') };
}

export async function matchManagedCoupon(candidate: string, requestedPlan: string) {
  await ensureLegacyManagedCoupons();
  const now = new Date();
  const coupons = await prisma.managedCoupon.findMany({
    where: {
      enabled: true,
      startsAt: { lte: now },
      AND: [
        { OR: [{ plan: requestedPlan }, { plan: 'ANY' }] },
        { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
      ],
    },
    take: 250,
  });
  for (const coupon of coupons) {
    const expected = Buffer.from(coupon.codeDigest, 'hex');
    const actual = scryptSync(candidate.trim(), coupon.codeSalt, 32);
    if (!timingSafeEqual(actual, expected)) continue;
    const uses = await prisma.planCouponRedemption.count({ where: { couponId: coupon.id } });
    if (coupon.maxUses !== null && uses >= coupon.maxUses) return null;
    return { id: coupon.id, discountPercent: coupon.discountPercent };
  }
  return null;
}
