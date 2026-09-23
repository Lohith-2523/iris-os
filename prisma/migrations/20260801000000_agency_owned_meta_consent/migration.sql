-- Store explicit, revocable consent separately for Meta access and Miles Meta analytics.
ALTER TABLE "public"."Organization"
ADD COLUMN "metaAccessConsent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "metaAccessConsentAt" TIMESTAMP(3),
ADD COLUMN "atlasMetaAnalyticsConsent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "atlasMetaAnalyticsConsentAt" TIMESTAMP(3);

-- Preserve provider attribution when agency-owned Meta leads enter the shared pipeline.
ALTER TABLE "public"."AgencyLead"
ADD COLUMN "sourceProvider" TEXT,
ADD COLUMN "adId" TEXT,
ADD COLUMN "adName" TEXT,
ADD COLUMN "campaignId" TEXT,
ADD COLUMN "adAccountId" TEXT,
ADD COLUMN "pageId" TEXT,
ADD COLUMN "formId" TEXT,
ADD COLUMN "fieldData" JSONB;

CREATE TABLE "public"."AgencyMetaAdAccount" (
  "id" TEXT NOT NULL,
  "adAccountId" TEXT NOT NULL,
  "accountName" TEXT NOT NULL,
  "businessName" TEXT,
  "currency" TEXT,
  "timezoneName" TEXT,
  "accountStatus" INTEGER,
  "lastSync" TIMESTAMP(3),
  "providerSyncedAt" TIMESTAMP(3),
  "orgId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AgencyMetaAdAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AgencyMetaAdAccount_orgId_adAccountId_key"
ON "public"."AgencyMetaAdAccount"("orgId", "adAccountId");

CREATE INDEX "AgencyMetaAdAccount_orgId_lastSync_idx"
ON "public"."AgencyMetaAdAccount"("orgId", "lastSync");

CREATE INDEX "AgencyLead_orgId_sourceProvider_createdTime_idx"
ON "public"."AgencyLead"("orgId", "sourceProvider", "createdTime");

CREATE INDEX "AgencyLead_orgId_adAccountId_createdTime_idx"
ON "public"."AgencyLead"("orgId", "adAccountId", "createdTime");

CREATE INDEX "AgencyLead_orgId_adId_idx"
ON "public"."AgencyLead"("orgId", "adId");

ALTER TABLE "public"."AgencyMetaAdAccount"
ADD CONSTRAINT "AgencyMetaAdAccount_orgId_fkey"
FOREIGN KEY ("orgId") REFERENCES "public"."Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
