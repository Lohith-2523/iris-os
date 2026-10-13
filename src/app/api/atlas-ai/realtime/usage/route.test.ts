import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getRequestUser } from '@/lib/org';
import { recordAtlasTokenUsage } from '@/lib/atlas-ai/token-budget';
import { POST } from './route';

vi.mock('@/lib/org', () => ({ getRequestUser: vi.fn() }));
vi.mock('@/lib/atlas-ai/token-budget', () => ({
  AtlasTokenLimitError: class AtlasTokenLimitError extends Error { readonly status = 429; },
  recordAtlasTokenUsage: vi.fn(),
}));

describe('POST /api/atlas-ai/realtime/usage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRequestUser).mockResolvedValue({
      id: 'user-1',
      orgId: 'org-1',
      role: 'admin',
      organization: { plan: 'ADVANCED' },
    } as Awaited<ReturnType<typeof getRequestUser>>);
  });

  it('records authenticated realtime usage against the user GPT ledger', async () => {
    const request = new NextRequest('http://localhost/api/atlas-ai/realtime/usage', {
      method: 'POST',
      body: JSON.stringify({ eventId: 'response:resp-1', inputCredits: 132, outputCredits: 121 }),
      headers: { 'content-type': 'application/json' },
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(recordAtlasTokenUsage).toHaveBeenCalledWith({
      orgId: 'org-1',
      userId: 'user-1',
      userRole: 'admin',
      plan: 'ADVANCED',
      provider: 'GPT',
      input: 132,
      output: 121,
    });
  });

  it('rejects empty usage events', async () => {
    const request = new NextRequest('http://localhost/api/atlas-ai/realtime/usage', {
      method: 'POST',
      body: JSON.stringify({ eventId: 'response:resp-1', inputCredits: 0, outputCredits: 0 }),
      headers: { 'content-type': 'application/json' },
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(recordAtlasTokenUsage).not.toHaveBeenCalled();
  });
});
