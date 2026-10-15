import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { RecaptchaConfigurationError, verifyRecaptchaToken } from './recaptcha';

describe('reCAPTCHA Enterprise assessment', () => {
  beforeEach(() => {
    vi.stubEnv('RECAPTCHA_ENTERPRISE_PROJECT_ID', 'iris-project');
    vi.stubEnv('RECAPTCHA_ENTERPRISE_API_KEY', 'server-api-key');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('accepts only a valid token with the configured action', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      tokenProperties: { valid: true, action: 'CONTACT', hostname: 'irisos.app' },
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(verifyRecaptchaToken({
      token: 'enterprise-token',
      remoteIp: '203.0.113.10',
      userAgent: 'Iris browser',
    })).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://recaptchaenterprise.googleapis.com/v1/projects/iris-project/assessments?key=server-api-key',
      expect.objectContaining({ method: 'POST', cache: 'no-store' }),
    );
    const options = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(options.body))).toEqual({
      event: {
        token: 'enterprise-token',
        siteKey: '6LeHV_AtAAAAAJ0j7voXH7Bc03WE2HXytR9pg_27',
        expectedAction: 'CONTACT',
        userIpAddress: '203.0.113.10',
        userAgent: 'Iris browser',
      },
    });
  });

  it('rejects action mismatches', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      tokenProperties: { valid: true, action: 'LOGIN' },
    }), { status: 200 })));

    await expect(verifyRecaptchaToken({ token: 'enterprise-token' })).resolves.toBe(false);
  });

  it('fails closed when the server credentials are missing', async () => {
    vi.stubEnv('RECAPTCHA_ENTERPRISE_API_KEY', '');
    await expect(verifyRecaptchaToken({ token: 'enterprise-token' })).rejects.toBeInstanceOf(RecaptchaConfigurationError);
  });
});
