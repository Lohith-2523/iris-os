import * as React from 'react';
import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfettiCelebration } from './confetti-celebration';

describe('ConfettiCelebration', () => {
  afterEach(() => vi.useRealTimers());

  it('renders a non-interactive burst and removes it after the celebration', () => {
    vi.useFakeTimers();
    render(<ConfettiCelebration />);

    const celebration = screen.getByTestId('onboarding-confetti');
    expect(celebration).toHaveAttribute('aria-hidden', 'true');
    expect(celebration.children).toHaveLength(128);

    act(() => vi.advanceTimersByTime(3500));
    expect(screen.queryByTestId('onboarding-confetti')).not.toBeInTheDocument();
  });
});
