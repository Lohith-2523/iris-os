import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getRequestUser } from '@/lib/org';
import { POST } from './route';

vi.mock('@/lib/org', () => ({ getRequestUser: vi.fn() }));

describe('Atlas realtime session', () => {
  beforeEach(() => {
    vi.stubEnv('OPENAI_API_KEY', 'test-key');
    vi.mocked(getRequestUser).mockResolvedValue({
      id: 'user-1',
      name: 'Alex',
      organization: { name: 'Example Agency', plan: 'ADVANCED' },
    } as Awaited<ReturnType<typeof getRequestUser>>);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ value: 'ephemeral-key' }),
    }));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('keeps ordinary voice conversation direct while reserving workspace changes for the authenticated workflow', async () => {
    const response = await POST(new NextRequest('http://localhost/api/atlas-ai/realtime/session', { method: 'POST' }));
    expect(response.status).toBe(200);
    const [, init] = vi.mocked(fetch).mock.calls[0];
    const requestBody = JSON.parse(String(init?.body));
    expect(requestBody.session.audio.input.turn_detection).toMatchObject({
      type: 'server_vad',
      threshold: 0.65,
      silence_duration_ms: 650,
      create_response: false,
    });
    expect(requestBody.session.audio.input.transcription).toMatchObject({
      language: 'en',
      prompt: expect.stringContaining('spoken English only'),
    });
    expect(requestBody.session.instructions).toContain('Respond to a simple greeting with a brief greeting');
    expect(requestBody.session.instructions).toContain('The authenticated server validates and executes those exact details');
    expect(requestBody.session.instructions).toContain('For projects, collect the project name');
    expect(requestBody.session.instructions).toContain('you alone control the voice workflow');
    expect(requestBody.session.instructions).toContain('without asking another AI model');
    expect(requestBody.session.instructions).toContain('Never claim that you started, created');
    const confirmationTool = requestBody.session.tools.find((tool: { name?: string }) => tool.name === 'confirm_workspace_actions');
    expect(confirmationTool).toMatchObject({ type: 'function', name: 'confirm_workspace_actions' });
    expect(confirmationTool.parameters.properties.actions.items.required).toContain('details');
    expect(confirmationTool.parameters.properties.actions.items.properties.details.properties).toMatchObject({
      projectName: { type: 'string' },
      invoiceItems: expect.any(Object),
      startLocal: { type: 'string' },
    });
  });
});
