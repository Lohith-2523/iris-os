import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getRequestUser } from '@/lib/org';
import { getAtlasWorkspaceContext } from '@/lib/atlas-ai/workspace-context';
import { POST } from './route';

vi.mock('@/lib/org', () => ({ getRequestUser: vi.fn() }));
vi.mock('@/lib/atlas-ai/workspace-context', () => ({ getAtlasWorkspaceContext: vi.fn() }));

describe('Miles realtime session', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('OPENAI_API_KEY', 'test-key');
    vi.mocked(getRequestUser).mockResolvedValue({
      id: 'user-1',
      role: 'admin',
      name: 'Alex',
      organization: { name: 'Example Agency', plan: 'ADVANCED' },
    } as Awaited<ReturnType<typeof getRequestUser>>);
    vi.mocked(getAtlasWorkspaceContext).mockResolvedValue('Consent enabled. Client: Acme. Project: Nova Launch.');
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
      type: 'semantic_vad',
      eagerness: 'low',
      create_response: false,
      interrupt_response: false,
    });
    expect(requestBody.session.audio.input.turn_detection).not.toHaveProperty('silence_duration_ms');
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
    expect(getAtlasWorkspaceContext).toHaveBeenCalledWith(expect.objectContaining({ name: 'Example Agency' }));
    expect(requestBody.session.instructions).toContain('Client: Acme. Project: Nova Launch.');
    const confirmationTool = requestBody.session.tools.find((tool: { name?: string }) => tool.name === 'confirm_workspace_actions');
    expect(confirmationTool).toMatchObject({ type: 'function', name: 'confirm_workspace_actions' });
    expect(confirmationTool.parameters.properties.actions.items.required).toContain('details');
    expect(confirmationTool.parameters.properties.actions.items.properties.details.properties).toMatchObject({
      projectName: { type: 'string' },
      invoiceItems: expect.any(Object),
      startLocal: { type: 'string' },
    });
  });

  it('passes the disabled-consent policy into voice instructions', async () => {
    vi.mocked(getAtlasWorkspaceContext).mockResolvedValue('The user has disabled AI data-sharing consent.');
    await POST(new NextRequest('http://localhost/api/atlas-ai/realtime/session', { method: 'POST' }));
    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect(JSON.parse(String(init?.body)).session.instructions).toContain('disabled AI data-sharing consent');
  });

  it.each(['member', 'client'])('does not expose agency snapshots to %s accounts', async (role) => {
    const user = await getRequestUser();
    vi.mocked(getRequestUser).mockResolvedValue({ ...user, role } as Awaited<ReturnType<typeof getRequestUser>>);
    const response = await POST(new NextRequest('http://localhost/api/atlas-ai/realtime/session', { method: 'POST' }));
    expect(response.status).toBe(403);
    expect(getAtlasWorkspaceContext).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
});
