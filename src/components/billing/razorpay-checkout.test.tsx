import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
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
  render(<RazorpayCheckout plan="PRO" price={{ currency: 'INR', baseAmount: 79_900, taxAmount: 14_382, totalAmount: 94_282 }} />);
  expect(screen.getByLabelText('Payment price breakdown')).toHaveTextContent('Plan price₹799');
  expect(screen.getByLabelText('Payment price breakdown')).toHaveTextContent('GST (18%)₹143.82');
  expect(screen.getByLabelText('Payment price breakdown')).toHaveTextContent('Amount due today₹942.82');
  fireEvent.click(screen.getByRole('button', { name: 'Choose Pro' }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(screen.getByRole('button')).toHaveTextContent('Processing'));
  expect(fetchMock).toHaveBeenCalledWith('/api/create-order', expect.objectContaining({ body: JSON.stringify({ plan: 'PRO' }) }));
  expect(options).toMatchObject({
    name: 'Iris OS',
    description: 'Pro plan · ₹799 + ₹143.82 GST',
    image: 'http://localhost:3000/icons/iris-512.png',
    theme: { color: '#09090B' },
  });
}
it('verifies the callback before displaying success', async () => {
  await openCheckout();
  fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, payment_id: 'pay_123', plan: 'PRO' }) });
  const result = { razorpay_order_id: 'order_123', razorpay_payment_id: 'pay_123', razorpay_signature: 'signature' };
  options.handler(result);
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Payment verified'));
  expect(fetchMock).toHaveBeenLastCalledWith('/api/verify-payment', expect.objectContaining({ body: JSON.stringify(result) }));
});
it('handles dismissal', async () => {
  await openCheckout(); options.modal.ondismiss();
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Payment cancelled'));
  expect(screen.getByRole('button')).toBeEnabled();
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
