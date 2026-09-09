import 'server-only';

import { createHash, createPublicKey, randomBytes, timingSafeEqual, verify } from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { decryptIntegrationCredentials, encryptIntegrationCredentials } from '@/lib/integration-secrets';

const CANVA_AUTHORIZATION_ENDPOINT = 'https://www.canva.com/api/oauth/authorize';
const CANVA_TOKEN_ENDPOINT = 'https://api.canva.com/rest/v1/oauth/token';
const CANVA_DESIGNS_ENDPOINT = 'https://api.canva.com/rest/v1/designs';
const CANVA_EXPORTS_ENDPOINT = 'https://api.canva.com/rest/v1/exports';
const CANVA_KEYS_ENDPOINT = 'https://api.canva.com/rest/v1/connect/keys';
const MAX_BANNER_BYTES = 2 * 1024 * 1024;

export const CANVA_OAUTH_COOKIE = 'crystal_canva_oauth';
export const CANVA_BANNER_WIDTH = 2912;
export const CANVA_BANNER_HEIGHT = 360;

type CanvaOAuthState = {
  expiresAt: number;
  nonce: string;
  orgId: string;
  returnOrigin: string;
  returnTo: string;
  userId: string;
};

type CanvaOAuthAttempt = CanvaOAuthState & {
  verifier: string;
};

type CanvaReturnState = {
  canvaTeamId: string;
  canvaUserId: string;
  correlationState: string;
  designId: string;
  expiresAt: number;
  orgId: string;
  returnOrigin: string;
  userId: string;
};

type CanvaTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
  code?: string;
  message?: string;
};

export type CanvaCredentials = {
  accessToken: string;
  expiresAt: string;
  refreshToken: string;
  scopes: string[];
  tokenType: string;
};

export class CanvaIntegrationError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status = 502,
  ) {
    super(message);
    this.name = 'CanvaIntegrationError';
  }
}

function canvaConfig() {
  const clientId = process.env.CANVA_CLIENT_ID;
  const clientSecret = process.env.CANVA_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new CanvaIntegrationError('Canva OAuth credentials are not configured.', 'configuration_error', 503);
  }
  return { clientId, clientSecret };
}

export function canvaRedirectUri(requestUrl: string) {
  return process.env.CANVA_REDIRECT_URI || new URL('/api/canva/callback', requestUrl).toString();
}

export async function createCanvaAuthorization(input: {
  orgId: string;
  redirectUri: string;
  returnOrigin: string;
  returnTo: string;
  userId: string;
}) {
  const { clientId } = canvaConfig();
  const nonce = randomBytes(32).toString('base64url');
  const verifier = randomBytes(64).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  const state: CanvaOAuthState = {
    expiresAt: Date.now() + 15 * 60 * 1000,
    nonce,
    orgId: input.orgId,
    returnOrigin: input.returnOrigin,
    returnTo: input.returnTo,
    userId: input.userId,
  };
  const authorizationUrl = new URL(CANVA_AUTHORIZATION_ENDPOINT);
  authorizationUrl.searchParams.set('client_id', clientId);
  authorizationUrl.searchParams.set('code_challenge', challenge);
  authorizationUrl.searchParams.set('code_challenge_method', 's256');
  authorizationUrl.searchParams.set('redirect_uri', input.redirectUri);
  authorizationUrl.searchParams.set('response_type', 'code');
  authorizationUrl.searchParams.set('scope', 'design:content:read design:content:write');
  const cookieValue = encryptIntegrationCredentials(state);
  authorizationUrl.searchParams.set('state', cookieValue);

  const attempt: CanvaOAuthAttempt = { ...state, verifier };
  await prisma.integrationConnection.upsert({
    where: { orgId_provider: { orgId: input.orgId, provider: 'CANVA' } },
    create: {
      orgId: input.orgId,
      provider: 'CANVA',
      status: 'SYNCING',
      syncLogs: encryptIntegrationCredentials(attempt),
    },
    update: {
      status: 'SYNCING',
      syncLogs: encryptIntegrationCredentials(attempt),
    },
  });

  return { authorizationUrl, cookieValue };
}

export function readCanvaOAuthState(returnedState: string, cookieValue?: string) {
  if (cookieValue) {
    const expectedCookie = Buffer.from(cookieValue, 'utf8');
    const returned = Buffer.from(returnedState, 'utf8');
    if (expectedCookie.length !== returned.length || !timingSafeEqual(expectedCookie, returned)) {
      throw new CanvaIntegrationError('Canva authorization state does not match.', 'state_mismatch', 400);
    }
  }
  const state = decryptIntegrationCredentials<CanvaOAuthState & Record<string, unknown>>(returnedState);
  if (state.expiresAt <= Date.now()) {
    throw new CanvaIntegrationError('Canva authorization state is invalid or expired.', 'invalid_state', 400);
  }
  return state;
}

export async function readCanvaOAuthAttempt(state: CanvaOAuthState) {
  const connection = await prisma.integrationConnection.findUnique({
    where: { orgId_provider: { orgId: state.orgId, provider: 'CANVA' } },
  });
  if (!connection?.syncLogs) {
    throw new CanvaIntegrationError('Canva authorization session was not found.', 'invalid_state', 400);
  }
  const attempt = decryptIntegrationCredentials<CanvaOAuthAttempt & Record<string, unknown>>(connection.syncLogs);
  const expected = Buffer.from(attempt.nonce, 'utf8');
  const received = Buffer.from(state.nonce, 'utf8');
  if (
    attempt.expiresAt <= Date.now() ||
    attempt.userId !== state.userId ||
    expected.length !== received.length ||
    !timingSafeEqual(expected, received)
  ) {
    throw new CanvaIntegrationError('Canva authorization session is invalid or expired.', 'invalid_state', 400);
  }
  return attempt;
}

async function requestCanvaToken(body: URLSearchParams) {
  const { clientId, clientSecret } = canvaConfig();
  const response = await fetch(CANVA_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await response.json() as CanvaTokenResponse;
  if (!response.ok || !payload.access_token || !payload.refresh_token) {
    throw new CanvaIntegrationError(
      payload.message || 'Canva could not complete authorization.',
      payload.code || 'token_exchange_failed',
      response.status || 502,
    );
  }
  return payload as Required<Pick<CanvaTokenResponse, 'access_token' | 'refresh_token'>> & CanvaTokenResponse;
}

function credentialsFromTokens(tokens: Required<Pick<CanvaTokenResponse, 'access_token' | 'refresh_token'>> & CanvaTokenResponse): CanvaCredentials {
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: new Date(Date.now() + (tokens.expires_in || 14_400) * 1000).toISOString(),
    scopes: (tokens.scope || 'design:content:read design:content:write').split(/\s+/).filter(Boolean),
    tokenType: tokens.token_type || 'Bearer',
  };
}

export async function connectCanva(input: {
  code: string;
  orgId: string;
  redirectUri: string;
  verifier: string;
}) {
  const tokens = await requestCanvaToken(new URLSearchParams({
    code: input.code,
    code_verifier: input.verifier,
    grant_type: 'authorization_code',
    redirect_uri: input.redirectUri,
  }));
  const credentials = credentialsFromTokens(tokens);
  await prisma.integrationConnection.upsert({
    where: { orgId_provider: { orgId: input.orgId, provider: 'CANVA' } },
    create: {
      orgId: input.orgId,
      provider: 'CANVA',
      status: 'CONNECTED',
      lastSync: new Date(),
      syncLogs: 'Canva connected for dashboard banner creation.',
      credentialCiphertext: encryptIntegrationCredentials(credentials),
    },
    update: {
      status: 'CONNECTED',
      lastSync: new Date(),
      syncLogs: 'Canva connected for dashboard banner creation.',
      credentialCiphertext: encryptIntegrationCredentials(credentials),
    },
  });
}

async function validAccessToken(orgId: string) {
  const connection = await prisma.integrationConnection.findUnique({
    where: { orgId_provider: { orgId, provider: 'CANVA' } },
  });
  if (!connection?.credentialCiphertext) return null;

  const credentials = decryptIntegrationCredentials<CanvaCredentials & Record<string, unknown>>(
    connection.credentialCiphertext,
  );
  if (
    !credentials.scopes.includes('design:content:read') ||
    !credentials.scopes.includes('design:content:write')
  ) return null;
  if (new Date(credentials.expiresAt).getTime() > Date.now() + 60_000) return credentials.accessToken;

  const tokens = await requestCanvaToken(new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: credentials.refreshToken,
  }));
  const refreshedCredentials = credentialsFromTokens(tokens);
  await prisma.integrationConnection.update({
    where: { id: connection.id },
    data: {
      status: 'CONNECTED',
      lastSync: new Date(),
      credentialCiphertext: encryptIntegrationCredentials(refreshedCredentials),
    },
  });
  return refreshedCredentials.accessToken;
}

export async function createCanvaBannerDesign(input: {
  orgId: string;
  returnOrigin: string;
  userId: string;
}) {
  const accessToken = await validAccessToken(input.orgId);
  if (!accessToken) return null;

  const response = await fetch(CANVA_DESIGNS_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'type_and_asset',
      design_type: {
        type: 'custom',
        width: CANVA_BANNER_WIDTH,
        height: CANVA_BANNER_HEIGHT,
      },
      title: 'Iris dashboard banner',
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await response.json() as {
    code?: string;
    design?: {
      id?: string;
      owner?: { team_id?: string; user_id?: string };
      urls?: { edit_url?: string };
    };
    message?: string;
  };
  const editUrl = payload.design?.urls?.edit_url;
  const designId = payload.design?.id;
  const canvaTeamId = payload.design?.owner?.team_id;
  const canvaUserId = payload.design?.owner?.user_id;
  if (!response.ok || !editUrl || !designId || !canvaTeamId || !canvaUserId) {
    throw new CanvaIntegrationError(
      payload.message || 'Canva could not create the banner design.',
      payload.code || 'design_creation_failed',
      response.status || 502,
    );
  }
  const correlationState = `${input.orgId}.${randomBytes(9).toString('base64url')}`;
  const returnState: CanvaReturnState = {
    canvaTeamId,
    canvaUserId,
    correlationState,
    designId,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    orgId: input.orgId,
    returnOrigin: input.returnOrigin,
    userId: input.userId,
  };
  await prisma.integrationConnection.update({
    where: { orgId_provider: { orgId: input.orgId, provider: 'CANVA' } },
    data: {
      status: 'CONNECTED',
      syncLogs: encryptIntegrationCredentials(returnState),
    },
  });
  const editorUrl = new URL(editUrl);
  editorUrl.searchParams.set('correlation_state', correlationState);
  return editorUrl.toString();
}

type CanvaReturnClaims = {
  aud?: string | string[];
  correlation_state?: string;
  design_id?: string;
  exp?: number;
  sub?: string;
  team_id?: string;
  type?: string;
};

function parseJwtPart<T>(value: string): T {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as T;
}

async function verifyCanvaReturnJwt(token: string) {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new CanvaIntegrationError('Canva returned an invalid token.', 'invalid_return_token', 400);
  }
  const header = parseJwtPart<{ alg?: string; kid?: string }>(parts[0]);
  const claims = parseJwtPart<CanvaReturnClaims>(parts[1]);
  if (header.alg !== 'EdDSA' || !header.kid) {
    throw new CanvaIntegrationError('Canva returned an unsupported token.', 'invalid_return_token', 400);
  }

  const keysResponse = await fetch(CANVA_KEYS_ENDPOINT, {
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  });
  const keysPayload = await keysResponse.json() as {
    keys?: Array<{ crv: string; kid: string; kty: string; x: string }>;
  };
  const jwk = keysPayload.keys?.find((key) => key.kid === header.kid);
  if (!keysResponse.ok || !jwk) {
    throw new CanvaIntegrationError('Canva return verification is unavailable.', 'return_verification_failed');
  }
  const isValid = verify(
    null,
    Buffer.from(`${parts[0]}.${parts[1]}`),
    createPublicKey({ key: jwk, format: 'jwk' }),
    Buffer.from(parts[2], 'base64url'),
  );
  const { clientId } = canvaConfig();
  const audienceMatches = Array.isArray(claims.aud)
    ? claims.aud.includes(clientId)
    : claims.aud === clientId;
  if (!isValid || !audienceMatches || claims.type !== 'rti' || !claims.exp || claims.exp * 1000 <= Date.now()) {
    throw new CanvaIntegrationError('Canva return verification failed.', 'invalid_return_token', 400);
  }
  return claims;
}

async function waitForExport(accessToken: string, exportId: string) {
  for (let attempt = 0; attempt < 15; attempt += 1) {
    const response = await fetch(`${CANVA_EXPORTS_ENDPOINT}/${encodeURIComponent(exportId)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    });
    const payload = await response.json() as {
      code?: string;
      job?: { error?: { message?: string }; status?: string; urls?: string[] };
      message?: string;
    };
    if (!response.ok) {
      throw new CanvaIntegrationError(payload.message || 'Canva export status failed.', payload.code || 'export_failed');
    }
    if (payload.job?.status === 'success' && payload.job.urls?.[0]) return payload.job.urls[0];
    if (payload.job?.status === 'failed') {
      throw new CanvaIntegrationError(payload.job.error?.message || 'Canva could not export the banner.', 'export_failed');
    }
    await new Promise((resolve) => setTimeout(resolve, 750));
  }
  throw new CanvaIntegrationError('Canva took too long to export the banner.', 'export_timeout', 504);
}

async function exportBannerImage(accessToken: string, designId: string, quality: number) {
  const response = await fetch(CANVA_EXPORTS_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      design_id: designId,
      format: {
        type: 'jpg',
        quality,
        export_quality: 'regular',
        width: CANVA_BANNER_WIDTH,
        height: CANVA_BANNER_HEIGHT,
        pages: [1],
      },
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await response.json() as { code?: string; job?: { id?: string }; message?: string };
  if (!response.ok || !payload.job?.id) {
    throw new CanvaIntegrationError(payload.message || 'Canva could not start the banner export.', payload.code || 'export_failed');
  }
  const downloadUrl = await waitForExport(accessToken, payload.job.id);
  const imageResponse = await fetch(downloadUrl, {
    cache: 'no-store',
    signal: AbortSignal.timeout(20_000),
  });
  const declaredSize = Number(imageResponse.headers.get('content-length'));
  if (!imageResponse.ok || (Number.isFinite(declaredSize) && declaredSize > MAX_BANNER_BYTES)) return null;
  const bytes = Buffer.from(await imageResponse.arrayBuffer());
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8
    && bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9;
  return bytes.length <= MAX_BANNER_BYTES && isJpeg ? bytes : null;
}

function jsonRecord(value: Prisma.JsonValue | null): Record<string, Prisma.InputJsonValue> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, Prisma.InputJsonValue>;
}

export async function exportCanvaBannerToWorkspace(correlationJwt: string) {
  const claims = await verifyCanvaReturnJwt(correlationJwt);
  const correlationState = claims.correlation_state;
  const designId = claims.design_id;
  if (!correlationState || !designId) {
    throw new CanvaIntegrationError('Canva did not identify the returned design.', 'invalid_return_token', 400);
  }
  const orgId = correlationState.split('.')[0];
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orgId)) {
    throw new CanvaIntegrationError('Canva returned an invalid workspace reference.', 'invalid_return_token', 400);
  }
  const connection = await prisma.integrationConnection.findUnique({
    where: { orgId_provider: { orgId, provider: 'CANVA' } },
  });
  if (!connection?.syncLogs) {
    throw new CanvaIntegrationError('The Canva banner session was not found.', 'return_session_missing', 404);
  }
  const state = decryptIntegrationCredentials<CanvaReturnState & Record<string, unknown>>(connection.syncLogs);
  if (
    state.expiresAt <= Date.now() ||
    state.correlationState !== correlationState ||
    state.designId !== designId ||
    state.canvaUserId !== claims.sub ||
    state.canvaTeamId !== claims.team_id
  ) {
    throw new CanvaIntegrationError('The Canva banner session does not match.', 'invalid_return_token', 400);
  }

  const accessToken = await validAccessToken(orgId);
  if (!accessToken) {
    throw new CanvaIntegrationError('Reconnect Canva to export the banner.', 'reauthorization_required', 401);
  }
  let imageBytes: Buffer | null = null;
  for (const quality of [92, 82, 70]) {
    imageBytes = await exportBannerImage(accessToken, designId, quality);
    if (imageBytes) break;
  }
  if (!imageBytes) {
    throw new CanvaIntegrationError('The exported banner exceeds the 2 MB workspace limit.', 'export_too_large', 413);
  }

  const organization = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { preferences: true },
  });
  if (!organization) {
    throw new CanvaIntegrationError('The destination workspace was not found.', 'workspace_missing', 404);
  }
  const preferences = jsonRecord(organization.preferences);
  await prisma.$transaction([
    prisma.organization.update({
      where: { id: orgId },
      data: {
        preferences: {
          ...preferences,
          welcomeCardBackgroundDataUrl: `data:image/jpeg;base64,${imageBytes.toString('base64')}`,
          welcomeCardBackgroundPosition: { x: 50, y: 50 },
          welcomeCardBackgroundZoom: 1,
        },
      },
    }),
    prisma.integrationConnection.update({
      where: { id: connection.id },
      data: {
        lastSync: new Date(),
        status: 'CONNECTED',
        syncLogs: `Exported Canva design ${designId} to the dashboard banner.`,
      },
    }),
  ]);
  return state.returnOrigin;
}
