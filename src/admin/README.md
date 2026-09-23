# IrisOS Admin

This directory owns the private IrisOS superadmin application. Thin Next.js route entries in `src/app/admin` expose it at `/admin` while keeping its policy, data views, and client workspace separate from customer-facing modules.

The admin application will provide:

- User, organization, plan, and access oversight
- Subscription revenue, verified payments, coupon usage, and refund reporting
- Sanitized backend error and incident tracking through Next.js instrumentation
- Bugs, feature requests, feedback, and help requests from the existing support workflow
- Invite-only superadmin access for verified `@irisos.app` identities

The admin surface uses a distinct IrisOS superadmin authorization boundary. Customer workspace roles, including organization administrators, never grant access to it. Provider access and aggregation live in `shared/server`, with secrets and coupon digests kept out of browser bundles.
