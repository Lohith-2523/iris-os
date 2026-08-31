import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AsyncButtonFeedback } from '@/components/app-shell/async-button-feedback';

describe('AsyncButtonFeedback', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('adds delayed feedback to an explicitly duplicate-sensitive action', async () => {
    vi.useFakeTimers();
    let finishRequest: ((response: Response) => void) | undefined;
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((resolve) => { finishRequest = resolve; })));

    function Example() {
      return <button data-duplicate-sensitive onClick={() => { void window.fetch('/api/tasks', { method: 'POST' }); }}>Save task</button>;
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

  it('does not add loading feedback to ordinary API-backed buttons', () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => undefined)));

    function Example() {
      return (
        <button
          onClick={() => { void window.fetch('/api/workspace', { method: 'PATCH' }); }}
        >
          Toggle theme
        </button>
      );
    }

    render(<><AsyncButtonFeedback /><Example /></>);
    const button = screen.getByRole('button', { name: 'Toggle theme' });
    fireEvent.click(button);
    act(() => vi.advanceTimersByTime(150));

    expect(button).not.toHaveClass('workspace-auto-pending');
    expect(button).not.toHaveAttribute('aria-busy');
  });
});
