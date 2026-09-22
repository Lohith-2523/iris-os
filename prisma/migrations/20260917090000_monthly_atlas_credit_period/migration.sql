ALTER TABLE "Organization"
ADD COLUMN "atlasUsagePeriodStart" TIMESTAMP(3) NOT NULL DEFAULT date_trunc('month', CURRENT_TIMESTAMP);
