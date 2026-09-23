import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({ prisma: { organization: {} } }));
import { atlasUsagePeriod } from './token-budget';

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
});
