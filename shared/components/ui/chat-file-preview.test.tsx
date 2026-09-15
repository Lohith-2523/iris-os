import * as React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatFilePreview } from './chat-file-preview';

describe('ChatFilePreview', () => {
  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', undefined);
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:preview'),
      revokeObjectURL: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('shows the top text content, resolved filename, and a download action', async () => {
    const loadFile = vi.fn().mockResolvedValue({
      blob: new Blob(['Proposal overview\nProject goals\nCommercial terms'], { type: 'text/plain' }),
      fileName: 'Northstar proposal.txt',
      mimeType: 'text/plain',
    });

    render(<ChatFilePreview fileKey="proposal-1" fileName="Proposal.txt" loadFile={loadFile} />);

    expect(await screen.findByText(/Proposal overview/)).toBeInTheDocument();
    expect(screen.getByText('Northstar proposal.txt')).toBeInTheDocument();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Download Northstar proposal.txt' })));
    await waitFor(() => expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled());
    expect(loadFile).toHaveBeenCalledTimes(1);
  });
});

