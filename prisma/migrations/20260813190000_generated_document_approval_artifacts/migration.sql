ALTER TABLE "GeneratedDocument"
ADD COLUMN "approvedAt" TIMESTAMP(3),
ADD COLUMN "approvedById" TEXT,
ADD COLUMN "approvedByName" TEXT,
ADD COLUMN "pdfArtifact" BYTEA,
ADD COLUMN "docxArtifact" BYTEA,
ADD COLUMN "artifactsGeneratedAt" TIMESTAMP(3);

ALTER TABLE "GeneratedDocument"
ALTER COLUMN "status" SET DEFAULT 'PENDING_APPROVAL';

CREATE INDEX "GeneratedDocument_orgId_approvedAt_idx"
ON "GeneratedDocument"("orgId", "approvedAt");
