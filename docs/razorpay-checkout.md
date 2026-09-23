# Razorpay plan checkout

IrisOS uses Razorpay Standard Checkout for paid plan activation. `POST /api/create-order` accepts only `PRO` or `ADVANCED`; the server calculates the price, currency, 18% GST, and order ownership. `POST /api/verify-payment` verifies the signature and the canonical order amount before updating the organization plan. The internal `BASIC` plan ID remains unchanged and is displayed as **Free**.

## Regional prices

| Plan | India base price | International base price |
| --- | ---: | ---: |
| Free | ₹0 | $0 |
| Pro | ₹799 | $15.99 |
| Advanced | ₹1,599 | $31.99 |

Paid prices exclude 18% GST. The amount sent to Razorpay includes that tax: Pro totals ₹942.82 or $18.87, and Advanced totals ₹1,886.82 or $37.75.

The server reads `x-vercel-ip-country`, `cf-ipcountry`, or `cloudfront-viewer-country`. These country headers are derived by the hosting platform from the requester's public IP. India (`IN`) receives INR pricing; every other country and an unavailable country receives international USD pricing. The application neither requests browser location permission nor sends the IP to another geolocation provider. Vercel does not provide geolocation headers during local development, so local requests use international pricing unless a supported header is supplied by a test or reverse proxy.

## Configuration

Install dependencies with `npm install`. Configure these variables in the ignored `.env` and in the deployment environment:

```dotenv
RAZORPAY_KEY_ID=<dashboard key ID>
RAZORPAY_KEY_SECRET=<dashboard key secret>
NEXT_PUBLIC_RAZORPAY_KEY_ID=<same key ID, optional>
```

Checkout uses the public key ID returned with the server-created order. The secret remains server-only.

The Checkout options use the IrisOS square logo from `/icons/iris-512.png`, the IrisOS near-black `#09090B` for Razorpay controls, and a black `#000000` modal backdrop. Razorpay controls the payment form's remaining surfaces. Deeper Checkout background, font, border, and sidebar styling can be configured in Razorpay Dashboard under **Accounts & Settings → Checkout Styling**.

## Test

1. Run `npm run dev` and sign in as a workspace administrator.
2. Open `/onboarding?step=pricing`, a feature upgrade dialog, or `/checkout`.
3. Choose Pro or Advanced and complete the Razorpay test modal. The plan changes only after server-side verification succeeds.
4. Choose Free to activate the no-cost tier without opening Razorpay.
5. Run `npx vitest run shared/lib/plan-pricing.test.ts shared/lib/razorpay.test.ts shared/components/billing/razorpay-checkout.test.tsx`.

For a deployed location test, visit from an Indian IP and a non-Indian IP and confirm INR and USD respectively. For live payments, configure live keys and enable international payments/currencies in Razorpay as needed.

Razorpay Orders are one-time payments. The UI expresses a monthly plan price, but automatic monthly renewal requires a separate Razorpay Subscriptions implementation.

References:

- https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/
- https://razorpay.com/docs/api/orders/create/
- https://vercel.com/docs/headers/request-headers
