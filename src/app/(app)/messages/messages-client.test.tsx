import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const protocol = vi.hoisted(() => ({
  prepare: vi.fn(),
}));

vi.mock('@/lib/messaging/protocol', () => ({
  getMessagingProtocol: () => protocol,
}));

import MessagesClient from './messages-client';

const initialInbox = {
  currentUserId: 'admin-1',
  currentUserRole: 'admin',
  directory: [],
  limits: null,
  conversations: [],
};

const refreshedInbox = {
  ...initialInbox,
  directory: [{ id: 'sub-admin-1', name: 'Sana Shah', email: 'sana@example.com', role: 'sub_admin' }],
  conversations: [{
    id: 'conversation-1',
    updatedAt: '2026-09-10T06:00:00.000Z',
    participant: { id: 'sub-admin-1', name: 'Sana Shah', email: 'sana@example.com', role: 'sub_admin' },
    lastMessage: null,
    messages: [],
    receiptStates: [],
  }],
};

describe('MessagesClient inbox discovery', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    protocol.prepare.mockResolvedValue(undefined);
    vi.stubGlobal('EventSource', class {
      addEventListener() {}
      close() {}
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(refreshedInbox), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('discovers a new sub-admin conversation while the admin inbox remains open', async () => {
    render(<MessagesClient initialInbox={initialInbox} />);
    await act(async () => { await Promise.resolve(); });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(screen.getAllByText('Sana Shah').length).toBeGreaterThan(0);
    expect(screen.getByText('Core member')).toBeInTheDocument();
  });

  it('lets Free users compose before showing the send-time paywall', async () => {
    vi.useRealTimers();
    render(<MessagesClient initialInbox={{ ...refreshedInbox, plan: 'BASIC' }} />);
    await act(async () => { await Promise.resolve(); });

    fireEvent.click((await screen.findByText('Core member')).closest('button')!);
    fireEvent.change(screen.getByPlaceholderText('Write a secure message…'), { target: { value: 'Ready to send' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send encrypted message' }));

    expect(await screen.findByRole('dialog', { name: /Choose a plan for sending messages/ })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Ready to send')).toBeInTheDocument();
  });
});
