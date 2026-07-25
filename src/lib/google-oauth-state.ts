import { createHmac, timingSafeEqual } from 'crypto';

export type GoogleOAuthState = {
  expiresAt: number;
  nonce: string;
  orgId: string;
  returnTo: string;
  userId: string;
};

function signature(encodedPayload: string, secret: string) {
  return createHmac('sha256', secret).update(encodedPayload).digest('base64url');
}

function isValidReturnPath(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//');
}

export function createGoogleOAuthState(payload: GoogleOAuthState, secret: string) {
  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `${encodedPayload}.${signature(encodedPayload, secret)}`;
}

export function verifyGoogleOAuthState(
  state: string,
  secret: string,
  now = Date.now(),
): GoogleOAuthState | null {
  const [encodedPayload, providedSignature] = state.split('.');
  if (!encodedPayload || !providedSignature) return null;

  const expectedSignature = signature(encodedPayload, secret);
  const providedBuffer = Buffer.from(providedSignature, 'utf8');
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8'),
    ) as Partial<GoogleOAuthState>;

    if (
      typeof payload.expiresAt !== 'number' ||
      payload.expiresAt <= now ||
      typeof payload.nonce !== 'string' ||
      payload.nonce.length < 32 ||
      typeof payload.orgId !== 'string' ||
      !payload.orgId ||
      !isValidReturnPath(payload.returnTo) ||
      typeof payload.userId !== 'string' ||
      !payload.userId
    ) {
      return null;
    }

    return payload as GoogleOAuthState;
  } catch {
    return null;
  }
}
