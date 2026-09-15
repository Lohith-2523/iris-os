# Iris OS Admin

This directory is reserved for the private Iris OS super-admin application. It is separate from the customer-facing production routes in `src/app` and is not currently exposed as a Next.js route.

The admin application will provide:

- User, organization, plan, and access oversight
- Service health, deployment, downtime, and outage data from Vercel
- Subscription revenue, payment, coupon, cancellation, and refund reporting
- Error and incident tracking
- Bugs, feature requests, feedback, and help requests synchronized from the existing Google Sheet workflow

The admin surface must use a distinct Iris OS super-admin authorization boundary. Customer workspace roles, including organization administrators, must never grant access to it. Provider access should be implemented through server-side adapters in `shared/server`, with secrets kept out of browser bundles. Reusable UI, domain logic, types, and integrations belong in `shared` so both applications can consume them without duplication.
