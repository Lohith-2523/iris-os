import 'server-only';
import { RECAPTCHA_CONTACT_ACTION, RECAPTCHA_ENTERPRISE_SITE_KEY } from '@/config/recaptcha';

type RecaptchaAssessment = {
  tokenProperties?: {
    valid?: boolean;
    action?: string;
    hostname?: string;
    invalidReason?: string;
  };
};

export class RecaptchaConfigurationError extends Error {
  constructor() {
    super('Google reCAPTCHA is not configured.');
    this.name = 'RecaptchaConfigurationError';
  }
}

export async function verifyRecaptchaToken(input: { token: string; remoteIp?: string; userAgent?: string }) {
  const projectId = process.env.RECAPTCHA_ENTERPRISE_PROJECT_ID?.trim();
  const apiKey = process.env.RECAPTCHA_ENTERPRISE_API_KEY?.trim();
  if (!projectId || !apiKey) throw new RecaptchaConfigurationError();

  const response = await fetch(`https://recaptchaenterprise.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/assessments?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: {
        token: input.token,
        siteKey: RECAPTCHA_ENTERPRISE_SITE_KEY,
        expectedAction: RECAPTCHA_CONTACT_ACTION,
        ...(input.remoteIp ? { userIpAddress: input.remoteIp } : {}),
        ...(input.userAgent ? { userAgent: input.userAgent } : {}),
      },
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) return false;
  const result = await response.json() as RecaptchaAssessment;
  return result.tokenProperties?.valid === true
    && result.tokenProperties.action === RECAPTCHA_CONTACT_ACTION;
}
