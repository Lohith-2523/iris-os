UPDATE "GeneratedDocument"
SET
  "approvedAt" = COALESCE("sentAt", "updatedAt"),
  "approvedByName" = 'Legacy approved document'
WHERE
  "kind" IN ('PROPOSAL', 'CONTRACT')
  AND "approvedAt" IS NULL
  AND "status" IN ('SENT', 'PARTIALLY_SIGNED', 'EXECUTED');
