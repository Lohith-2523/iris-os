import * as React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { passwordRecoveryRedirectUrl } from '@/lib/auth-routes';

const resetPasswordForEmail = vi.fn();

vi.mock('@/lib/client', () => ({
  createClient: () => ({ auth: { resetPasswordForEmail } }),
}));

vi.mock('@/components/auth/auth-shell', () => ({
  AuthShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import ForgotPasswordPage from './page';

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    resetPasswordForEmail.mockReset();
    resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
  });

  it('asks Supabase to send a recovery link to the callback route', async () => {
    render(<ForgotPasswordPage />);

    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: '  OWNER@AGENCY.COM  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));

    await waitFor(() => {
      expect(resetPasswordForEmail).toHaveBeenCalledWith('owner@agency.com', {
        redirectTo: passwordRecoveryRedirectUrl(window.location.origin),
      });
    });
    expect(screen.getByRole('status')).toHaveTextContent('a password reset link is on its way');
  });
});
