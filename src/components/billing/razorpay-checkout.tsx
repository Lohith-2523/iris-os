'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal, flushSync } from 'react-dom';
import Script from 'next/script';
import { Button } from '@/components/ui/button';
import type { PlanId } from '@/lib/plan-entitlements';
import { formatPlanMoney } from '@/lib/plan-pricing';
import styles from './razorpay-checkout.module.css';

type PaymentResult = { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string };
type CheckoutOptions = {
  key: string; amount: number; currency: string; order_id: string; name: string;
  description?: string;
  image: string;
  parent: string;
  theme: { color: string; backdrop_color?: string };
  handler: (result: PaymentResult) => void;
  modal: { ondismiss: () => void };
};
type CheckoutInstance = {
  open: () => void;
  close: () => void;
  on: (event: 'payment.failed', handler: (result: { error?: { description?: string } }) => void) => void;
};
declare global {
  interface Window { Razorpay?: new (options: CheckoutOptions) => CheckoutInstance }
}

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Payment request failed. Please try again.');
  return data;
}

type CheckoutPrice = {
  currency: 'INR' | 'USD';
  baseAmount: number;
  taxAmount: number;
  totalAmount: number;
};

export function RazorpayCheckout({ plan, price, buttonLabel, disabled = false, onVerified }: {
  plan: Exclude<PlanId, 'BASIC'>;
  price: CheckoutPrice;
  buttonLabel?: string;
  disabled?: boolean;
  onVerified?: (plan: Exclude<PlanId, 'BASIC'>) => void | Promise<void>;
}) {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [coupon, setCoupon] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [couponValidated, setCouponValidated] = useState(false);
  const locked = useRef(false);
  const checkout = useRef<CheckoutInstance | null>(null);
  const checkoutHostId = `razorpay-checkout-${useId().replace(/:/g, '')}`;

  useEffect(() => () => checkout.current?.close(), []);

  async function pay() {
    if (locked.current) return;
    setError(''); setMessage('');
    locked.current = true; setBusy(true);
    const finish = () => {
      checkout.current = null;
      locked.current = false;
      setBusy(false);
      setCheckoutVisible(false);
    };
    let verifying = false;
    let failed = false;
    try {
      if (!window.Razorpay) throw new Error('Checkout could not load. Refresh the page and try again.');
      const order = await postJson('/api/create-order', { plan });
      const orderCurrency = order.currency === 'INR' ? 'INR' : 'USD';
      const orderBaseAmount = Number(order.base_amount ?? price.baseAmount);
      const orderTaxAmount = Number(order.tax_amount ?? price.taxAmount);
      flushSync(() => setCheckoutVisible(true));
      const instance = new window.Razorpay({
        key: order.key_id,
        amount: Number(order.amount),
        currency: order.currency,
        order_id: order.order_id,
        name: 'Iris OS',
        description: `${plan === 'PRO' ? 'Pro' : 'Advanced'} plan · ${formatPlanMoney(orderBaseAmount, orderCurrency)} + ${formatPlanMoney(orderTaxAmount, orderCurrency)} GST`,
        image: new URL('/icons/iris-512.png', window.location.origin).toString(),
        parent: `#${checkoutHostId}`,
        theme: { color: '#09090B', backdrop_color: 'rgba(9, 9, 11, 0.62)' },
        handler: async result => {
          verifying = true; setError(''); setMessage('Verifying payment…');
          try {
            const verified = await postJson('/api/verify-payment', result);
            if (verified.success !== true) throw new Error('Payment could not be verified.');
            await onVerified?.(verified.plan);
            setMessage(`Payment verified. Reference: ${verified.payment_id}`);
          } catch (reason) {
            setMessage('');
            setError(`${reason instanceof Error ? reason.message : 'Verification failed.'} If debited, contact support with payment reference ${result.razorpay_payment_id} before paying again.`);
          } finally { finish(); }
        },
        modal: { ondismiss: () => { if (!verifying && !failed) { setMessage('Payment cancelled.'); finish(); } } },
      });
      checkout.current = instance;
      instance.on('payment.failed', result => {
        failed = true; instance.close();
        setError(result.error?.description || 'Payment failed. Please try again.'); finish();
      });
      instance.open();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to open checkout.'); finish();
    }
  }

  async function applyCoupon() {
    if (locked.current || !coupon) return;
    setError(''); setMessage(''); setApplyingCoupon(true); locked.current = true;
    try {
      const validation = await postJson('/api/plan-coupons/redeem', { plan, coupon, action: 'VALIDATE' });
      if (validation.success !== true || validation.valid !== true) throw new Error('Coupon could not be applied.');
      setCouponValidated(true);
      setMessage(`Valid coupon. Choose ${plan === 'PRO' ? 'Pro' : 'Advanced'} to activate it at no charge.`);
    } catch (reason) {
      setCouponValidated(false);
      setError(reason instanceof Error ? reason.message : 'Coupon could not be applied.');
    } finally {
      locked.current = false; setApplyingCoupon(false);
    }
  }

  async function activateWithCoupon() {
    if (locked.current || !couponValidated) return;
    setError(''); setMessage(''); setBusy(true); locked.current = true;
    try {
      const redeemed = await postJson('/api/plan-coupons/redeem', { plan, coupon, action: 'REDEEM' });
      if (redeemed.success !== true || (redeemed.plan !== 'PRO' && redeemed.plan !== 'ADVANCED')) throw new Error('Coupon could not be redeemed.');
      setCoupon(''); setCouponValidated(false);
      setMessage(`${redeemed.plan === 'PRO' ? 'Pro' : 'Advanced'} activated at no charge.`);
      window.dispatchEvent(new Event('organization-updated'));
      window.dispatchEvent(new Event('user-updated'));
      await onVerified?.(redeemed.plan);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Coupon could not be redeemed.');
    } finally {
      locked.current = false; setBusy(false);
    }
  }

  const checkoutModal = checkoutVisible && typeof document !== 'undefined' ? createPortal(
    <div className={styles.overlay} aria-hidden={!checkoutVisible}>
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-label="Secure Razorpay checkout">
        <div id={checkoutHostId} className={styles.host} />
      </div>
    </div>,
    document.body,
  ) : null;

  return <section className="space-y-4 rounded-xl border border-white/10 bg-black/25 p-4 shadow-inner backdrop-blur-md" aria-label="Payment price breakdown">
    <Script src="https://checkout.razorpay.com/v1/checkout.js" onReady={() => setReady(true)} onError={() => { setReady(false); setError('Checkout could not load. Refresh the page and try again.'); }} />
    {checkoutModal}
    <dl className="space-y-2 text-xs">
      <div className="flex items-center justify-between gap-4 text-muted-foreground"><dt>Plan price</dt><dd className="font-mono tabular-nums text-foreground">{formatPlanMoney(price.baseAmount, price.currency)}</dd></div>
      <div className="flex items-center justify-between gap-4 text-muted-foreground"><dt>GST (18%)</dt><dd className="font-mono tabular-nums text-foreground">{formatPlanMoney(price.taxAmount, price.currency)}</dd></div>
      {couponValidated && <div className="flex items-center justify-between gap-4 text-emerald-400"><dt>Coupon discount</dt><dd className="font-mono tabular-nums">−{formatPlanMoney(price.totalAmount, price.currency)}</dd></div>}
      <div className="flex items-center justify-between gap-4 border-t border-border pt-3 font-semibold"><dt>Amount due today</dt><dd className="font-mono text-sm tabular-nums text-foreground">{formatPlanMoney(couponValidated ? 0 : price.totalAmount, price.currency)}</dd></div>
    </dl>
    <div className="space-y-2 border-t border-white/10 pt-4">
      <label htmlFor={`${checkoutHostId}-coupon`} className="block text-xs font-semibold text-foreground">Coupon code</label>
      <div className="flex gap-2">
        <input
          id={`${checkoutHostId}-coupon`}
          name="iris-plan-coupon"
          type="text"
          value={coupon}
          onChange={(event) => { setCoupon(event.target.value); setCouponValidated(false); setError(''); setMessage(''); }}
          autoComplete="new-password"
          autoCapitalize="none"
          spellCheck={false}
          data-1p-ignore="true"
          data-lpignore="true"
          disabled={disabled || busy || applyingCoupon}
          className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/35 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-white/35 disabled:opacity-50"
          placeholder="Enter coupon"
        />
        <Button type="button" variant="outline" onClick={() => void applyCoupon()} disabled={disabled || busy || applyingCoupon || couponValidated || coupon.length === 0}>{applyingCoupon ? 'Applying…' : couponValidated ? 'Valid' : 'Apply'}</Button>
      </div>
    </div>
    <Button type="button" className="w-full" onClick={() => void (couponValidated ? activateWithCoupon() : pay())} disabled={disabled || (!couponValidated && !ready) || busy || applyingCoupon}>{busy ? 'Processing…' : couponValidated ? `Choose ${plan === 'PRO' ? 'Pro' : 'Advanced'}` : buttonLabel || `Choose ${plan === 'PRO' ? 'Pro' : 'Advanced'}`}</Button>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {message && <p role="status" className={`text-sm ${couponValidated ? 'font-medium text-emerald-400' : 'text-muted-foreground'}`}>{message}</p>}
  </section>;
}
