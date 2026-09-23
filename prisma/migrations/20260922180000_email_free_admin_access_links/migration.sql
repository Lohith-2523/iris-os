ALTER TABLE "AuthAccessToken"
  ALTER COLUMN "email" DROP NOT NULL,
  ADD COLUMN "authUserId" TEXT,
  ADD COLUMN "tokenCiphertext" TEXT;

ALTER TABLE "DeviceAccessGrant"
  ALTER COLUMN "email" DROP NOT NULL;

CREATE INDEX "AuthAccessToken_authUserId_purpose_idx"
  ON "AuthAccessToken"("authUserId", "purpose");
