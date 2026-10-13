-- System-managed 50% onboarding offer. Usage is derived exclusively from
-- PlanCouponRedemption rows created after a captured payment is verified.
INSERT INTO "ManagedCoupon" (
  "id", "label", "codeSalt", "codeDigest", "codeHint", "plan",
  "discountPercent", "enabled", "maxUses", "startsAt", "createdAt", "updatedAt"
) VALUES (
  'onboarding-50',
  'Automatic onboarding offer',
  '9e71e63ef790a66cf2148b32f1bc665d',
  'c677f89557edc6b55e2aadf7ca34fc6e5297d783548672574e144c07281e64af',
  'Automatic onboarding',
  'ANY',
  50,
  true,
  205,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO UPDATE SET
  "label" = EXCLUDED."label",
  "codeHint" = EXCLUDED."codeHint",
  "plan" = EXCLUDED."plan",
  "discountPercent" = EXCLUDED."discountPercent",
  "enabled" = EXCLUDED."enabled",
  "maxUses" = EXCLUDED."maxUses",
  "endsAt" = NULL,
  "updatedAt" = CURRENT_TIMESTAMP;
