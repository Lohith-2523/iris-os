import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Badge, isSuccessStatusLabel } from './badge';

describe('Badge success statuses', () => {
  it.each(['Approved', 'APPROVED', 'Client approved', 'Completed', 'Onboarding completed'])(
    'uses the shared green treatment for %s',
    (label) => {
      render(<Badge variant="outline" className="border-zinc-700 bg-transparent text-zinc-300">{label}</Badge>);

      expect(screen.getByText(label)).toHaveClass(
        'badge-success',
        'border-emerald-400/60',
        'bg-emerald-950/80',
        'text-emerald-200'
      );
      expect(screen.getByText(label)).not.toHaveClass('border-zinc-700', 'bg-transparent', 'text-zinc-300');
    }
  );

  it('does not recolor unrelated labels', () => {
    render(<Badge variant="outline">Awaiting approval</Badge>);

    expect(screen.getByText('Awaiting approval')).not.toHaveClass('badge-success');
    expect(isSuccessStatusLabel('Completion pending')).toBe(false);
  });

  it('recognizes status text wrapped in child elements', () => {
    render(<Badge><span>Completed</span></Badge>);

    expect(screen.getByText('Completed').parentElement).toHaveClass('badge-success');
  });
});
