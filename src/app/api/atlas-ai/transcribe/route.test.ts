import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getRequestUser } from '@/lib/org';
import { reserveAtlasTokens, settleAtlasTokenReservation } from '@/lib/atlas-ai/token-budget';
import { POST } from './route';

vi.mock('@/lib/org', () => ({ getRequestUser: vi.fn() }));
vi.mock('@/lib/atlas-ai/token-budget', () => ({
  AtlasTokenLimitError: class AtlasTokenLimitError extends Error { readonly status = 429; },
  reserveAtlasTokens: vi.fn(),
  settleAtlasTokenReservation: vi.fn(),
}));

function transcriptionRequest() {
  const form = new FormData();
  form.append('file', new File(['recorded audio'], 'recording.webm', { type: 'audio/webm' }));
  return { formData: async () => form } as NextRequest;
}

describe('POST /api/atlas-ai/transcribe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('OPENAI_API_KEY', 'test-key');
    vi.mocked(getRequestUser).mockResolvedValue({
      id: 'user-1',
      orgId: 'org-1',
      role: 'admin',
      organization: { plan: 'BASIC' },
    } as Awaited<ReturnType<typeof getRequestUser>>);
    vi.mocked(reserveAtlasTokens).mockResolvedValue({
      orgId: 'org-1', userId: 'user-1', userRole: 'admin', plan: 'BASIC', provider: 'GPT',
      input: 256, output: 128, periodStart: new Date('2026-10-01T00:00:00.000Z'),
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        text: 'Create a project, please.',
        usage: { input_tokens: 14, output_tokens: 45, total_tokens: 59 },
      }),
    }));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('allows a Basic workspace to use the Miles transcription included by its entitlements', async () => {
    const response = await POST(transcriptionRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ text: 'Create a project, please.' });
    expect(fetch).toHaveBeenCalledOnce();
    expect(settleAtlasTokenReservation).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'GPT', userId: 'user-1' }),
      { input: 14, output: 45 },
    );
  });

  it('does not expose provider failures as raw server errors', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: { message: 'Internal Server Error' } }),
    } as Response);

    const response = await POST(transcriptionRequest());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'Oops! Something went wrong. Please try again.' });
    expect(settleAtlasTokenReservation).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'GPT' }),
      null,
    );
  });
});
