import 'server-only';

import { createHmac } from 'crypto';

const DEFAULT_META_API_VERSION = 'v25.0';
const REQUIRED_META_SCOPES = [
  'ads_read',
  'business_management',
  'leads_retrieval',
  'pages_show_list',
  'pages_manage_metadata',
] as const;

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

type RawMetaPage = {
  id?: string;
  name?: string;
  access_token?: string;
  tasks?: string[];
};

type MetaMutationResponse = MetaGraphErrorResponse & {
  success?: boolean;
};

type RawMetaLead = MetaGraphErrorResponse & {
  id?: string;
  created_time?: string;
  ad_id?: string;
  form_id?: string;
  campaign_id?: string;
  field_data?: Array<{
    name?: string;
    values?: unknown[];
  }>;
};

type RawMetaAdAttribution = MetaGraphErrorResponse & {
  id?: string;
  name?: string;
  account_id?: string;
  campaign_id?: string;
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

export type MetaPage = {
  id: string;
  name: string;
  accessToken: string;
  tasks: string[];
};

export type MetaCredentialPayload = {
  schemaVersion: 1 | 2;
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
  pages?: MetaPage[];
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

async function graphPost<T extends MetaGraphErrorResponse>(
  path: string,
  accessToken: string,
  params: Record<string, string> = {},
) {
  const url = graphUrl(path);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  url.searchParams.set('appsecret_proof', appSecretProof(accessToken));

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  });

  return readGraphResponse<T>(response, 'Meta Graph API mutation failed.');
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
  const [profile, rawBusinesses, rawAdAccounts, rawPages] = await Promise.all([
    graphGet<MetaProfileResponse>('me', accessToken, { fields: 'id,name,email' }),
    graphGetAll<RawMetaBusiness>('me/businesses', accessToken, 'id,name'),
    graphGetAll<RawMetaAdAccount>(
      'me/adaccounts',
      accessToken,
      'id,account_id,name,account_status,currency,timezone_name,business,user_tasks',
    ),
    graphGetAll<RawMetaPage>(
      'me/accounts',
      accessToken,
      'id,name,access_token,tasks',
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

  const pages = rawPages
    .filter((page): page is RawMetaPage & { id: string; name: string; access_token: string } =>
      Boolean(page.id && page.name && page.access_token),
    )
    .map<MetaPage>((page) => ({
      id: page.id,
      name: page.name,
      accessToken: page.access_token,
      tasks: page.tasks || [],
    }));

  return {
    profile: {
      id: profile.id,
      name: profile.name,
      email: profile.email || null,
    },
    businesses,
    adAccounts,
    pages,
  };
}

export async function subscribeMetaPagesToLeadgen(pages: MetaPage[]) {
  const results = await Promise.allSettled(
    pages.map(async (page) => {
      const response = await graphPost<MetaMutationResponse>(
        `${page.id}/subscribed_apps`,
        page.accessToken,
        { subscribed_fields: 'leadgen' },
      );
      if (!response.success) {
        throw new MetaIntegrationError(`Meta did not subscribe ${page.name} to lead notifications.`);
      }
      return page.id;
    }),
  );

  const failures = results.flatMap((result, index) =>
    result.status === 'rejected' ? [pages[index]?.name || 'Unknown Page'] : [],
  );
  if (failures.length > 0) {
    throw new MetaIntegrationError(
      `Unable to subscribe these Facebook Pages to lead notifications: ${failures.join(', ')}.`,
    );
  }
}

export async function retrieveMetaLead(leadId: string, pageAccessToken: string) {
  const lead = await graphGet<RawMetaLead>(leadId, pageAccessToken, {
    fields: 'id,created_time,ad_id,form_id,campaign_id,field_data',
  });
  if (!lead.id) {
    throw new MetaIntegrationError('Meta did not return the requested lead.');
  }
  return {
    id: lead.id,
    createdTime: lead.created_time || null,
    adId: lead.ad_id || null,
    formId: lead.form_id || null,
    campaignId: lead.campaign_id || null,
    fieldData: lead.field_data || [],
  };
}

export async function retrieveMetaAdAttribution(adId: string, accessToken: string) {
  const ad = await graphGet<RawMetaAdAttribution>(adId, accessToken, {
    fields: 'id,name,account_id,campaign_id',
  });
  if (!ad.id || !ad.account_id) {
    throw new MetaIntegrationError('Meta did not return an ad account for the lead.');
  }
  return {
    id: ad.id,
    name: ad.name || null,
    accountId: ad.account_id,
    campaignId: ad.campaign_id || null,
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
    pages: (credentials.pages || []).map(({ id, name, tasks }) => ({ id, name, tasks })),
    leadSyncReady:
      credentials.selectedAdAccountIds.length > 0 &&
      (credentials.pages || []).length > 0 &&
      REQUIRED_META_SCOPES.every((scope) => credentials.grantedScopes.includes(scope)),
  };
}
