import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser, isOrganizationAdmin } from '@/lib/org';
import { getRazorpay, razorpayErrorResponse, verifyPaymentSchema, verifyRazorpaySignature } from '@/lib/razorpay';
import { planPrice, planPriceWithCoupon, type PricingRegion } from '@/lib/plan-pricing';
import { prisma } from '@/lib/db';
import { isPlanDowngrade, normalizePlan } from '@/lib/plan-entitlements';

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

    const completedPayment = await client.payments.fetch(payment.razorpay_payment_id);
    if (
      completedPayment.order_id !== order.id
      || completedPayment.status !== 'captured'
      || Number(completedPayment.amount) !== Number(order.amount)
      || completedPayment.currency !== order.currency
    ) {
      return NextResponse.json({ error: 'Payment has not completed.' }, { status: 400 });
    }

    const purchasedPlan = order.notes?.plan;
    const pricingRegion = order.notes?.pricingRegion as PricingRegion | undefined;
    if ((purchasedPlan !== 'PRO' && purchasedPlan !== 'ADVANCED') || (pricingRegion !== 'INDIA' && pricingRegion !== 'INTERNATIONAL')) {
      return NextResponse.json({ error: 'Order pricing details are invalid.' }, { status: 400 });
    }
    const couponId = typeof order.notes?.couponId === 'string' ? order.notes.couponId : null;
    const discountPercent = Number(order.notes?.discountPercent);
    if (couponId && (!Number.isInteger(discountPercent) || discountPercent < 1 || discountPercent >= 100)) {
      return NextResponse.json({ error: 'Order coupon details are invalid.' }, { status: 400 });
    }
    const expected = couponId
      ? planPriceWithCoupon(purchasedPlan, pricingRegion, discountPercent)
      : planPrice(purchasedPlan, pricingRegion);
    if (Number(order.amount) !== expected.totalAmount || order.currency !== expected.currency) {
      return NextResponse.json({ error: 'Order amount does not match the selected plan.' }, { status: 400 });
    }

    const currentPlan = normalizePlan(user.organization?.plan);
    const activePlan = purchasedPlan;
    if (isPlanDowngrade(currentPlan, activePlan)) {
      return NextResponse.json({ error: 'Paid plans can only be upgraded. Cancel the current plan to switch to Free.' }, { status: 409 });
    }
    await prisma.$transaction(async (tx) => {
      if (activePlan !== currentPlan) {
        await tx.organization.update({ where: { id: user.orgId }, data: { plan: activePlan } });
      }
      await tx.platformPayment.upsert({
        where: { paymentId: payment.razorpay_payment_id },
        create: {
          paymentId: payment.razorpay_payment_id,
          orderId: order.id,
          userId: user.id,
          orgId: user.orgId,
          plan: activePlan,
          currency: expected.currency,
          baseAmount: expected.baseAmount,
          taxAmount: expected.taxAmount,
          totalAmount: expected.totalAmount,
        },
        update: {},
      });
      if (couponId) {
        const previousRedemption = await tx.planCouponRedemption.findFirst({
          where: { orgId: user.orgId, couponId, requestedPlan: activePlan },
          select: { id: true },
        });
        if (!previousRedemption) {
          await tx.planCouponRedemption.create({ data: {
            orgId: user.orgId,
            redeemedById: user.id,
            couponId,
            requestedPlan: activePlan,
            activatedPlan: activePlan,
          } });
        }
      }
    });

    return NextResponse.json({ success: true, order_id: order.id, payment_id: payment.razorpay_payment_id, plan: activePlan });
  } catch (error) {
    return razorpayErrorResponse(error);
  }
}
