CREATE TABLE "AuthAccessToken" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "dedupeKey" TEXT,
    "tokenHash" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "redeemedAt" TIMESTAMP(3),
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lockedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "waitlistEntryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AuthAccessToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DeviceAccessGrant" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "authUserId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "sourceTokenId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DeviceAccessGrant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AuthAccessToken_dedupeKey_key" ON "AuthAccessToken"("dedupeKey");
CREATE UNIQUE INDEX "AuthAccessToken_tokenHash_key" ON "AuthAccessToken"("tokenHash");
CREATE INDEX "AuthAccessToken_status_scheduledAt_idx" ON "AuthAccessToken"("status", "scheduledAt");
CREATE INDEX "AuthAccessToken_email_purpose_createdAt_idx" ON "AuthAccessToken"("email", "purpose", "createdAt");
CREATE INDEX "AuthAccessToken_waitlistEntryId_idx" ON "AuthAccessToken"("waitlistEntryId");
CREATE UNIQUE INDEX "DeviceAccessGrant_tokenHash_key" ON "DeviceAccessGrant"("tokenHash");
CREATE INDEX "DeviceAccessGrant_email_expiresAt_idx" ON "DeviceAccessGrant"("email", "expiresAt");
CREATE INDEX "DeviceAccessGrant_authUserId_idx" ON "DeviceAccessGrant"("authUserId");
CREATE INDEX "DeviceAccessGrant_expiresAt_revokedAt_idx" ON "DeviceAccessGrant"("expiresAt", "revokedAt");

ALTER TABLE "AuthAccessToken" ADD CONSTRAINT "AuthAccessToken_waitlistEntryId_fkey" FOREIGN KEY ("waitlistEntryId") REFERENCES "WaitlistEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserve existing registrations by scheduling their first invitation in the
-- same 24–48 hour window used for new waitlist entries.
INSERT INTO "AuthAccessToken" (
    "id", "email", "purpose", "status", "dedupeKey", "scheduledAt",
    "waitlistEntryId", "createdAt", "updatedAt"
)
SELECT
    'waitlist-access-' || "id",
    "email",
    'WAITLIST_SIGNUP',
    'PENDING',
    'waitlist:' || "id",
    CURRENT_TIMESTAMP + INTERVAL '24 hours' + (random() * INTERVAL '24 hours'),
    "id",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "WaitlistEntry"
ON CONFLICT ("dedupeKey") DO NOTHING;
