-- Public waitlist registrations and idempotent daily delivery records.
CREATE TABLE "public"."WaitlistEntry" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "specialization" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaitlistEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."WaitlistDailyReport" (
    "id" TEXT NOT NULL,
    "reportDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "recipient" TEXT NOT NULL,
    "entryCount" INTEGER,
    "messageId" TEXT,
    "lastError" TEXT,
    "lockedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaitlistDailyReport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WaitlistEntry_email_key" ON "public"."WaitlistEntry"("email");
CREATE INDEX "WaitlistEntry_createdAt_idx" ON "public"."WaitlistEntry"("createdAt");
CREATE UNIQUE INDEX "WaitlistDailyReport_reportDate_key" ON "public"."WaitlistDailyReport"("reportDate");
CREATE INDEX "WaitlistDailyReport_status_lockedAt_idx" ON "public"."WaitlistDailyReport"("status", "lockedAt");
