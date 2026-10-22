# IrisOS legal implementation package — 22 October 2026

Status: legal policy implementation package. No production deployment, migrations, customer deletions, payment changes or notices were performed.

## Revised and new documents

| Document | Existing / new route |
| --- | --- |
| Privacy Policy | `/privacy` (preserved) |
| Terms of Service | `/terms` (preserved) |
| Cancellation, Suspension and Refund Policy | `/cancellation-refund-policy` (preserved) |
| Data Processing Agreement | `/data-processing-agreement` (new) |
| AI Usage and Credit Policy | `/ai-usage-policy` (new) |
| Subprocessor and Service Provider Register | `/subprocessors` (new) |

Text is maintained in `shared/lib/legal/policies.ts`. All documents use GRL Enterprises, the supplied business address, `contact@irisos.app` as the general legal contact, and `cto.admin@irisos.app` for the data processor under the DPA. The revision date is 22 October 2026.

[Audit, data inventory, gap analysis, review checklist and incident procedure](2026-10-22-audit.md). This is repository-based evidence, not a full operational compliance assessment. In particular, production providers, contracts, regions, retention settings and deployed controls were not verified.

## Changes

- Created central legal text, three new route wrappers, a page/navigation test, read-only browser verification script and this internal review package.
- Replaced the three existing policy bodies while preserving their URLs. Archived the original source byte-for-byte in `archive/2026-10-22/`; these are previous repository versions, not independently verified historical publication versions.
- Updated the shared policy layout with revision status, related-document links and wrapping for long content. Footers retain IrisOS product branding; the operator name and address appear only in substantive legal text.
- Added legal links to the landing footer and settings.
- Exempted all six legal routes from authentication and coming-soon redirection. Protected application routes retain their existing handling.
- Corrected settings confirmation and API success copy to distinguish covered data deletion from separate retained records and third-party deletion. No deletion algorithm was changed.
- Corrected the cancellation modal to preserve statutory remedies and billing corrections.
- Repaired existing audit-test fixtures: account-deletion mocks lacked the already-implemented access-token/device-grant tables; payment verification used an obsolete price. Added assertions for scoped credential-record cleanup. No payment logic or prices changed.

## Validation

- `npm.cmd run build`: passed; all six legal routes generated as static public pages.
- `npx.cmd tsc --noEmit --incremental false`: passed.
- Focused ESLint check of legal content/components/routes, proxy and updated account test: passed.
- `npx.cmd vitest run src/proxy.test.ts shared/components/legal/legal-policy-page.test.tsx shared/lib/atlas-ai/token-budget.test.ts src/app/api/account/route.test.ts src/app/api/organization/route.test.ts shared/lib/razorpay.test.ts src/app/api/verify-payment/route.test.ts`: **57 passed in 7 files** after fixture corrections.
- `node docs/legal/verify-pages.mjs`: checks six signed-out routes at 1440px and 390px for HTTP 200, no authentication redirects, no policy-status disclaimers, indexable metadata, section anchors, six footer links, and no horizontal overflow. External requests and APIs are blocked during browser checks; evidence is stored in `verification/`.
- `git diff --check`: passed (only repository line-ending conversion warnings).
- Deletion/payment checks used mocks only; they do not prove live DB referential integrity, external deletion or production concurrency. Live-domain verification remains a deployment step. No production data was touched.

## Release steps and unresolved decisions

1. Resolve the review checklist: legal identity/contact appointments, provider contracts/retention/regions, transfer instruments, retention schedules, billing-period and cancellation choices, liability/indemnity terms, DPA obligations and incident owners.
2. Address the documented deletion and AI metering defects through separate narrowly tested engineering work. This revision does not make durable deletion retries, provider revocation, credit deduplication or complete export available merely by describing them.
3. Obtain qualified legal and business approval. Confirm the effective date and version; decide notice/renewed acceptance requirements and implement durable acceptance records before binding customers to revised obligations. Signup/checkout acceptance was not changed as part of this policy-content update.
4. Archive the approved version, update sitemap/crawler visibility and send required notices.
5. Run the focused checks, deploy through the ordinary release process and verify signed-out routes and links on `https://irisos.app`, including coming-soon mode. No deployment was performed in this task.
