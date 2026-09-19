CREATE TABLE "AtlasCreditUsageEvent" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "plan" TEXT NOT NULL,
  "userRole" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "inputCredits" INTEGER NOT NULL,
  "outputCredits" INTEGER NOT NULL,
  "totalCredits" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AtlasCreditUsageEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AtlasCreditUsageEvent_createdAt_idx" ON "AtlasCreditUsageEvent"("createdAt");
CREATE INDEX "AtlasCreditUsageEvent_userId_createdAt_idx" ON "AtlasCreditUsageEvent"("userId", "createdAt");
CREATE INDEX "AtlasCreditUsageEvent_orgId_createdAt_idx" ON "AtlasCreditUsageEvent"("orgId", "createdAt");
CREATE INDEX "AtlasCreditUsageEvent_plan_createdAt_idx" ON "AtlasCreditUsageEvent"("plan", "createdAt");

ALTER TABLE "AtlasCreditUsageEvent"
ADD CONSTRAINT "AtlasCreditUsageEvent_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AtlasCreditUsageEvent"
ADD CONSTRAINT "AtlasCreditUsageEvent_orgId_fkey"
FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
