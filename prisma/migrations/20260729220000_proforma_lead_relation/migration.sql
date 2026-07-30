ALTER TABLE "Invoice"
  ADD COLUMN "leadId" TEXT;

CREATE INDEX "Invoice_leadId_idx" ON "Invoice"("leadId");

ALTER TABLE "Invoice"
  ADD CONSTRAINT "Invoice_leadId_fkey"
  FOREIGN KEY ("leadId") REFERENCES "AgencyLead"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
