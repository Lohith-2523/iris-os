import 'server-only';

import { createHash } from 'node:crypto';
import { prisma } from '@/lib/db';

// Only normalized metadata is persisted. Raw errors, request data and secrets are excluded.
export async function recordBackendIncident(source: string, summary: string) {
  const fingerprint = createHash('sha256').update(`${source}:${summary}`).digest('hex');
  try {
    await prisma.backendIncident.upsert({
      where: { fingerprint },
      create: { fingerprint, source: source.slice(0, 240), summary: summary.slice(0, 500) },
      update: { occurrences: { increment: 1 }, lastSeenAt: new Date(), status: 'OPEN' },
    });
  } catch {
    console.warn('Backend incident persistence unavailable');
  }
}
