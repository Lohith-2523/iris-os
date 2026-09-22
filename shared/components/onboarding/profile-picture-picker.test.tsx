import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProfilePicturePicker } from './profile-picture-picker';

describe('profile picture picker', () => {
  it('uses a prominent custom upload control without exposing the native filename field', () => {
    const { container } = render(<ProfilePicturePicker value={null} onChange={() => undefined} name="Test User" />);

    expect(screen.getByText('Choose photo')).toHaveClass('profile-photo-upload', 'bg-white', 'text-black', 'font-bold');
    const input = container.querySelector('input[type="file"]');
    expect(input).toHaveClass('sr-only');
    expect(screen.queryByText(/no file chosen/i)).not.toBeInTheDocument();
  });
});
