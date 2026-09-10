CREATE TABLE "public"."MessagingAccountKey" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "encryptedPrivateKey" TEXT NOT NULL,
    "publicKeyFingerprint" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessagingAccountKey_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MessagingAccountKey_deviceId_key" ON "public"."MessagingAccountKey"("deviceId");
CREATE UNIQUE INDEX "MessagingAccountKey_userId_publicKeyFingerprint_key" ON "public"."MessagingAccountKey"("userId", "publicKeyFingerprint");
CREATE INDEX "MessagingAccountKey_orgId_userId_idx" ON "public"."MessagingAccountKey"("orgId", "userId");
CREATE INDEX "MessagingAccountKey_userId_isPrimary_idx" ON "public"."MessagingAccountKey"("userId", "isPrimary");

ALTER TABLE "public"."MessagingAccountKey"
ADD CONSTRAINT "MessagingAccountKey_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."MessagingAccountKey"
ADD CONSTRAINT "MessagingAccountKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."MessagingAccountKey"
ADD CONSTRAINT "MessagingAccountKey_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "public"."MessagingDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
