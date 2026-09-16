// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ waitlistEnabled: true, signUp: vi.fn(), signOut: vi.fn(), requireConfirmation: vi.fn(), validateAccess: vi.fn(), bindGrant: vi.fn() }));
vi.mock('@/lib/waitlist-config', () => ({ get WAITLIST_ENABLED() { return mocks.waitlistEnabled; } }));
vi.mock('@/lib/server', () => ({ createClient: async () => ({ auth: { signUp: mocks.signUp, signOut: mocks.signOut } }) }));
vi.mock('@/lib/email-verification', () => ({
  requireEmailConfirmationEnabled: mocks.requireConfirmation,
  EmailVerificationRequiredError: class extends Error {},
}));
vi.mock('@/lib/auth-access', () => ({ validateDeviceAccess: mocks.validateAccess, bindDeviceGrantToAuthUser: mocks.bindGrant }));
import { POST } from './route';

const details = { name: 'Test Person', email: 'PERSON@example.com', phone: '+14155552671', password: 'a-strong-password', confirmPassword: 'a-strong-password' };
const request = (body: unknown) => new NextRequest('https://iris.example/api/auth/signup', { method: 'POST', body: JSON.stringify(body) });
describe('verified email signup', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.waitlistEnabled = true;
    mocks.validateAccess.mockResolvedValue({ id: 'grant-1' });
    mocks.signUp.mockResolvedValue({ data: { session: null }, error: null });
  });
  it('rejects invalid email before contacting the provider', async () => {
    const response = await POST(request({ ...details, email: 'not-an-email' }));
    expect(response.status).toBe(400);
    expect(mocks.signUp).not.toHaveBeenCalled();
  });
  it('fails closed when email confirmation is unavailable', async () => {
    mocks.requireConfirmation.mockRejectedValue(new Error('autoconfirm enabled'));
    expect((await POST(request(details))).status).toBe(503);
    expect(mocks.signUp).not.toHaveBeenCalled();
  });
  it('requires a device grant matching the signup email when the waitlist is enabled', async () => {
    mocks.validateAccess.mockResolvedValue(null);
    const response = await POST(request(details));
    expect(response.status).toBe(403);
    expect(mocks.signUp).not.toHaveBeenCalled();
  });
  it('allows signup without a device grant while the waitlist is paused', async () => {
    mocks.waitlistEnabled = false;
    mocks.validateAccess.mockResolvedValue(null);
    const response = await POST(request(details));
    expect(response.status).toBe(202);
    expect(mocks.validateAccess).not.toHaveBeenCalled();
    expect(mocks.bindGrant).not.toHaveBeenCalled();
  });
  it('normalizes email and sends a callback without provisioning a workspace', async () => {
    const response = await POST(request(details));
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ confirmationRequired: true });
    expect(mocks.signUp).toHaveBeenCalledWith(expect.objectContaining({
      email: 'person@example.com',
      options: expect.objectContaining({ emailRedirectTo: 'https://iris.example/auth/callback?next=/onboarding' }),
    }));
  });
  it('rejects a session issued without the required confirmation step', async () => {
    mocks.signUp.mockResolvedValue({ data: { session: { access_token: 'test' } }, error: null });
    expect((await POST(request(details))).status).toBe(503);
    expect(mocks.signOut).toHaveBeenCalled();
  });
  it('preserves provider rate-limit responses', async () => {
    mocks.signUp.mockResolvedValue({ data: {}, error: { message: 'Try again later.', status: 429 } });
    expect((await POST(request(details))).status).toBe(429);
  });
});
