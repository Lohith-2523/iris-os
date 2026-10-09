import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MilesAiConsentControl } from './miles-ai-consent-control';

function ConsentHarness() {
  const [checked, setChecked] = React.useState(false);
  return <MilesAiConsentControl checked={checked} onChange={setChecked} />;
}

describe('MilesAiConsentControl', () => {
  it('toggles consent from the full onboarding card', () => {
    render(<ConsentHarness />);
    const checkbox = screen.getByRole('checkbox', { name: /Enable Miles AI Analysis/i });

    fireEvent.click(screen.getByText(/Allow the AI models to read/i));
    expect(checkbox).toBeChecked();

    fireEvent.click(screen.getByText(/Enable Miles AI Analysis/i));
    expect(checkbox).not.toBeChecked();
  });
});
