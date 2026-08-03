import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PASSWORD_RECOVERY_COOKIE,
  PASSWORD_RECOVERY_COOKIE_VALUE,
} from '@/lib/auth-routes';

const auth = vi.hoisted(() => ({
  getUser: vi.fn(),
  updateUser: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({ auth }),
}));

import { POST } from './route';

function resetRequest(withRecoveryGrant: boolean) {
  return new NextRequest('http://localhost:3000/api/auth/reset-password', {
    method: 'POST',
    headers: withRecoveryGrant
      ? { cookie: `${PASSWORD_RECOVERY_COOKIE}=${PASSWORD_RECOVERY_COOKIE_VALUE}` }
      : undefined,
    body: JSON.stringify({
      password: 'new-secure-password',
      confirmPassword: 'new-secure-password',
    }),
  });
}

describe('POST /api/auth/reset-password', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'publishable-key');
    auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } }, error: null });
    auth.updateUser.mockResolvedValue({ error: null });
    auth.signOut.mockResolvedValue({ error: null });
  });

  it('rejects password changes without the secure-link grant', async () => {
    const response = await POST(resetRequest(false));

    expect(response.status).toBe(403);
    expect(auth.updateUser).not.toHaveBeenCalled();
  });

  it('updates the password, signs out, and consumes the grant', async () => {
    const response = await POST(resetRequest(true));

    expect(response.status).toBe(200);
    expect(auth.updateUser).toHaveBeenCalledWith({ password: 'new-secure-password' });
    expect(auth.signOut).toHaveBeenCalledOnce();
    expect(response.cookies.get(PASSWORD_RECOVERY_COOKIE)?.value).toBe('');
  });
});
