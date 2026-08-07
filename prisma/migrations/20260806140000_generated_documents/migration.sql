CREATE TABLE "GeneratedDocument" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "recipientType" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "prompt" TEXT,
    "content" JSONB NOT NULL,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GeneratedDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GeneratedDocument_orgId_kind_createdAt_idx" ON "GeneratedDocument"("orgId", "kind", "createdAt");
CREATE INDEX "GeneratedDocument_orgId_recipientType_recipientId_idx" ON "GeneratedDocument"("orgId", "recipientType", "recipientId");
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
