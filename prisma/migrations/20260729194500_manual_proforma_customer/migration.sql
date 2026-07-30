ALTER TABLE "Invoice"
  ALTER COLUMN "clientId" DROP NOT NULL;

ALTER TABLE "Invoice"
  DROP CONSTRAINT IF EXISTS "Invoice_clientId_fkey";

ALTER TABLE "Invoice"
  ADD CONSTRAINT "Invoice_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
