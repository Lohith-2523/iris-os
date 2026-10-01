import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser, isOrganizationAdmin } from '@/lib/org';
import { createOrderSchema, getRazorpay, razorpayErrorResponse } from '@/lib/razorpay';
import { planPrice, planPriceWithCoupon } from '@/lib/plan-pricing';
import { pricingLocation } from '@/lib/request-country';
import { matchManagedCoupon } from '@/server/admin/managed-coupons';
import { isPlanDowngrade } from '@/lib/plan-entitlements';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isOrganizationAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const input = createOrderSchema.safeParse(await request.json().catch(() => null));
    if (!input.success) return NextResponse.json({ error: 'Choose the Pro or Advanced plan.' }, { status: 400 });
    if (isPlanDowngrade(user.organization.plan, input.data.plan)) {
      return NextResponse.json({ error: 'Paid plans can only be upgraded. Cancel the current plan to switch to Free.' }, { status: 409 });
    }

    const { client, keyId } = getRazorpay();
    const location = pricingLocation(request.headers);
    const coupon = input.data.coupon
      ? await matchManagedCoupon(input.data.coupon, input.data.plan)
      : null;
    if (input.data.coupon && !coupon) return NextResponse.json({ error: 'Coupon code could not be applied.' }, { status: 400 });
    if (coupon?.discountPercent === 100) return NextResponse.json({ error: 'Redeem this coupon directly instead of opening checkout.' }, { status: 400 });
    const price = coupon
      ? planPriceWithCoupon(input.data.plan, location.region, coupon.discountPercent)
      : planPrice(input.data.plan, location.region);
    const order = await client.orders.create({
      amount: price.totalAmount,
      currency: price.currency,
      receipt: randomUUID(),
      notes: {
        userId: user.id,
        purpose: 'plan_purchase',
        plan: price.id,
        pricingRegion: location.region,
        country: location.country || 'UNKNOWN',
        baseAmount: String(price.baseAmount),
        taxAmount: String(price.taxAmount),
        ...(coupon ? { couponId: coupon.id, discountPercent: String(coupon.discountPercent) } : {}),
      },
    });
    return NextResponse.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: keyId,
      plan: price.id,
      base_amount: price.baseAmount,
      tax_amount: price.taxAmount,
      list_amount: price.listAmount,
      discount_amount: 'discountAmount' in price ? price.discountAmount : 0,
      discount_percent: coupon?.discountPercent ?? null,
    });
  } catch (error) {
    return razorpayErrorResponse(error);
  }
}
