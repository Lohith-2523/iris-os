import 'server-only';

import { randomBytes } from 'crypto';
import { prisma } from '@/lib/db';
import { decryptIntegrationCredentials, encryptIntegrationCredentials } from '@/lib/integration-secrets';
import { createGoogleOAuthState, verifyGoogleOAuthState } from '@/lib/google-oauth-state';

const GOOGLE_AUTHORIZATION_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v2/userinfo';

export const GOOGLE_OAUTH_STATE_COOKIE = 'crystal_google_calendar_oauth';
export const GOOGLE_CALENDAR_SCOPES = [
  'openid',
  'email',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
] as const;
export const GOOGLE_SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

function googleSheetsOwnerEmail() {
  return (process.env.GOOGLE_SHEETS_OAUTH_USER_EMAIL || 'cto.admin@irisos.app').trim().toLowerCase();
}

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
  expires_in?: number;
  id_token?: string;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
};

type GoogleProfileResponse = {
  email?: string;
  id?: string;
  name?: string;
  verified_email?: boolean;
};

export type GoogleCalendarCredentials = {
  accessToken: string;
  expiresAt: string | null;
  refreshToken: string | null;
  scopes: string[];
  tokenType: string;
};

export class GoogleOAuthError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status = 502,
  ) {
    super(message);
    this.name = 'GoogleOAuthError';
  }
}

function oauthConfig() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new GoogleOAuthError(
      'Google Calendar OAuth credentials are not configured.',
      'configuration_error',
      503,
    );
  }
  return { clientId, clientSecret };
}

function stateSecret() {
  const secret = process.env.INTEGRATION_ENCRYPTION_KEY || process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new GoogleOAuthError(
      'Google Calendar OAuth state signing is not configured.',
      'configuration_error',
      503,
    );
  }
  return secret;
}

export function googleOAuthRedirectUri(requestUrl: string) {
  const configuredUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
  if (configuredUri) return configuredUri;
  return new URL('/api/integrations/google/callback', requestUrl).toString();
}

export function createGoogleAuthorization(input: {
  accountEmail: string;
  orgId: string;
  redirectUri: string;
  returnTo: string;
  userId: string;
}) {
  const { clientId } = oauthConfig();
  const nonce = randomBytes(32).toString('base64url');
  const state = createGoogleOAuthState(
    {
      expiresAt: Date.now() + 15 * 60 * 1000,
      nonce,
      orgId: input.orgId,
      returnTo: input.returnTo,
      userId: input.userId,
    },
    stateSecret(),
  );
  const authorizationUrl = new URL(GOOGLE_AUTHORIZATION_ENDPOINT);
  authorizationUrl.searchParams.set('access_type', 'offline');
  authorizationUrl.searchParams.set('client_id', clientId);
  authorizationUrl.searchParams.set('include_granted_scopes', 'true');
  authorizationUrl.searchParams.set('prompt', 'consent select_account');
  authorizationUrl.searchParams.set('redirect_uri', input.redirectUri);
  authorizationUrl.searchParams.set('response_type', 'code');
  const scopes: string[] = [...GOOGLE_CALENDAR_SCOPES];
  if (input.accountEmail.trim().toLowerCase() === googleSheetsOwnerEmail()) scopes.push(GOOGLE_SHEETS_SCOPE);
  authorizationUrl.searchParams.set('scope', scopes.join(' '));
  authorizationUrl.searchParams.set('state', state);

  return { authorizationUrl, nonce };
}

export function readGoogleOAuthState(state: string) {
  return verifyGoogleOAuthState(state, stateSecret());
}

async function exchangeAuthorizationCode(code: string, redirectUri: string) {
  const { clientId, clientSecret } = oauthConfig();
  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await response.json() as GoogleTokenResponse;

  if (!response.ok || payload.error || !payload.access_token) {
    console.error('Google Calendar OAuth token exchange failed:', payload.error);
    throw new GoogleOAuthError(
      payload.error === 'invalid_grant'
        ? 'Google authorization expired before it could be completed. Try connecting again.'
        : 'Google could not complete the Calendar authorization.',
      'token_exchange_failed',
      payload.error === 'invalid_grant' ? 400 : 502,
    );
  }

  return payload;
}

async function fetchGoogleProfile(
  accessToken: string,
): Promise<GoogleProfileResponse & { email: string }> {
  const response = await fetch(GOOGLE_USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  });
  const profile = await response.json() as GoogleProfileResponse;
  if (!response.ok || !profile.email || profile.verified_email === false) {
    throw new GoogleOAuthError(
      'Google did not return a verified account email.',
      'profile_verification_failed',
    );
  }
  return profile as GoogleProfileResponse & { email: string };
}

function validateCalendarScopes(scopeValue: string | undefined, requireSheetsWrite = false) {
  const grantedScopes = new Set((scopeValue || '').split(/\s+/).filter(Boolean));
  const hasFullCalendar = grantedScopes.has('https://www.googleapis.com/auth/calendar');
  const hasCalendarRead =
    hasFullCalendar ||
    grantedScopes.has('https://www.googleapis.com/auth/calendar.readonly');
  const hasEventWrite =
    hasFullCalendar ||
    grantedScopes.has('https://www.googleapis.com/auth/calendar.events');
  const hasSheetsWrite = grantedScopes.has(GOOGLE_SHEETS_SCOPE);

  if (!hasCalendarRead || !hasEventWrite || (requireSheetsWrite && !hasSheetsWrite)) {
    throw new GoogleOAuthError(
      requireSheetsWrite
        ? 'Approve Calendar and Google Sheets permissions to connect the Iris Google workspace integration.'
        : 'Approve both Calendar reading and event management permissions to connect Google Calendar.',
      'permissions_missing',
      400,
    );
  }

  return Array.from(grantedScopes);
}

export async function connectGoogleCalendar(input: {
  code: string;
  orgId: string;
  redirectUri: string;
  userId: string;
}) {
  const tokens = await exchangeAuthorizationCode(input.code, input.redirectUri);
  const profile = await fetchGoogleProfile(tokens.access_token!);
  const scopes = validateCalendarScopes(tokens.scope, profile.email.toLowerCase() === googleSheetsOwnerEmail());
  const existingConnection = await prisma.googleCalendarConnection.findUnique({
    where: { userId: input.userId },
  });

  let existingRefreshToken: string | null = null;
  if (
    existingConnection?.credentialCiphertext &&
    existingConnection.externalAccountId?.toLowerCase() === profile.email.toLowerCase()
  ) {
    try {
      existingRefreshToken =
        decryptIntegrationCredentials<GoogleCalendarCredentials & Record<string, unknown>>(
          existingConnection.credentialCiphertext,
        ).refreshToken || null;
    } catch (error) {
      console.error('Unable to read the previous Google Calendar refresh token:', error);
    }
  }

  const refreshToken = tokens.refresh_token || existingRefreshToken;
  if (!refreshToken) {
    throw new GoogleOAuthError(
      'Google did not issue offline access. Remove CrystalOS from your Google account permissions and connect again.',
      'refresh_token_missing',
      400,
    );
  }

  const credentials: GoogleCalendarCredentials = {
    accessToken: tokens.access_token!,
    refreshToken,
    expiresAt: tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null,
    scopes,
    tokenType: tokens.token_type || 'Bearer',
  };
  const syncLogs = JSON.stringify({
    connectedAt: new Date().toISOString(),
    email: profile.email,
    name: profile.name || profile.email.split('@')[0],
  });

  await prisma.googleCalendarConnection.upsert({
    where: { userId: input.userId },
    create: {
      orgId: input.orgId,
      userId: input.userId,
      status: 'SYNCING',
      lastSync: new Date(),
      syncLogs,
      credentialCiphertext: encryptIntegrationCredentials(credentials),
      externalAccountId: profile.email,
    },
    update: {
      orgId: input.orgId,
      status: 'SYNCING',
      lastSync: new Date(),
      syncLogs,
      credentialCiphertext: encryptIntegrationCredentials(credentials),
      externalAccountId: profile.email,
    },
  });

  return {
    email: profile.email,
    name: profile.name || profile.email.split('@')[0],
  };
}
