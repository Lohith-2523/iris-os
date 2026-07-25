import 'server-only';

import { createHmac } from 'crypto';

const DEFAULT_META_API_VERSION = 'v25.0';
const REQUIRED_META_SCOPES = ['ads_read', 'business_management'] as const;

type MetaGraphErrorResponse = {
  error?: {
    code?: number;
    error_subcode?: number;
    message?: string;
    type?: string;
  };
};

type MetaPagedResponse<T> = MetaGraphErrorResponse & {
  data?: T[];
  paging?: {
    cursors?: {
      after?: string;
    };
  };
};

type MetaTokenExchangeResponse = MetaGraphErrorResponse & {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
};

type MetaDebugTokenResponse = MetaGraphErrorResponse & {
  data?: {
    app_id?: string;
    expires_at?: number;
    is_valid?: boolean;
    scopes?: string[];
    user_id?: string;
  };
};

type MetaProfileResponse = MetaGraphErrorResponse & {
  id?: string;
  name?: string;
  email?: string;
};

type RawMetaAdAccount = {
  id?: string;
  account_id?: string;
  account_status?: number;
  business?: {
    id?: string;
    name?: string;
  };
  currency?: string;
  name?: string;
  timezone_name?: string;
  user_tasks?: string[];
};

type RawMetaBusiness = {
  id?: string;
  name?: string;
};

export type MetaBusiness = {
  id: string;
  name: string;
};

export type MetaAdAccount = {
  id: string;
  accountId: string;
  name: string;
  accountStatus: number | null;
  currency: string | null;
  timezoneName: string | null;
  businessId: string | null;
  businessName: string | null;
  userTasks: string[];
};

export type MetaCredentialPayload = {
  schemaVersion: 1;
  accessToken: string;
  tokenType: string;
  facebookUserId: string;
  facebookUserName: string;
  facebookUserEmail: string | null;
  expiresAt: string | null;
  grantedScopes: string[];
  businesses: MetaBusiness[];
  discoveredAdAccounts: MetaAdAccount[];
  selectedAdAccountIds: string[];
  selectedAdAccounts: MetaAdAccount[];
};

export class MetaIntegrationError extends Error {
  constructor(
    message: string,
    public readonly status = 502,
    public readonly code?: number,
  ) {
    super(message);
    this.name = 'MetaIntegrationError';
  }
}

function metaConfig() {
  const appId = process.env.META_APP_ID || process.env.NEXT_PUBLIC_META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const version =
    process.env.META_API_VERSION ||
    process.env.NEXT_PUBLIC_META_API_VERSION ||
    DEFAULT_META_API_VERSION;

  if (!appId || !appSecret) {
    throw new MetaIntegrationError(
      'Meta integration is not configured. Set META_APP_ID (or NEXT_PUBLIC_META_APP_ID) and META_APP_SECRET.',
      503,
    );
  }

  return { appId, appSecret, version };
}

function graphUrl(path: string) {
  const { version } = metaConfig();
  return new URL(`https://graph.facebook.com/${version}/${path.replace(/^\/+/, '')}`);
}

function appSecretProof(accessToken: string) {
  const { appSecret } = metaConfig();
  return createHmac('sha256', appSecret).update(accessToken).digest('hex');
}

function graphError(payload: MetaGraphErrorResponse, fallback: string) {
  const error = payload.error;
  return new MetaIntegrationError(
    error?.message || fallback,
    error?.code === 190 ? 401 : 502,
    error?.code,
  );
}

async function readGraphResponse<T extends MetaGraphErrorResponse>(
  response: Response,
  fallback: string,
) {
  let payload: T;
  try {
    payload = (await response.json()) as T;
  } catch {
    throw new MetaIntegrationError(fallback);
  }

  if (!response.ok || payload.error) throw graphError(payload, fallback);
  return payload;
}

async function graphGet<T extends MetaGraphErrorResponse>(
  path: string,
  accessToken: string,
  params: Record<string, string> = {},
) {
  const url = graphUrl(path);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  url.searchParams.set('appsecret_proof', appSecretProof(accessToken));

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  });

  return readGraphResponse<T>(response, 'Meta Graph API request failed.');
}

async function graphGetAll<T>(
  path: string,
  accessToken: string,
  fields: string,
  maxPages = 20,
) {
  const results: T[] = [];
  let after: string | undefined;

  for (let page = 0; page < maxPages; page += 1) {
    const payload = await graphGet<MetaPagedResponse<T>>(path, accessToken, {
      fields,
      limit: '100',
      ...(after ? { after } : {}),
    });
    results.push(...(payload.data || []));

    after = payload.paging?.cursors?.after;
    if (!after) break;
  }

  return results;
}

export async function exchangeMetaAccessToken(shortLivedAccessToken: string) {
  const { appId, appSecret } = metaConfig();
  const url = graphUrl('oauth/access_token');
  url.searchParams.set('grant_type', 'fb_exchange_token');
  url.searchParams.set('client_id', appId);
  url.searchParams.set('client_secret', appSecret);
  url.searchParams.set('fb_exchange_token', shortLivedAccessToken);

  const response = await fetch(url, {
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await readGraphResponse<MetaTokenExchangeResponse>(
    response,
    'Meta access-token exchange failed.',
  );

  if (!payload.access_token) {
    throw new MetaIntegrationError('Meta did not return a usable access token.');
  }

  return {
    accessToken: payload.access_token,
    tokenType: payload.token_type || 'bearer',
    expiresIn: payload.expires_in || null,
  };
}

export async function verifyMetaAccessToken(accessToken: string) {
  const { appId, appSecret } = metaConfig();
  const url = graphUrl('debug_token');
  url.searchParams.set('input_token', accessToken);
  url.searchParams.set('access_token', `${appId}|${appSecret}`);

  const response = await fetch(url, {
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await readGraphResponse<MetaDebugTokenResponse>(
    response,
    'Meta access-token verification failed.',
  );
  const data = payload.data;

  if (!data?.is_valid || data.app_id !== appId || !data.user_id) {
    throw new MetaIntegrationError('The Meta access token is invalid or belongs to another app.', 401);
  }

  const scopes = data.scopes || [];
  const missingScopes = REQUIRED_META_SCOPES.filter((scope) => !scopes.includes(scope));
  if (missingScopes.length > 0) {
    throw new MetaIntegrationError(
      `Meta authorization is missing required permissions: ${missingScopes.join(', ')}.`,
      400,
    );
  }

  return {
    userId: data.user_id,
    scopes,
    expiresAt: data.expires_at ? new Date(data.expires_at * 1000) : null,
  };
}

export function hasMetaAdministratorPermission(account: Pick<MetaAdAccount, 'userTasks'>) {
  return account.userTasks.some((task) => task.toUpperCase() === 'MANAGE');
}

export async function discoverMetaBusinessAssets(accessToken: string) {
  const [profile, rawBusinesses, rawAdAccounts] = await Promise.all([
    graphGet<MetaProfileResponse>('me', accessToken, { fields: 'id,name,email' }),
    graphGetAll<RawMetaBusiness>('me/businesses', accessToken, 'id,name'),
    graphGetAll<RawMetaAdAccount>(
      'me/adaccounts',
      accessToken,
      'id,account_id,name,account_status,currency,timezone_name,business,user_tasks',
    ),
  ]);

  if (!profile.id || !profile.name) {
    throw new MetaIntegrationError('Meta did not return the authorized user profile.');
  }

  const businesses = rawBusinesses
    .filter((business): business is RawMetaBusiness & { id: string; name: string } =>
      Boolean(business.id && business.name),
    )
    .map((business) => ({ id: business.id, name: business.name }));

  const adAccounts = rawAdAccounts
    .filter((account): account is RawMetaAdAccount & { id: string; account_id: string; name: string } =>
      Boolean(account.id && account.account_id && account.name),
    )
    .map<MetaAdAccount>((account) => ({
      id: account.id,
      accountId: account.account_id,
      name: account.name,
      accountStatus:
        typeof account.account_status === 'number' ? account.account_status : null,
      currency: account.currency || null,
      timezoneName: account.timezone_name || null,
      businessId: account.business?.id || null,
      businessName: account.business?.name || null,
      userTasks: account.user_tasks || [],
    }))
    .filter(hasMetaAdministratorPermission);

  return {
    profile: {
      id: profile.id,
      name: profile.name,
      email: profile.email || null,
    },
    businesses,
    adAccounts,
  };
}

export function publicMetaConnection(credentials: MetaCredentialPayload) {
  return {
    facebookUserName: credentials.facebookUserName,
    facebookUserEmail: credentials.facebookUserEmail,
    tokenExpiresAt: credentials.expiresAt,
    grantedScopes: credentials.grantedScopes,
    businesses: credentials.businesses,
    adAccounts: credentials.discoveredAdAccounts,
    selectedAdAccountIds: credentials.selectedAdAccountIds,
    selectedAdAccounts: credentials.selectedAdAccounts,
  };
}
