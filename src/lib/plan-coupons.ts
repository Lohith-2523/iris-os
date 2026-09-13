import 'server-only';

import { scryptSync, timingSafeEqual } from 'node:crypto';

type CouponRecord = { id: string; salt: string; digest: string };

// Coupon values are represented only by salted scrypt digests. Never return
// this table or a submitted coupon value to the browser, logs, or audit rows.
const COUPONS: readonly CouponRecord[] = [
  { id: 'standard', salt: 'b34b34a089f593b19a526313b093286a', digest: 'f3f1465d91fbba35b91313da6eb6d2ca192d0aca5634cb9a30fa2fe5697a6eff' },
  { id: 'sgrl', salt: '6e41a792a1e972bb47ba4d3f78f70d5d', digest: '9980ded5c40d2381a54668480c8a30e23842bc343074a2eb1df14125df58a8d4' },
  { id: 'sls', salt: '2ccdfc86a019e827fd302509db47dbf8', digest: 'a2ffc5cebb40a639075b6561b386dc84005e2ee3465718de98f541e272065696' },
];

export function matchPlanCoupon(candidate: string) {
  let matchedId: string | null = null;
  for (const coupon of COUPONS) {
    const candidateDigest = scryptSync(candidate, coupon.salt, 32);
    const expectedDigest = Buffer.from(coupon.digest, 'hex');
    if (timingSafeEqual(candidateDigest, expectedDigest)) matchedId = coupon.id;
  }
  return matchedId;
}

