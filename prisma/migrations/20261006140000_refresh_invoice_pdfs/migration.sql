-- Existing invoice PDFs are rendered from their saved records on demand.
-- Mark every prior render as stale so the next view or download regenerates it
-- through the current renderer and records a fresh successful timestamp.
UPDATE "Invoice"
SET "pdfGeneratedAt" = NULL;
