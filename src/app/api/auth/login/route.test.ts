// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  verifyRecaptchaToken: vi.fn(),
}));

vi.mock('@/lib/server', () => ({
  createClient: async () => ({ auth: { signInWithPassword: mocks.signInWithPassword } }),
}));
vi.mock('@/lib/recaptcha', () => ({
  RecaptchaConfigurationError: class RecaptchaConfigurationError extends Error {},
  verifyRecaptchaToken: mocks.verifyRecaptchaToken,
}));

import { POST } from './route';

const request = (body: unknown) => new Request('https://iris.example/api/auth/login', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});
const credentials = {
  email: 'PERSON@example.com',
  password: 'a-strong-password',
  recaptchaToken: 'verified-token-with-enough-length',
};

describe('verified password login', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.verifyRecaptchaToken.mockResolvedValue(true);
    mocks.signInWithPassword.mockResolvedValue({ error: null });
  });

  it('authenticates after successful Google verification', async () => {
    const response = await POST(request(credentials));
    expect(response.status).toBe(200);
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: 'person@example.com',
      password: 'a-strong-password',
    });
  });

  it('does not contact Supabase when Google verification fails', async () => {
    mocks.verifyRecaptchaToken.mockResolvedValue(false);
    const response = await POST(request(credentials));
    expect(response.status).toBe(400);
    expect(mocks.signInWithPassword).not.toHaveBeenCalled();
  });

  it('preserves provider rate-limit responses', async () => {
    mocks.signInWithPassword.mockResolvedValue({ error: { message: 'Try again later.', status: 429 } });
    expect((await POST(request(credentials))).status).toBe(429);
  });
});
