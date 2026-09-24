import { act, fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useEffect } from 'react';
import { RazorpayCheckout } from './razorpay-checkout';

vi.mock('next/script', () => ({ default: function MockScript({ onReady }: { onReady: () => void }) {
  useEffect(() => { onReady(); }, [onReady]); return null;
} }));
let options: ConstructorParameters<NonNullable<Window['Razorpay']>>[0];
let failure: (result: { error?: { description?: string } }) => void;
const fetchMock = vi.fn();
beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset().mockResolvedValue({ ok: true, json: async () => ({ order_id: 'order_123', amount: 100, currency: 'INR', key_id: 'public-key' }) });
  window.Razorpay = class {
    constructor(input: typeof options) { options = input; }
    open() {}
    close() {}
    on(_event: string, handler: typeof failure) { failure = handler; }
  };
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); delete window.Razorpay; });
async function openCheckout() {
  render(<RazorpayCheckout plan="PRO" price={{ currency: 'INR', listAmount: 159_900, baseAmount: 79_900, taxAmount: 14_382, totalAmount: 94_282 }} />);
  expect(screen.getByLabelText('Plan checkout')).toBeInTheDocument();
  expect(screen.queryByText(/Amount due today/i)).not.toBeInTheDocument();
  expect(screen.getByLabelText('Coupon code')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Choose Pro' }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Processing…' })).toBeDisabled());
  expect(fetchMock).toHaveBeenCalledWith('/api/create-order', expect.objectContaining({ body: JSON.stringify({ plan: 'PRO' }) }));
  expect(options).toMatchObject({
    name: 'IrisOS',
    description: 'Pro plan · 18% GST',
    image: 'http://localhost:3000/icons/iris-512.png',
    parent: expect.stringMatching(/^#razorpay-checkout-/),
    theme: { color: '#09090B', backdrop_color: 'rgba(9, 9, 11, 0.62)' },
  });
  expect(screen.getByRole('dialog', { name: 'Secure Razorpay checkout' })).toBeInTheDocument();
}
it('verifies the callback before displaying success', async () => {
  await openCheckout();
  fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, payment_id: 'pay_123', plan: 'PRO' }) });
  const result = { razorpay_order_id: 'order_123', razorpay_payment_id: 'pay_123', razorpay_signature: 'signature' };
  options.handler(result);
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Payment verified'));
  expect(fetchMock).toHaveBeenLastCalledWith('/api/verify-payment', expect.objectContaining({ body: JSON.stringify(result) }));
});
it('replaces the checkout iframe with a processing state during backend confirmation', async () => {
  await openCheckout();
  let resolveVerification!: (value: { ok: boolean; json: () => Promise<object> }) => void;
  fetchMock.mockReturnValueOnce(new Promise(resolve => { resolveVerification = resolve; }));

  act(() => { void options.handler({ razorpay_order_id: 'order_123', razorpay_payment_id: 'pay_123', razorpay_signature: 'signature' }); });

  const processing = screen.getByText('Confirming your plan').parentElement!;
  expect(processing).toHaveTextContent('Confirming your plan');
  expect(processing).toHaveTextContent('Payment received. Securing your workspace access');
  expect(screen.getByRole('dialog', { name: 'Secure Razorpay checkout' }).className).toContain('processing');

  await act(async () => { resolveVerification({ ok: true, json: async () => ({ success: true, payment_id: 'pay_123', plan: 'PRO' }) }); });
  await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Secure Razorpay checkout' })).not.toBeInTheDocument());
});
it('handles dismissal', async () => {
  await openCheckout(); options.modal.ondismiss();
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Payment cancelled'));
  expect(screen.getByRole('button', { name: 'Choose Pro' })).toBeEnabled();
});
it('handles payment failure', async () => {
  await openCheckout(); failure({ error: { description: 'Payment declined' } });
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Payment declined'));
});
it('never displays success after failed verification', async () => {
  await openCheckout();
  fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Signature mismatch' }) });
  options.handler({ razorpay_order_id: 'order_123', razorpay_payment_id: 'pay_123', razorpay_signature: 'wrong' });
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Signature mismatch'));
  expect(screen.queryByText(/Payment verified/)).not.toBeInTheDocument();
});

it('validates first, then activates from the plan button without opening Razorpay', async () => {
  const onVerified = vi.fn();
  fetchMock
    .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, valid: true, discountPercent: 100, listAmount: 319_900, baseAmount: 0, discountAmount: 319_900, taxAmount: 0, totalAmount: 0, currency: 'INR' }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, plan: 'ADVANCED' }) });
  render(<RazorpayCheckout plan="ADVANCED" price={{ currency: 'INR', baseAmount: 159_900, taxAmount: 28_782, totalAmount: 188_682 }} onVerified={onVerified} />);

  const input = screen.getByLabelText('Coupon code');
  expect(input).toHaveAttribute('type', 'text');
  const manuallyTypedCoupon = ['manual', 'coupon'].join('-');
  fireEvent.change(input, { target: { value: manuallyTypedCoupon } });
  fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

  expect(await screen.findByRole('status')).toHaveTextContent('100% coupon applied. Choose Advanced to activate it at no charge.');
  expect(screen.getByRole('button', { name: 'Valid' })).toBeDisabled();
  expect(screen.queryByText(/Amount due today/i)).not.toBeInTheDocument();
  expect(onVerified).not.toHaveBeenCalled();
  expect(fetchMock).toHaveBeenLastCalledWith('/api/plan-coupons/redeem', expect.objectContaining({
    body: JSON.stringify({ plan: 'ADVANCED', coupon: manuallyTypedCoupon, action: 'VALIDATE' }),
  }));

  fireEvent.click(screen.getByRole('button', { name: 'Choose Advanced' }));
  await waitFor(() => expect(onVerified).toHaveBeenCalledWith('ADVANCED'));
  expect(fetchMock).toHaveBeenLastCalledWith('/api/plan-coupons/redeem', expect.objectContaining({
    body: JSON.stringify({ plan: 'ADVANCED', coupon: manuallyTypedCoupon, action: 'REDEEM' }),
  }));
  expect(screen.getByRole('status')).toHaveTextContent('Advanced activated at no charge.');
  expect(screen.queryByRole('dialog', { name: 'Secure Razorpay checkout' })).not.toBeInTheDocument();
});

it('applies a partial coupon to the original price and opens checkout for the balance', async () => {
  const onPriceChange = vi.fn();
  fetchMock
    .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, valid: true, discountPercent: 10, listAmount: 159_900, baseAmount: 143_910, discountAmount: 15_990, taxAmount: 25_904, totalAmount: 169_814, currency: 'INR' }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ order_id: 'order_123', amount: 169_814, currency: 'INR', key_id: 'public-key', base_amount: 143_910, tax_amount: 25_904 }) });
  render(<RazorpayCheckout plan="PRO" price={{ currency: 'INR', listAmount: 159_900, baseAmount: 79_900, taxAmount: 14_382, totalAmount: 94_282 }} onPriceChange={onPriceChange} />);

  fireEvent.change(screen.getByLabelText('Coupon code'), { target: { value: 'SAVE10' } });
  fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

  expect(await screen.findByRole('status')).toHaveTextContent('10% coupon applied to the original price.');
  expect(onPriceChange).toHaveBeenCalledWith(expect.objectContaining({ discountPercent: 10, baseAmount: 143_910, currency: 'INR' }));
  expect(screen.queryByText('Original price')).not.toBeInTheDocument();
  expect(screen.queryByText(/Coupon discount/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/Amount due today/i)).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Choose Pro' }));
  await waitFor(() => expect(fetchMock).toHaveBeenLastCalledWith('/api/create-order', expect.objectContaining({
    body: JSON.stringify({ plan: 'PRO', coupon: 'SAVE10' }),
  })));
  expect(screen.getByRole('dialog', { name: 'Secure Razorpay checkout' })).toBeInTheDocument();
});

it('allows pasted coupon values', () => {
  render(<RazorpayCheckout plan="PRO" price={{ currency: 'INR', baseAmount: 79_900, taxAmount: 14_382, totalAmount: 94_282 }} />);
  const input = screen.getByLabelText('Coupon code');
  fireEvent.paste(input, { clipboardData: { getData: () => 'pasted-value' } });
  fireEvent.change(input, { target: { value: 'pasted-value' } });
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(input).toHaveValue('pasted-value');
});
