import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser, isOrganizationAdmin } from '@/lib/org';
import { getRazorpay, razorpayErrorResponse, verifyPaymentSchema, verifyRazorpaySignature } from '@/lib/razorpay';
import { planPrice, type PricingRegion } from '@/lib/plan-pricing';
import { prisma } from '@/lib/db';
import { normalizePlan } from '@/lib/plan-entitlements';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isOrganizationAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const input = verifyPaymentSchema.safeParse(await request.json().catch(() => null));
    if (!input.success) return NextResponse.json({ error: 'Payment ID, order ID and a valid signature are required.' }, { status: 400 });

    const { client, secret } = getRazorpay();
    const payment = input.data;
    // Retrieve the canonical order from the provider, including server-written ownership.
    const order = await client.orders.fetch(payment.razorpay_order_id);
    if (order.notes?.userId !== user.id || order.notes?.purpose !== 'plan_purchase') {
      return NextResponse.json({ error: 'Order does not belong to this account.' }, { status: 403 });
    }
    if (!verifyRazorpaySignature(order.id, payment.razorpay_payment_id, payment.razorpay_signature, secret)) {
      return NextResponse.json({ error: 'Payment signature does not match.' }, { status: 400 });
    }

    const purchasedPlan = order.notes?.plan;
    const pricingRegion = order.notes?.pricingRegion as PricingRegion | undefined;
    if ((purchasedPlan !== 'PRO' && purchasedPlan !== 'ADVANCED') || (pricingRegion !== 'INDIA' && pricingRegion !== 'INTERNATIONAL')) {
      return NextResponse.json({ error: 'Order pricing details are invalid.' }, { status: 400 });
    }
    const expected = planPrice(purchasedPlan, pricingRegion);
    if (Number(order.amount) !== expected.totalAmount || order.currency !== expected.currency) {
      return NextResponse.json({ error: 'Order amount does not match the selected plan.' }, { status: 400 });
    }

    const currentPlan = normalizePlan(user.organization?.plan);
    const activePlan = purchasedPlan;
    if (activePlan !== currentPlan) {
      await prisma.organization.update({ where: { id: user.orgId }, data: { plan: activePlan } });
    }

    return NextResponse.json({ success: true, order_id: order.id, payment_id: payment.razorpay_payment_id, plan: activePlan });
  } catch (error) {
    return razorpayErrorResponse(error);
  }
}
