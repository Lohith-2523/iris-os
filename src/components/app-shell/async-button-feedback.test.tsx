import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AsyncButtonFeedback } from '@/components/app-shell/async-button-feedback';

describe('AsyncButtonFeedback', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('adds delayed feedback to an uncovered API-backed action button', async () => {
    vi.useFakeTimers();
    let finishRequest: ((response: Response) => void) | undefined;
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((resolve) => { finishRequest = resolve; })));

    function Example() {
      return <button onClick={() => { void window.fetch('/api/tasks', { method: 'POST' }); }}>Save task</button>;
    }

    render(<><AsyncButtonFeedback /><Example /></>);
    const button = screen.getByRole('button', { name: 'Save task' });
    fireEvent.click(button);
    expect(button).not.toHaveClass('workspace-auto-pending');

    act(() => vi.advanceTimersByTime(150));
    expect(button).toHaveClass('workspace-auto-pending');
    expect(button).toHaveAttribute('aria-busy', 'true');

    await act(async () => finishRequest?.(new Response('{}', { status: 200 })));
    expect(button).not.toHaveClass('workspace-auto-pending');
    expect(button).not.toHaveAttribute('aria-busy');
  });
});
