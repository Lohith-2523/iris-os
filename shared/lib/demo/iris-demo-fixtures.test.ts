import { describe, expect, it, vi } from 'vitest';
import type { SetStateAction } from 'react';
import { createIrisDemoState, handleIrisDemoRequest, type IrisDemoState } from '@/lib/demo/iris-demo-fixtures';

function demoHarness() {
  let state = createIrisDemoState();
  const setState = (update: SetStateAction<IrisDemoState>) => {
    state = typeof update === 'function' ? update(state) : update;
  };
  const notice = vi.fn();
  const request = (input: RequestInfo | URL, init?: RequestInit) => handleIrisDemoRequest(state, setState, input, init, notice);
  return { get state() { return state; }, notice, request };
}

describe('IrisOS demo fixtures', () => {
  it('creates a fresh deterministic workspace for every demo session', () => {
    const first = createIrisDemoState();
    const second = createIrisDemoState();

    expect(first).toEqual(second);
    first.clients.pop();
    expect(second.clients).toHaveLength(4);
  });

  it('blocks calendar mutations and preserves the view-only dataset', async () => {
    const demo = demoHarness();
    const response = await demo.request('/api/calendar', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Demo planning review',
        startTime: '2026-10-01T09:00:00.000Z',
        endTime: '2026-10-01T09:30:00.000Z',
        attendees: [],
        color: '#71717a',
      }),
    });

    expect(response.status).toBe(403);
    expect(demo.state.calendarEvents).toHaveLength(3);
    expect(createIrisDemoState().calendarEvents).toHaveLength(3);
  });

  it('blocks routes outside the anonymous demo boundary', async () => {
    const demo = demoHarness();
    const response = await demo.request('/api/onboarding/upload', { method: 'POST' });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ demo: true });
    expect(demo.notice).toHaveBeenCalledWith(expect.stringContaining('disabled'));
  });
});
