CREATE TABLE "RenderedDocumentArtifact" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "sourceVersion" TEXT NOT NULL,
    "content" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RenderedDocumentArtifact_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RenderedDocumentArtifact_sourceType_sourceId_format_key"
ON "RenderedDocumentArtifact"("sourceType", "sourceId", "format");

CREATE INDEX "RenderedDocumentArtifact_orgId_sourceType_sourceId_idx"
ON "RenderedDocumentArtifact"("orgId", "sourceType", "sourceId");

ALTER TABLE "RenderedDocumentArtifact"
ADD CONSTRAINT "RenderedDocumentArtifact_orgId_fkey"
FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
