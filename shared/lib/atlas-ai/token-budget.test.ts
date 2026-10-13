import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const db = vi.hoisted(() => ({
  updateMany: vi.fn(),
  findUnique: vi.fn(),
}));
vi.mock('@/lib/db', () => ({
  prisma: {
    organization: {
      updateMany: db.updateMany,
      findUnique: db.findUnique,
    },
  },
}));
import { atlasUsagePeriod, reserveAtlasTokens } from './token-budget';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Miles monthly credit periods', () => {
  it('uses UTC calendar months', () => {
    expect(atlasUsagePeriod(new Date('2026-09-30T23:59:59.999Z'))).toEqual({
      periodStart: new Date('2026-09-01T00:00:00.000Z'),
      resetsAt: new Date('2026-10-01T00:00:00.000Z'),
    });
  });

  it('rolls December into January', () => {
    expect(atlasUsagePeriod(new Date('2026-12-15T12:00:00.000Z')).resetsAt).toEqual(
      new Date('2027-01-01T00:00:00.000Z'),
    );
  });

  it('lets a provider borrow unused credits after its soft allocation is exhausted', async () => {
    db.updateMany
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 });

    await expect(reserveAtlasTokens({
      orgId: 'org-1',
      userId: 'user-1',
      userRole: 'admin',
      plan: 'PRO',
      provider: 'GEMINI',
      input: 10,
      output: 20,
    })).resolves.toMatchObject({ provider: 'GEMINI', input: 10, output: 20 });

    expect(db.updateMany).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: expect.not.objectContaining({ atlasGeminiTokensUsed: expect.anything() }),
      data: expect.objectContaining({ atlasGeminiTokensUsed: { increment: 30 } }),
    }));
  });
});
