ALTER TABLE "GeneratedDocument"
ADD COLUMN "proformaInvoiceId" TEXT;

CREATE INDEX "GeneratedDocument_proformaInvoiceId_idx" ON "GeneratedDocument"("proformaInvoiceId");

ALTER TABLE "GeneratedDocument"
ADD CONSTRAINT "GeneratedDocument_proformaInvoiceId_fkey"
FOREIGN KEY ("proformaInvoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
