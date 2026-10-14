import 'server-only';

import { createHash } from 'node:crypto';
import { prisma } from '@/lib/db';

type ArtifactKey = {
  orgId: string;
  sourceType: 'INVOICE' | 'REPORT' | 'STRATEGY';
  sourceId: string;
  format: 'PDF';
  sourceVersion: string;
};

function canonical(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonical(child)]),
    );
  }
  return value;
}

export function artifactSourceVersion(value: unknown) {
  return createHash('sha256').update(JSON.stringify(canonical(value))).digest('base64url');
}

export async function readRenderedArtifact(key: ArtifactKey) {
  const artifact = await prisma.renderedDocumentArtifact.findUnique({
    where: {
      sourceType_sourceId_format: {
        sourceType: key.sourceType,
        sourceId: key.sourceId,
        format: key.format,
      },
    },
    select: { orgId: true, sourceVersion: true, content: true },
  });
  if (!artifact || artifact.orgId !== key.orgId || artifact.sourceVersion !== key.sourceVersion) return null;
  return Buffer.from(artifact.content);
}

export async function writeRenderedArtifact(key: ArtifactKey, content: Uint8Array) {
  const storedContent = Buffer.from(content);
  await prisma.renderedDocumentArtifact.upsert({
    where: {
      sourceType_sourceId_format: {
        sourceType: key.sourceType,
        sourceId: key.sourceId,
        format: key.format,
      },
    },
    create: { ...key, content: storedContent },
    update: {
      orgId: key.orgId,
      sourceVersion: key.sourceVersion,
      content: storedContent,
    },
  });
}
