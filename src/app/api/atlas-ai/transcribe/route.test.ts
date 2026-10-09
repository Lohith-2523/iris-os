import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getRequestUser } from '@/lib/org';
import { POST } from './route';

vi.mock('@/lib/org', () => ({ getRequestUser: vi.fn() }));

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
      organization: { plan: 'BASIC' },
    } as Awaited<ReturnType<typeof getRequestUser>>);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ text: 'Create a project, please.' }),
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
  });
});
