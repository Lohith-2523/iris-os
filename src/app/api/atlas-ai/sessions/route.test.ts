import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getRequestUser: vi.fn(),
  transaction: vi.fn(),
  findSession: vi.fn(),
  createSession: vi.fn(),
  updateSession: vi.fn(),
  createMessage: vi.fn(),
}));

vi.mock('@/lib/org', () => ({ getRequestUser: mocks.getRequestUser }));
vi.mock('@/lib/db', () => ({
  prisma: { $transaction: mocks.transaction },
}));

import { POST } from './route';

function voiceTurn(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/atlas-ai/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/atlas-ai/sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRequestUser.mockResolvedValue({
      id: 'user-1',
      orgId: 'org-1',
      organization: { plan: 'ADVANCED' },
    });
    mocks.transaction.mockImplementation(async (callback) => callback({
      atlasChatSession: {
        findFirst: mocks.findSession,
        create: mocks.createSession,
        update: mocks.updateSession,
      },
      askAtlasMessage: { create: mocks.createMessage },
    }));
    mocks.createSession.mockResolvedValue({ id: 'voice-session-1' });
    mocks.findSession.mockResolvedValue({ id: 'voice-session-1' });
    mocks.updateSession.mockResolvedValue({ id: 'voice-session-1' });
    mocks.createMessage.mockResolvedValue({ id: 'message-1' });
  });

  it('creates a persisted chat from the first completed voice turn', async () => {
    const response = await POST(voiceTurn({ role: 'user', content: 'Hello Atlas' }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ sessionId: 'voice-session-1', created: true });
    expect(mocks.createSession).toHaveBeenCalledWith({
      data: { title: 'Hello Atlas', userId: 'user-1', orgId: 'org-1' },
      select: { id: true },
    });
    expect(mocks.createMessage).toHaveBeenCalledWith({
      data: {
        role: 'user',
        content: 'Hello Atlas',
        userId: 'user-1',
        orgId: 'org-1',
        sessionId: 'voice-session-1',
      },
    });
  });

  it('allows Free workspaces to persist Atlas chat history', async () => {
    mocks.getRequestUser.mockResolvedValue({
      id: 'user-1',
      orgId: 'org-1',
      organization: { plan: 'BASIC' },
    });

    const response = await POST(voiceTurn({ role: 'user', content: 'Hello Atlas' }));

    expect(response.status).toBe(200);
    expect(mocks.createMessage).toHaveBeenCalledOnce();
  });

  it('rejects appending a voice turn to another user session', async () => {
    mocks.findSession.mockResolvedValue(null);

    const response = await POST(voiceTurn({
      role: 'assistant',
      content: 'Hello there',
      sessionId: 'other-session',
    }));

    expect(response.status).toBe(404);
    expect(mocks.findSession).toHaveBeenCalledWith({
      where: { id: 'other-session', userId: 'user-1', orgId: 'org-1' },
      select: { id: true },
    });
    expect(mocks.createMessage).not.toHaveBeenCalled();
  });
});
