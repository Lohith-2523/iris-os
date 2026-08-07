ALTER TABLE "ChangeRequest"
ADD COLUMN "agencyResponse" TEXT,
ADD COLUMN "alternateProposal" TEXT,
ADD COLUMN "finalizedAt" TIMESTAMP(3),
ADD COLUMN "atlasAppliedAt" TIMESTAMP(3),
ADD COLUMN "atlasSummary" TEXT;

UPDATE "ChangeRequest"
SET "status" = CASE
  WHEN "status" = 'RESOLVED' THEN 'FINALIZED'
  WHEN "status" IN ('IN_REVIEW', 'DECLINED') THEN 'DISCUSSION'
  ELSE 'PROPOSED'
END;

ALTER TABLE "ChangeRequest"
ALTER COLUMN "status" SET DEFAULT 'PROPOSED';
