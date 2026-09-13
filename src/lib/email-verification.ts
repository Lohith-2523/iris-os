import 'server-only';

export class EmailVerificationRequiredError extends Error {
  constructor(message = 'Confirm your email address before creating your workspace.') {
    super(message);
    this.name = 'EmailVerificationRequiredError';
  }
}

export async function requireEmailConfirmationEnabled() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('Authentication service is not configured.');
  const response = await fetch(`${url}/auth/v1/settings`, {
    headers: { apikey: key },
    cache: 'no-store',
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error('Unable to verify authentication configuration.');
  const settings = await response.json();
  if (settings.mailer_autoconfirm !== false) {
    throw new EmailVerificationRequiredError('Email signup is temporarily unavailable while email verification is configured. You can continue with Google.');
  }
}
