import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { RecaptchaConfigurationError, verifyRecaptchaToken } from './recaptcha';

describe('reCAPTCHA Enterprise assessment', () => {
  beforeEach(() => {
    vi.stubEnv('RECAPTCHA_ENTERPRISE_API_KEY', 'server-api-key');
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('posts the generated token and expected action to the configured project', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      tokenProperties: { valid: true, action: 'CONTACT', hostname: 'irisos.app' },
      riskAnalysis: { score: 0.9, reasons: [] },
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(verifyRecaptchaToken({
      token: 'enterprise-token',
      remoteIp: '203.0.113.10',
      userAgent: 'Iris browser',
    })).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://recaptchaenterprise.googleapis.com/v1/projects/gen-lang-client-0335126976/assessments?key=server-api-key',
      expect.objectContaining({ method: 'POST', cache: 'no-store' }),
    );
    const options = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(options.body))).toEqual({
      event: {
        token: 'enterprise-token',
        expectedAction: 'CONTACT',
        siteKey: '6LeHV_AtAAAAAJ0j7voXH7Bc03WE2HXytR9pg_27',
        userIpAddress: '203.0.113.10',
        userAgent: 'Iris browser',
      },
    });
  });

  it('rejects invalid tokens and action mismatches', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        tokenProperties: { valid: false, invalidReason: 'EXPIRED' },
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        tokenProperties: { valid: true, action: 'LOGIN' },
      }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(verifyRecaptchaToken({ token: 'expired-token' })).resolves.toBe(false);
    await expect(verifyRecaptchaToken({ token: 'wrong-action-token' })).resolves.toBe(false);
  });

  it('verifies auth tokens against their dedicated action', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      tokenProperties: { valid: true, action: 'LOGIN' },
      riskAnalysis: { score: 0.9 },
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(verifyRecaptchaToken({
      token: 'login-token',
      expectedAction: 'LOGIN',
    })).resolves.toBe(true);
  });

  it('rejects a valid token when its score is below the configured threshold', async () => {
    vi.stubEnv('RECAPTCHA_ENTERPRISE_MIN_SCORE', '0.5');
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      tokenProperties: { valid: true, action: 'CONTACT' },
      riskAnalysis: { score: 0.3, reasons: ['AUTOMATION'] },
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(verifyRecaptchaToken({ token: 'low-score-token' })).resolves.toBe(false);
  });

  it('fails closed when the server API key is missing', async () => {
    vi.stubEnv('RECAPTCHA_ENTERPRISE_API_KEY', '');
    await expect(verifyRecaptchaToken({ token: 'enterprise-token' })).rejects.toBeInstanceOf(RecaptchaConfigurationError);
  });
});
