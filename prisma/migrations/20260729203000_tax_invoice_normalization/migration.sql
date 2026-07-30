UPDATE "Invoice"
SET "invoiceType" = 'TAX'
WHERE "documentType" = 'INVOICE'
  AND "invoiceType" <> 'TAX';

ALTER TABLE "Invoice"
  ALTER COLUMN "invoiceType" SET DEFAULT 'TAX';
