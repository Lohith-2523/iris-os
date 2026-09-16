// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  exchange: vi.fn(),
  signOut: vi.fn(),
  adminFind: vi.fn(),
  provision: vi.fn(),
}));

vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({ auth: { exchangeCodeForSession: mocks.exchange, signOut: mocks.signOut } }),
}));
vi.mock('@/lib/db', () => ({ prisma: {
  adminAccess: { findUnique: mocks.adminFind },
  user: { findFirst: vi.fn() },
  clientInvite: { findUnique: vi.fn() },
  memberInvite: { findUnique: vi.fn() },
} }));
vi.mock('@/lib/org', () => ({
  provisionAuthenticatedUser: mocks.provision,
  WorkspaceSignupRoleConflictError: class WorkspaceSignupRoleConflictError extends Error {},
  DeletedClientWorkspaceError: class DeletedClientWorkspaceError extends Error {},
}));
vi.mock('@/lib/database-resilience', () => ({ isTransientDatabaseConnectionError: vi.fn(() => false), withDatabaseConnectionRetry: (operation: () => unknown) => operation() }));
vi.mock('@/lib/auth-access', () => ({ hasApprovedSignup: vi.fn(), validateDeviceAccess: vi.fn() }));

import { GET } from './route';

function session(email: string) {
  mocks.exchange.mockResolvedValue({ error: null, data: { session: { user: { id: 'auth-1', email, email_confirmed_at: '2026-09-15T00:00:00Z' } } } });
}

describe('superadmin OAuth callback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'publishable-key');
    mocks.signOut.mockResolvedValue({ error: null });
  });

  it('sends the verified owner directly to the superadmin workspace', async () => {
    session('cto.admin@irisos.app');
    const response = await GET(new Request('http://localhost:3000/auth/callback?code=valid&next=/admin'));
    expect(response.headers.get('location')).toBe('http://localhost:3000/admin');
    expect(mocks.adminFind).not.toHaveBeenCalled();
  });

  it('allows a new account to finish authentication without a waitlist invitation', async () => {
    session('new@example.com');
    mocks.provision.mockResolvedValue({ role: 'ADMIN', organization: { onboardingState: { needsOnboarding: true } } });
    const response = await GET(new Request('https://irisos.app/auth/callback?code=valid&next=/onboarding'));
    expect(response.headers.get('location')).toBe('https://irisos.app/onboarding');
    expect(mocks.provision).toHaveBeenCalledWith(expect.anything(), { intent: 'workspace-signup' });
    expect(mocks.signOut).not.toHaveBeenCalled();
  });

  it('does not route a client identity through top-level workspace signup', async () => {
    session('former-client@example.com');
    const { WorkspaceSignupRoleConflictError } = await import('@/lib/org');
    mocks.provision.mockRejectedValue(new WorkspaceSignupRoleConflictError());

    const response = await GET(new Request('https://irisos.app/auth/callback?code=valid&next=/onboarding'));

    expect(response.headers.get('location')).toBe('https://irisos.app/login?auth_error=account_already_exists');
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('rejects a Google identity without an active superadmin invitation', async () => {
    session('someone@example.com');
    mocks.adminFind.mockResolvedValue(null);
    const response = await GET(new Request('http://localhost:3000/auth/callback?code=valid&next=/admin'));
    expect(response.headers.get('location')).toBe('http://localhost:3000/admin/login?auth_error=admin_access_denied');
    expect(mocks.signOut).toHaveBeenCalled();
  });
});
