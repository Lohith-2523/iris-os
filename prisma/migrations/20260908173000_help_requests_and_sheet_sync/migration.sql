ALTER TABLE "public"."WaitlistEntry"
ADD COLUMN "sheetSyncedAt" TIMESTAMP(3),
ADD COLUMN "sheetSyncError" TEXT;

CREATE TABLE "public"."HelpRequest" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "details" TEXT NOT NULL,
  "page" TEXT,
  "sheetSyncedAt" TIMESTAMP(3),
  "sheetSyncError" TEXT,
  "emailSentAt" TIMESTAMP(3),
  "emailError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HelpRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "HelpRequest_createdAt_idx" ON "public"."HelpRequest"("createdAt");
CREATE INDEX "HelpRequest_type_createdAt_idx" ON "public"."HelpRequest"("type", "createdAt");
