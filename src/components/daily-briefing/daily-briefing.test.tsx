import * as React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DailyBriefing } from './daily-briefing';

const briefing = {
  id: 'briefing-id',
  readCount: 0,
  openedAt: null,
  completedAt: null,
  payload: {
    version: 2,
    businessDate: '2026-08-03',
    generatedAt: '2026-08-03T08:00:00.000Z',
    greeting: 'Good morning, Asha.',
    introduction: 'Here is today’s operating brief.',
    items: [
      {
        id: 'priority-tasks',
        label: 'Priority tasks',
        title: 'Review campaign launch',
        metric: '3',
        summary: 'Three tasks need attention.',
        details: [],
        href: '/tasks',
        tone: 'attention',
      },
      {
        id: 'revenue',
        label: 'Revenue',
        title: 'Revenue is on plan',
        metric: '$42k',
        summary: 'Monthly revenue is tracking to plan.',
        details: [],
        href: '/finance',
        tone: 'positive',
      },
    ],
  },
};

describe('DailyBriefing', () => {
  afterEach(() => vi.restoreAllMocks());

  it('shows the next card as interactive while progress saves in the background', async () => {
    let finishProgress!: (response: Response) => void;
    const pendingProgress = new Promise<Response>((resolve) => { finishProgress = resolve; });

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_input, init) => {
      if (!init?.method) {
        return new Response(JSON.stringify(briefing), { status: 200 });
      }
      const body = JSON.parse(String(init.body)) as { action: string };
      if (body.action === 'progress') return pendingProgress;
      return new Response('{}', { status: 200 });
    });

    render(<DailyBriefing />);
    const firstCard = await screen.findByRole('button', { name: 'File Priority tasks update and continue' });
    fireEvent.click(firstCard);

    const nextCard = await screen.findByRole('button', { name: 'File Revenue update and continue' });
    expect(nextCard).toBeEnabled();

    await act(async () => {
      finishProgress(new Response('{}', { status: 200 }));
      await pendingProgress;
    });
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
  });
});
