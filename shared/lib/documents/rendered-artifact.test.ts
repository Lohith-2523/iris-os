import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  upsert: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({
  prisma: {
    renderedDocumentArtifact: {
      findUnique: mocks.findUnique,
      upsert: mocks.upsert,
    },
  },
}));

import { artifactSourceVersion, readRenderedArtifact, writeRenderedArtifact } from './rendered-artifact';

const key = {
  orgId: 'org-1',
  sourceType: 'REPORT' as const,
  sourceId: 'report-1',
  format: 'PDF' as const,
  sourceVersion: 'version-1',
};

describe('rendered document artifacts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates the same source version regardless of object key order', () => {
    expect(artifactSourceVersion({ title: 'Report', nested: { b: 2, a: 1 } }))
      .toBe(artifactSourceVersion({ nested: { a: 1, b: 2 }, title: 'Report' }));
  });

  it('returns only an artifact matching the organization and source version', async () => {
    mocks.findUnique.mockResolvedValue({ orgId: 'org-1', sourceVersion: 'version-1', content: Buffer.from('%PDF') });
    await expect(readRenderedArtifact(key)).resolves.toEqual(Buffer.from('%PDF'));

    mocks.findUnique.mockResolvedValue({ orgId: 'org-1', sourceVersion: 'older', content: Buffer.from('%PDF') });
    await expect(readRenderedArtifact(key)).resolves.toBeNull();
  });

  it('upserts regenerated content at the stable source key', async () => {
    mocks.upsert.mockResolvedValue({});
    await writeRenderedArtifact(key, Buffer.from('%PDF-new'));
    expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { sourceType_sourceId_format: { sourceType: 'REPORT', sourceId: 'report-1', format: 'PDF' } },
      update: expect.objectContaining({ sourceVersion: 'version-1' }),
    }));
  });
});
