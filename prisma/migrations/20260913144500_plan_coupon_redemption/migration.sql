BEGIN;

CREATE TABLE "PlanCouponRedemption" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "redeemedById" TEXT NOT NULL,
  "couponId" TEXT NOT NULL,
  "requestedPlan" TEXT NOT NULL,
  "activatedPlan" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlanCouponRedemption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlanCouponSecurityState" (
  "userId" TEXT NOT NULL,
  "failedAttempts" INTEGER NOT NULL DEFAULT 0,
  "windowStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedUntil" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlanCouponSecurityState_pkey" PRIMARY KEY ("userId")
);

CREATE INDEX "PlanCouponRedemption_orgId_createdAt_idx" ON "PlanCouponRedemption"("orgId", "createdAt");
CREATE INDEX "PlanCouponRedemption_couponId_createdAt_idx" ON "PlanCouponRedemption"("couponId", "createdAt");
CREATE INDEX "PlanCouponRedemption_redeemedById_createdAt_idx" ON "PlanCouponRedemption"("redeemedById", "createdAt");

ALTER TABLE "PlanCouponRedemption" ADD CONSTRAINT "PlanCouponRedemption_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlanCouponRedemption" ADD CONSTRAINT "PlanCouponRedemption_redeemedById_fkey" FOREIGN KEY ("redeemedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlanCouponSecurityState" ADD CONSTRAINT "PlanCouponSecurityState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
