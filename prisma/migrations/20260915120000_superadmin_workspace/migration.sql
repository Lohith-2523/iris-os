ALTER TABLE "HelpRequest" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'OPEN';

CREATE TABLE "AdminAccess" (
  "email" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'VIEWER',
  "invitedBy" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminAccess_pkey" PRIMARY KEY ("email")
);
CREATE INDEX "AdminAccess_expiresAt_revokedAt_idx" ON "AdminAccess"("expiresAt", "revokedAt");

CREATE TABLE "ManagedCoupon" (
  "id" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "codeSalt" TEXT NOT NULL,
  "codeDigest" TEXT NOT NULL,
  "codeHint" TEXT NOT NULL,
  "plan" TEXT NOT NULL DEFAULT 'ANY',
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endsAt" TIMESTAMP(3),
  "maxUses" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ManagedCoupon_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ManagedCoupon_codeDigest_key" ON "ManagedCoupon"("codeDigest");
CREATE INDEX "ManagedCoupon_enabled_startsAt_endsAt_idx" ON "ManagedCoupon"("enabled", "startsAt", "endsAt");

-- Move the three pre-existing one-way coupon digests into the managed catalog.
INSERT INTO "ManagedCoupon" ("id", "label", "codeSalt", "codeDigest", "codeHint", "plan", "enabled", "startsAt", "createdAt", "updatedAt") VALUES
  ('standard', 'Legacy standard access', 'b34b34a089f593b19a526313b093286a', 'f3f1465d91fbba35b91313da6eb6d2ca192d0aca5634cb9a30fa2fe5697a6eff', 'Legacy code', 'ANY', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('sgrl', 'Legacy SGRL access', '6e41a792a1e972bb47ba4d3f78f70d5d', '9980ded5c40d2381a54668480c8a30e23842bc343074a2eb1df14125df58a8d4', 'Legacy code', 'ANY', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('sls', 'Legacy SLS access', '2ccdfc86a019e827fd302509db47dbf8', 'a2ffc5cebb40a639075b6561b386dc84005e2ee3465718de98f541e272065696', 'Legacy code', 'ANY', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

CREATE TABLE "PlatformPayment" (
  "paymentId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "plan" TEXT NOT NULL,
  "currency" TEXT NOT NULL,
  "baseAmount" INTEGER NOT NULL,
  "taxAmount" INTEGER NOT NULL,
  "totalAmount" INTEGER NOT NULL,
  "refundedAmount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformPayment_pkey" PRIMARY KEY ("paymentId")
);
CREATE UNIQUE INDEX "PlatformPayment_orderId_key" ON "PlatformPayment"("orderId");
CREATE INDEX "PlatformPayment_createdAt_idx" ON "PlatformPayment"("createdAt");
CREATE INDEX "PlatformPayment_userId_createdAt_idx" ON "PlatformPayment"("userId", "createdAt");
CREATE INDEX "PlatformPayment_orgId_createdAt_idx" ON "PlatformPayment"("orgId", "createdAt");

CREATE TABLE "UserActivity" (
  "userId" TEXT NOT NULL,
  "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "requests" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "UserActivity_pkey" PRIMARY KEY ("userId")
);
CREATE INDEX "UserActivity_lastActiveAt_idx" ON "UserActivity"("lastActiveAt");

CREATE TABLE "BackendIncident" (
  "id" TEXT NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "occurrences" INTEGER NOT NULL DEFAULT 1,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BackendIncident_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BackendIncident_fingerprint_key" ON "BackendIncident"("fingerprint");
CREATE INDEX "BackendIncident_status_lastSeenAt_idx" ON "BackendIncident"("status", "lastSeenAt");
