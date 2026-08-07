ALTER TABLE "GeneratedDocument"
ADD COLUMN "signingToken" TEXT,
ADD COLUMN "signingTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN "recipientSignerName" TEXT,
ADD COLUMN "recipientSignedAt" TIMESTAMP(3),
ADD COLUMN "recipientSignatureIpHash" TEXT,
ADD COLUMN "recipientSignatureUserAgent" TEXT,
ADD COLUMN "agencySignerName" TEXT,
ADD COLUMN "agencySignedById" TEXT,
ADD COLUMN "agencySignedAt" TIMESTAMP(3),
ADD COLUMN "fullySignedAt" TIMESTAMP(3),
ADD COLUMN "signedContentHash" TEXT,
ADD COLUMN "automationStatus" TEXT,
ADD COLUMN "automationError" TEXT,
ADD COLUMN "onboardedClientId" TEXT,
ADD COLUMN "onboardedProjectId" TEXT;

CREATE UNIQUE INDEX "GeneratedDocument_signingToken_key" ON "GeneratedDocument"("signingToken");
CREATE INDEX "GeneratedDocument_orgId_status_fullySignedAt_idx" ON "GeneratedDocument"("orgId", "status", "fullySignedAt");
