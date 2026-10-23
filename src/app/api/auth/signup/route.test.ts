// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ signUp: vi.fn(), signOut: vi.fn(), verifyRecaptchaToken: vi.fn() }));
vi.mock('@/lib/server', () => ({ createClient: async () => ({ auth: { signUp: mocks.signUp, signOut: mocks.signOut } }) }));
vi.mock('@/lib/recaptcha', () => ({
  RecaptchaConfigurationError: class RecaptchaConfigurationError extends Error {},
  verifyRecaptchaToken: mocks.verifyRecaptchaToken,
}));
import { POST } from './route';

const details = { name: 'Test Person', email: 'PERSON@example.com', phone: '+14155552671', password: 'a-strong-password', confirmPassword: 'a-strong-password', recaptchaToken: 'verified-token-with-enough-length' };
const request = (body: unknown) => new NextRequest('https://iris.example/api/auth/signup', { method: 'POST', body: JSON.stringify(body) });
describe('verified email signup', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.signOut.mockResolvedValue({ error: null });
    mocks.signUp.mockResolvedValue({ data: { session: null }, error: null });
    mocks.verifyRecaptchaToken.mockResolvedValue(true);
  });
  it('rejects invalid email before contacting the provider', async () => {
    const response = await POST(request({ ...details, email: 'not-an-email' }));
    expect(response.status).toBe(400);
    expect(mocks.signUp).not.toHaveBeenCalled();
  });
  it('allows signup without an invitation or device grant', async () => {
    const response = await POST(request(details));
    expect(response.status).toBe(202);
  });
  it('rejects signup when Google verification fails', async () => {
    mocks.verifyRecaptchaToken.mockResolvedValue(false);
    const response = await POST(request(details));
    expect(response.status).toBe(400);
    expect(mocks.signUp).not.toHaveBeenCalled();
  });
  it('normalizes email and sends a callback without provisioning a workspace', async () => {
    const response = await POST(request(details));
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ confirmationRequired: true });
    expect(mocks.signUp).toHaveBeenCalledWith(expect.objectContaining({
      email: 'person@example.com',
      options: expect.objectContaining({ emailRedirectTo: 'https://iris.example/auth/callback?next=/onboarding' }),
    }));
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(mocks.signOut.mock.invocationCallOrder[0]).toBeLessThan(mocks.signUp.mock.invocationCallOrder[0]);
  });
  it('keeps an immediately confirmed email signup authenticated', async () => {
    mocks.signUp.mockResolvedValue({ data: { session: { access_token: 'test' } }, error: null });
    const response = await POST(request(details));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ confirmationRequired: false });
  });
  it('preserves provider rate-limit responses', async () => {
    mocks.signUp.mockResolvedValue({ data: {}, error: { message: 'Try again later.', status: 429 } });
    expect((await POST(request(details))).status).toBe(429);
  });
});
