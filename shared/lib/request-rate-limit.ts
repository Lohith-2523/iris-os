export type RequestRateLimitCategory =
  | 'LIGHT_CRITICAL'
  | 'NORMAL'
  | 'EXPENSIVE_FILE'
  | 'ABUSE_SENSITIVE';

export type RequestRateLimitPolicy = {
  label: string;
  maxRequests: number;
  windowMs: number;
  burst: number;
};

export const REQUEST_RATE_LIMIT_POLICIES: Record<RequestRateLimitCategory, RequestRateLimitPolicy> = {
  LIGHT_CRITICAL: { label: 'Light but critical', maxRequests: 1_200, windowMs: 5 * 60_000, burst: 180 },
  NORMAL: { label: 'Normal user actions', maxRequests: 600, windowMs: 10 * 60_000, burst: 120 },
  EXPENSIVE_FILE: { label: 'Expensive file operations', maxRequests: 60, windowMs: 15 * 60_000, burst: 12 },
  ABUSE_SENSITIVE: { label: 'Abuse-sensitive operations', maxRequests: 120, windowMs: 10 * 60_000, burst: 20 },
};

const LIGHT_CRITICAL_PATHS = new Set([
  '/api/activity',
  '/api/atlas-ai/usage',
  '/api/data',
  '/api/notifications',
  '/api/organization',
  '/api/plan-usage',
  '/api/pricing',
  '/api/user',
  '/api/workspace',
  '/api/workspace/revision',
]);

const ABUSE_SENSITIVE_PATHS = new Set([
  '/api/account',
  '/api/admin/manage',
  '/api/atlas-ai',
  '/api/atlas-ai/realtime/session',
  '/api/atlas-ai/realtime/usage',
  '/api/canva/auth',
  '/api/canva/callback',
  '/api/canva/return',
  '/api/contact',
  '/api/create-order',
  '/api/cron/waitlist-daily',
  '/api/help/ask',
  '/api/invite',
  '/api/integrations/google/callback',
  '/api/integrations/google/start',
  '/api/messaging/identity',
  '/api/plan-coupons/redeem',
  '/api/verify-payment',
  '/api/waitlist',
]);

function isExpensiveFileRequest(pathname: string, method: string) {
  if (/\/(pdf|download|export|upload)(?:\/|$)/.test(pathname)) return true;
  if (pathname === '/api/atlas-ai/transcribe' || pathname === '/api/canva/designs/banner') return true;
  if (method === 'POST' && ['/api/generated-documents', '/api/reports', '/api/strategies'].includes(pathname)) return true;
  return false;
}

function isAbuseSensitiveRequest(pathname: string) {
  return ABUSE_SENSITIVE_PATHS.has(pathname)
    || pathname.startsWith('/api/auth/')
    || pathname.startsWith('/api/document-signing/')
    || pathname.startsWith('/api/meta-ads/')
    || pathname.startsWith('/api/webhooks/');
}

export function classifyRequestRateLimit(pathname: string, method: string): RequestRateLimitCategory {
  const normalizedMethod = method.toUpperCase();
  if (isExpensiveFileRequest(pathname, normalizedMethod)) return 'EXPENSIVE_FILE';
  if (isAbuseSensitiveRequest(pathname)) return 'ABUSE_SENSITIVE';
  if (LIGHT_CRITICAL_PATHS.has(pathname) && ['GET', 'HEAD'].includes(normalizedMethod)) return 'LIGHT_CRITICAL';
  if (['/api/activity', '/api/notifications'].includes(pathname) && normalizedMethod === 'POST') return 'LIGHT_CRITICAL';
  if (pathname === '/api/messaging/stream' && normalizedMethod === 'GET') return 'LIGHT_CRITICAL';
  return 'NORMAL';
}

type Bucket = { tokens: number; updatedAt: number; lastSeenAt: number };
type RateLimitStore = { buckets: Map<string, Bucket>; lastSweepAt: number };

const globalRateLimit = globalThis as typeof globalThis & { __irisRequestRateLimits?: RateLimitStore };
const store = globalRateLimit.__irisRequestRateLimits ??= { buckets: new Map(), lastSweepAt: 0 };
const MAX_BUCKETS = 20_000;

function compactHash(value: string) {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0).toString(36);
}

function authCookieValue(cookieHeader: string | null) {
  if (!cookieHeader) return '';
  return cookieHeader
    .split(';')
    .map(part => part.trim())
    .filter(part => part.slice(0, part.indexOf('=')).includes('auth-token'))
    .sort()
    .join(';')
    .slice(0, 2_048);
}

function requestIp(headers: Headers) {
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return (headers.get('cf-connecting-ip') || headers.get('x-real-ip') || forwarded || 'unknown')
    .replace(/[^a-fA-F0-9:._-]/g, '')
    .slice(0, 96) || 'unknown';
}

export function requestRateLimitPrincipal(headers: Headers, category: RequestRateLimitCategory) {
  const ip = requestIp(headers);
  if (category === 'ABUSE_SENSITIVE') return `ip:${compactHash(ip)}`;
  const authorization = headers.get('authorization')?.slice(0, 2_048) || '';
  const session = authorization || authCookieValue(headers.get('cookie'));
  return session ? `session:${compactHash(session)}` : `ip:${compactHash(ip)}`;
}

function sweep(now: number) {
  if (store.buckets.size < MAX_BUCKETS || now - store.lastSweepAt < 60_000) return;
  store.lastSweepAt = now;
  const staleBefore = now - 30 * 60_000;
  for (const [key, bucket] of store.buckets) {
    if (bucket.lastSeenAt < staleBefore) store.buckets.delete(key);
  }
  if (store.buckets.size <= MAX_BUCKETS) return;
  const overflow = store.buckets.size - MAX_BUCKETS;
  const oldest = [...store.buckets.entries()]
    .sort((left, right) => left[1].lastSeenAt - right[1].lastSeenAt)
    .slice(0, overflow);
  for (const [key] of oldest) store.buckets.delete(key);
}

export type RequestRateLimitDecision = {
  allowed: boolean;
  category: RequestRateLimitCategory;
  policy: RequestRateLimitPolicy;
  remaining: number;
  retryAfterSeconds: number;
};

export function checkRequestRateLimit(input: {
  pathname: string;
  method: string;
  headers: Headers;
  now?: number;
}): RequestRateLimitDecision {
  const now = input.now ?? Date.now();
  const category = classifyRequestRateLimit(input.pathname, input.method);
  const policy = REQUEST_RATE_LIMIT_POLICIES[category];
  const principal = requestRateLimitPrincipal(input.headers, category);
  const key = `${category}:${principal}`;
  const refillPerMs = policy.maxRequests / policy.windowMs;
  const previous = store.buckets.get(key);
  const elapsed = previous ? Math.max(0, now - previous.updatedAt) : 0;
  const available = previous
    ? Math.min(policy.burst, previous.tokens + elapsed * refillPerMs)
    : policy.burst;
  const allowed = available >= 1;
  const tokens = allowed ? available - 1 : available;
  store.buckets.set(key, { tokens, updatedAt: now, lastSeenAt: now });
  sweep(now);
  return {
    allowed,
    category,
    policy,
    remaining: Math.max(0, Math.floor(tokens)),
    retryAfterSeconds: allowed ? 0 : Math.max(1, Math.ceil((1 - tokens) / refillPerMs / 1_000)),
  };
}

export function requestRateLimitHeaders(decision: RequestRateLimitDecision) {
  return {
    'RateLimit-Limit': String(decision.policy.maxRequests),
    'RateLimit-Remaining': String(decision.remaining),
    'RateLimit-Policy': `${decision.policy.maxRequests};w=${Math.ceil(decision.policy.windowMs / 1_000)};burst=${decision.policy.burst}`,
    'X-RateLimit-Category': decision.category,
  };
}

export function resetRequestRateLimitsForTesting() {
  store.buckets.clear();
  store.lastSweepAt = 0;
}
