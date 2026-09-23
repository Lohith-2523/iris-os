import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';
import Razorpay from 'razorpay';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const createOrderSchema = z.object({
  plan: z.enum(['PRO', 'ADVANCED']),
  coupon: z.string().trim().min(1).max(64).optional(),
});

export const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().regex(/^order_[a-zA-Z0-9]+$/),
  razorpay_payment_id: z.string().regex(/^pay_[a-zA-Z0-9]+$/),
  razorpay_signature: z.string().regex(/^[a-fA-F0-9]{64}$/),
});

export function getRazorpay() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !secret) throw new Error('Razorpay is not configured.');
  return { client: new Razorpay({ key_id: keyId, key_secret: secret }), keyId, secret };
}

export function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string, secret: string) {
  if (!/^[a-fA-F0-9]{64}$/.test(signature)) return false;
  const expected = createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest();
  return timingSafeEqual(expected, Buffer.from(signature, 'hex'));
}

export function razorpayErrorResponse(error: unknown) {
  const unauthorized = typeof error === 'object' && error !== null
    && 'statusCode' in error && Number(error.statusCode) === 401;
  // SDK errors may contain request configuration. Never expose or log credentials.
  return NextResponse.json({ error: unauthorized
    ? 'Payment provider authentication failed.'
    : 'Unable to process the payment request. Please try again.' }, { status: unauthorized ? 401 : 500 });
}
