import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser, isOrganizationAdmin } from '@/lib/org';
import { createOrderSchema, getRazorpay, razorpayErrorResponse } from '@/lib/razorpay';
import { planPrice } from '@/lib/plan-pricing';
import { pricingLocation } from '@/lib/request-country';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isOrganizationAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const input = createOrderSchema.safeParse(await request.json().catch(() => null));
    if (!input.success) return NextResponse.json({ error: 'Choose the Pro or Advanced plan.' }, { status: 400 });

    const { client, keyId } = getRazorpay();
    const location = pricingLocation(request.headers);
    const price = planPrice(input.data.plan, location.region);
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
    });
  } catch (error) {
    return razorpayErrorResponse(error);
  }
}
