import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { getAtlasTokenUsage } from '@/lib/atlas-ai/token-budget';
import { getRequestUser } from '@/lib/org';

vi.mock('@/lib/atlas-ai/token-budget', () => ({ getAtlasTokenUsage: vi.fn() }));
vi.mock('@/lib/org', () => ({ getRequestUser: vi.fn() }));

import { GET } from './route';

describe('Miles AI usage route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRequestUser).mockResolvedValue({
      orgId: 'org-1',
      organization: { plan: 'PRO' },
    } as never);
    vi.mocked(getAtlasTokenUsage).mockResolvedValue({
      plan: 'PRO',
      total: 90_000,
      input: 25_000,
      output: 65_000,
      providers: { GEMINI: 85_000, GPT: 4_000, CLAUDE: 1_000 },
      periodStart: '2026-10-01T00:00:00.000Z',
      resetsAt: '2026-11-01T00:00:00.000Z',
    });
  });

  it('exposes only the unified Miles AI balance to workspace users', async () => {
    const response = await GET(new NextRequest('http://localhost/api/atlas-ai/usage'));
    const payload = await response.json();

    expect(payload).toEqual({
      plan: 'PRO',
      limits: { total: 200_000, input: 60_000, output: 140_000 },
      usage: {
        total: 90_000,
        input: 25_000,
        output: 65_000,
        periodStart: '2026-10-01T00:00:00.000Z',
        resetsAt: '2026-11-01T00:00:00.000Z',
      },
      remaining: { total: 110_000, input: 35_000, output: 75_000 },
    });
    expect(JSON.stringify(payload)).not.toMatch(/GEMINI|GPT|CLAUDE/);
  });
});
