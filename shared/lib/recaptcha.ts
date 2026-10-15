import 'server-only';
import { RECAPTCHA_CONTACT_ACTION, RECAPTCHA_ENTERPRISE_SITE_KEY } from '@/config/recaptcha';

const RECAPTCHA_ENTERPRISE_PROJECT_ID = 'gen-lang-client-0335126976';

type RecaptchaAssessment = {
  tokenProperties?: {
    valid?: boolean;
    action?: string;
    invalidReason?: string;
  };
  riskAnalysis?: {
    score?: number;
    reasons?: string[];
  };
};

export class RecaptchaConfigurationError extends Error {
  constructor() {
    super('Google reCAPTCHA is not configured.');
    this.name = 'RecaptchaConfigurationError';
  }
}

export async function verifyRecaptchaToken(input: { token: string; remoteIp?: string; userAgent?: string }) {
  const apiKey = process.env.RECAPTCHA_ENTERPRISE_API_KEY?.trim();
  if (!apiKey) throw new RecaptchaConfigurationError();
  const minimumScore = Number(process.env.RECAPTCHA_ENTERPRISE_MIN_SCORE || '0.5');
  if (!Number.isFinite(minimumScore) || minimumScore < 0 || minimumScore > 1) {
    throw new RecaptchaConfigurationError();
  }

  const response = await fetch(`https://recaptchaenterprise.googleapis.com/v1/projects/${RECAPTCHA_ENTERPRISE_PROJECT_ID}/assessments?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: {
        token: input.token,
        expectedAction: RECAPTCHA_CONTACT_ACTION,
        siteKey: RECAPTCHA_ENTERPRISE_SITE_KEY,
        ...(input.remoteIp ? { userIpAddress: input.remoteIp } : {}),
        ...(input.userAgent ? { userAgent: input.userAgent } : {}),
      },
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) {
    console.error('Google reCAPTCHA assessment request failed.', { status: response.status });
    return false;
  }
  const assessment = await response.json() as RecaptchaAssessment;

  if (!assessment.tokenProperties?.valid) {
    console.warn('reCAPTCHA assessment rejected a contact token.', {
      invalidReason: assessment.tokenProperties?.invalidReason || 'UNKNOWN',
    });
    return false;
  }
  if (assessment.tokenProperties.action !== RECAPTCHA_CONTACT_ACTION) {
    console.warn('reCAPTCHA contact action mismatch.', {
      receivedAction: assessment.tokenProperties.action || 'MISSING',
      expectedAction: RECAPTCHA_CONTACT_ACTION,
    });
    return false;
  }
  const score = assessment.riskAnalysis?.score;
  if (typeof score !== 'number' || score < minimumScore) {
    console.warn('reCAPTCHA contact assessment did not meet the score threshold.', {
      score: score ?? 'MISSING',
      minimumScore,
      reasons: assessment.riskAnalysis?.reasons || [],
    });
    return false;
  }
  return true;
}
