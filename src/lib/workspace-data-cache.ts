'use client';

import {
  type WorkspaceCacheTag,
  type WorkspacePatchKind,
  workspaceMutationPlan,
  workspaceReadTags,
} from '@/lib/workspace-cache-policy';

type WorkspaceCacheScope = {
  userId: string;
  orgId: string;
};

type CachedResponse = {
  body: string;
  headers: [string, string][];
  status: number;
  statusText: string;
  cachedAt: number;
  stale?: boolean;
};

type JsonRecord = Record<string, unknown>;

const STORAGE_PREFIX = 'crystal.workspace.data:v2';
export const WORKSPACE_BACKGROUND_CHECK_INTERVAL_MS = 30 * 60 * 1_000;
const REVISION_BASELINE_DEBOUNCE_MS = 1_000;

const memoryCache = new Map<string, CachedResponse>();
const inFlightReads = new Map<string, Promise<CachedResponse>>();
const knownUrls = new Set<string>();
const urlGenerations = new Map<string, number>();
const loadingListeners = new Set<() => void>();

let activeScope = '';
let activeNetworkReads = 0;
let cacheGeneration = 0;
let navigationPrepared = false;
let activePathname = '';
let serverRevision: string | null = null;
let deferredServerRefresh = false;
let revisionBaselineTimer: ReturnType<typeof setTimeout> | null = null;
let backgroundCheckTimer: ReturnType<typeof setInterval> | null = null;

function notifyLoadingChange() {
  for (const listener of loadingListeners) listener();
}

function setNetworkReadDelta(delta: number) {
  activeNetworkReads = Math.max(0, activeNetworkReads + delta);
  notifyLoadingChange();
}

function notifyCacheUpdate(urls: string[], tags: WorkspaceCacheTag[], reason: 'patch' | 'revalidate' | 'invalidate') {
  if (typeof window === 'undefined' || urls.length === 0) return;
  window.dispatchEvent(new CustomEvent('workspace-cache-updated', {
    detail: { urls, tags, reason },
  }));
}

function scopePrefix(scope = activeScope) {
  return `${STORAGE_PREFIX}:${scope}:`;
}

function removeStoredEntries(prefix: string) {
  if (typeof window === 'undefined') return;
  try {
    for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
      const key = window.sessionStorage.key(index);
      if (key?.startsWith(prefix)) window.sessionStorage.removeItem(key);
    }
  } catch {
    // Session storage is an optional acceleration layer.
  }
}

function cacheKey(url: string) {
  return `${scopePrefix()}${encodeURIComponent(url)}`;
}

function restoreResponse(cached: CachedResponse, cacheStatus: 'HIT' | 'MISS' | 'PATCHED') {
  const headers = new Headers(cached.headers);
  headers.delete('content-length');
  headers.set('X-Workspace-Cache', cacheStatus);
  return new Response(cached.body, {
    headers,
    status: cached.status,
    statusText: cached.statusText,
  });
}

function readCachedResponse(key: string) {
  const memoryValue = memoryCache.get(key);
  if (memoryValue) return memoryValue;
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedResponse;
    memoryCache.set(key, parsed);
    return parsed;
  } catch {
    return null;
  }
}

function writeCachedResponse(key: string, value: CachedResponse) {
  memoryCache.set(key, value);
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Large workspaces or private browsing can reject storage writes. The
    // in-memory cache remains authoritative for this document session.
  }
}

function normalizedRequestUrl(input: RequestInfo | URL) {
  const raw = input instanceof Request ? input.url : input.toString();
  if (typeof window === 'undefined') return raw;
  const url = new URL(raw, window.location.origin);
  return `${url.pathname}${url.search}`;
}

function requestMethod(input: RequestInfo | URL, init?: RequestInit) {
  return (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
}

function isWorkspaceApi(url: string) {
  return url.startsWith('/api/');
}

function isLiveIdentityRequest(url: string) {
  return url === '/api/user' || url.startsWith('/api/auth/');
}

function requestHeader(init: RequestInit | undefined, name: string) {
  return new Headers(init?.headers).get(name);
}

function parseRequestBody(init?: RequestInit): unknown {
  if (typeof init?.body !== 'string') return null;
  try {
    return JSON.parse(init.body);
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function entityId(value: unknown) {
  return isRecord(value) && typeof value.id === 'string' ? value.id : null;
}

function mutationId(url: string, body: unknown, kind: WorkspacePatchKind) {
  const searchParams = new URL(url, 'http://workspace.local').searchParams;
  const queryId = searchParams.get('id')
    || (kind === 'clients' ? searchParams.get('clientId') : null);
  if (queryId) return queryId;
  if (!isRecord(body)) return null;
  if (typeof body.id === 'string') return body.id;
  if (kind === 'clients' && typeof body.clientId === 'string') return body.clientId;
  if (kind === 'tasks' && typeof body.taskId === 'string') return body.taskId;
  if (kind === 'projects' && typeof body.projectId === 'string') return body.projectId;
  return null;
}

function cacheUrlsForTag(tag: WorkspaceCacheTag) {
  return Array.from(knownUrls).filter((url) => workspaceReadTags(url).includes(tag));
}

function bumpUrlGeneration(url: string) {
  urlGenerations.set(url, (urlGenerations.get(url) || 0) + 1);
}

function tagsIntersect(left: WorkspaceCacheTag[], right: Set<WorkspaceCacheTag>) {
  return left.some((tag) => right.has(tag));
}

function entityMatchesList(kind: WorkspacePatchKind, url: string, entity: JsonRecord) {
  const parsed = new URL(url, 'http://workspace.local');
  if (kind === 'tasks') {
    const clientId = parsed.searchParams.get('clientId');
    const projectId = parsed.searchParams.get('projectId');
    const assignedToId = parsed.searchParams.get('assignedToId');
    return (!clientId || entity.clientId === clientId)
      && (!projectId || entity.projectId === projectId)
      && (!assignedToId || entity.assignedToId === assignedToId);
  }
  if (kind === 'projects') {
    const clientId = parsed.searchParams.get('clientId');
    return !clientId || entity.clientId === clientId;
  }
  if (kind === 'invoices') {
    const clientId = parsed.searchParams.get('clientId');
    const projectId = parsed.searchParams.get('projectId');
    const outstanding = parsed.searchParams.get('outstanding') === 'true';
    return (!clientId || entity.clientId === clientId)
      && (!projectId || entity.projectId === projectId)
      && (!outstanding || entity.status === 'UNPAID' || entity.status === 'PARTIALLY_PAID');
  }
  return true;
}

function sortEntities(kind: WorkspacePatchKind, items: unknown[]) {
  const sortable = [...items];
  const time = (value: unknown, field: string) => {
    if (!isRecord(value) || typeof value[field] !== 'string') return 0;
    const parsed = new Date(value[field] as string).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  };
  if (kind === 'calendar') sortable.sort((a, b) => time(a, 'startTime') - time(b, 'startTime'));
  if (kind === 'transactions') sortable.sort((a, b) => time(b, 'date') - time(a, 'date'));
  if (kind === 'tasks' || kind === 'projects' || kind === 'reports' || kind === 'invoices' || kind === 'strategies') {
    sortable.sort((a, b) => time(b, 'createdAt') - time(a, 'createdAt'));
  }
  return sortable;
}

function upsertEntities(
  current: unknown[],
  entities: JsonRecord[],
  kind: WorkspacePatchKind,
  url: string,
) {
  const byId = new Map(
    current.flatMap((item) => {
      const id = entityId(item);
      return id ? [[id, item] as const] : [];
    }),
  );
  for (const entity of entities) {
    const id = entityId(entity);
    if (!id) continue;
    if (entityMatchesList(kind, url, entity)) {
      const existing = byId.get(id);
      byId.set(id, isRecord(existing) ? { ...existing, ...entity } : entity);
    }
    else byId.delete(id);
  }
  return sortEntities(kind, Array.from(byId.values()));
}

function normalizeReport(entity: JsonRecord) {
  const createdAt = typeof entity.createdAt === 'string' ? new Date(entity.createdAt) : null;
  return {
    ...entity,
    content: entity.summary,
    date: createdAt && !Number.isNaN(createdAt.getTime())
      ? createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : '',
  };
}

function responseEntities(kind: WorkspacePatchKind, payload: unknown) {
  if (!isRecord(payload)) return [];
  if (kind === 'clients' && isRecord(payload.client)) return [payload.client];
  if (kind === 'tasks' && isRecord(payload.task)) return [payload.task];
  if (kind === 'projects' && isRecord(payload.project)) return [payload.project];
  if (kind === 'invoices' && isRecord(payload.invoice)) return [payload.invoice];
  if (kind === 'leads') {
    if (Array.isArray(payload.leads)) return payload.leads.filter(isRecord);
    if (isRecord(payload.lead)) return [payload.lead];
  }
  if (kind === 'calendar' && isRecord(payload.event)) return [payload.event];
  if (kind === 'reports' && entityId(payload)) return [normalizeReport(payload)];
  if (kind === 'strategies' && isRecord(payload.strategy)) return [payload.strategy];
  if (kind === 'transactions' && Array.isArray(payload.transactions)) {
    return payload.transactions.filter(isRecord);
  }
  if (['transactions', 'subscriptions', 'retainers', 'invoices'].includes(kind) && entityId(payload)) return [payload];
  return [];
}

function patchJsonCollection(
  kind: WorkspacePatchKind,
  cachedUrl: string,
  mutationUrl: string,
  currentPayload: unknown,
  mutationPayload: unknown,
  body: unknown,
  method: string,
) {
  const deleting = method === 'DELETE'
    || (isRecord(body) && (
      body.action === 'delete'
      || body.action === 'delete_task'
    ));
  const idToDelete = deleting ? mutationId(mutationUrl, body, kind) : null;

  if (kind === 'calendar' && isRecord(body) && body.action === 'sync' && isRecord(mutationPayload) && Array.isArray(mutationPayload.events)) {
    return { value: { ...(isRecord(currentPayload) ? currentPayload : {}), events: mutationPayload.events }, changed: true };
  }
  if (kind === 'calendar' && isRecord(body) && body.action === 'disconnect' && isRecord(currentPayload) && Array.isArray(currentPayload.events)) {
    const disconnectedCreatorId = isRecord(mutationPayload) && typeof mutationPayload.disconnectedCreatorId === 'string'
      ? mutationPayload.disconnectedCreatorId
      : null;
    return {
      value: {
        ...currentPayload,
        events: currentPayload.events.filter((item) =>
          !isRecord(item) ||
          !item.isGoogleEvent ||
          (disconnectedCreatorId !== null && item.creatorId !== disconnectedCreatorId)
        ),
      },
      changed: true,
    };
  }

  const entities = responseEntities(kind, mutationPayload);
  const collectionKey = kind === 'leads' ? 'leads' : kind === 'calendar' ? 'events' : null;
  const currentList = collectionKey
    ? (isRecord(currentPayload) && Array.isArray(currentPayload[collectionKey]) ? currentPayload[collectionKey] as unknown[] : null)
    : (Array.isArray(currentPayload) ? currentPayload : null);
  if (!currentList) return { value: currentPayload, changed: false };

  let nextList = currentList;
  if (idToDelete) {
    nextList = currentList.filter((item) => entityId(item) !== idToDelete);
  } else if (entities.length > 0) {
    nextList = upsertEntities(currentList, entities, kind, cachedUrl);
  } else {
    return { value: currentPayload, changed: false };
  }

  return {
    value: collectionKey && isRecord(currentPayload)
      ? { ...currentPayload, [collectionKey]: nextList }
      : nextList,
    changed: true,
  };
}

function applyMutationPatch(
  kind: WorkspacePatchKind,
  mutationUrl: string,
  method: string,
  body: unknown,
  payload: unknown,
) {
  const patchedUrls: string[] = [];
  for (const url of cacheUrlsForTag(kind === 'leads' ? 'leads' : kind)) {
    const key = cacheKey(url);
    const cached = readCachedResponse(key);
    if (!cached || cached.status < 200 || cached.status >= 300) continue;
    try {
      const currentPayload = JSON.parse(cached.body) as unknown;
      const patch = patchJsonCollection(
        kind,
        url,
        mutationUrl,
        currentPayload,
        payload,
        body,
        method,
      );
      if (!patch.changed) continue;
      bumpUrlGeneration(url);
      writeCachedResponse(key, {
        ...cached,
        body: JSON.stringify(patch.value),
        cachedAt: Date.now(),
        stale: false,
      });
      patchedUrls.push(url);
    } catch {
      // If an endpoint has a non-standard representation, targeted
      // invalidation below will safely retrieve its authoritative form.
    }
  }
  return patchedUrls;
}

function markTagsStale(tags: WorkspaceCacheTag[], excludedUrls = new Set<string>()) {
  const targetTags = new Set(tags);
  const staleUrls: string[] = [];
  for (const url of knownUrls) {
    if (excludedUrls.has(url) || !tagsIntersect(workspaceReadTags(url), targetTags)) continue;
    bumpUrlGeneration(url);
    const key = cacheKey(url);
    const cached = readCachedResponse(key);
    if (cached) {
      writeCachedResponse(key, { ...cached, stale: true });
      staleUrls.push(url);
    }
  }
  notifyCacheUpdate(staleUrls, tags, 'invalidate');
  return staleUrls;
}

async function serializeResponse(response: Response): Promise<CachedResponse> {
  return {
    body: await response.text(),
    headers: Array.from(response.headers.entries()),
    status: response.status,
    statusText: response.statusText,
    cachedAt: Date.now(),
    stale: false,
  };
}

async function readFromNetwork(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  url: string,
  showGlobalLoading: boolean,
) {
  const key = cacheKey(url);
  const existing = inFlightReads.get(key);
  if (existing) return existing;

  const fullGenerationAtStart = cacheGeneration;
  const urlGenerationAtStart = urlGenerations.get(url) || 0;
  const pendingRead = (async () => {
    if (showGlobalLoading) setNetworkReadDelta(1);
    try {
      const headers = new Headers(init?.headers);
      headers.delete('X-Workspace-Cache-Prefetch');
      headers.delete('X-Workspace-Cache-Background');
      const response = await globalThis.fetch(input, {
        ...init,
        headers,
        cache: 'no-store',
      });
      const serialized = await serializeResponse(response);
      if (
        response.ok
        && fullGenerationAtStart === cacheGeneration
        && urlGenerationAtStart === (urlGenerations.get(url) || 0)
      ) {
        writeCachedResponse(key, serialized);
        notifyCacheUpdate(url === normalizedRequestUrl(input) ? [url] : [], workspaceReadTags(url), 'revalidate');
      }
      return serialized;
    } finally {
      if (showGlobalLoading) setNetworkReadDelta(-1);
    }
  })();

  inFlightReads.set(key, pendingRead);
  try {
    return await pendingRead;
  } finally {
    inFlightReads.delete(key);
  }
}

async function fetchWorkspaceRevision() {
  if (!activeScope) return null;
  const response = await globalThis.fetch('/api/workspace/revision', {
    cache: 'no-store',
    headers: { 'X-Workspace-Cache-Background': '1' },
  });
  if (!response.ok) return null;
  const payload = await response.json() as { revision?: unknown };
  return typeof payload.revision === 'string' ? payload.revision : null;
}

async function establishWorkspaceRevisionBaseline() {
  try {
    const revision = await fetchWorkspaceRevision();
    if (revision) serverRevision = revision;
  } catch {
    // Revision checks are opportunistic and must never interrupt workspace use.
  }
}

function scheduleRevisionBaselineUpdate() {
  if (revisionBaselineTimer) clearTimeout(revisionBaselineTimer);
  revisionBaselineTimer = setTimeout(() => {
    revisionBaselineTimer = null;
    void establishWorkspaceRevisionBaseline();
  }, REVISION_BASELINE_DEBOUNCE_MS);
}

export async function checkWorkspaceDataRevision() {
  try {
    const revision = await fetchWorkspaceRevision();
    if (!revision) return false;
    if (serverRevision === null) {
      serverRevision = revision;
      return false;
    }
    if (revision !== serverRevision) {
      serverRevision = revision;
      deferredServerRefresh = true;
      return true;
    }
  } catch {
    // Retry at the next scheduled interval.
  }
  return false;
}

export function startWorkspaceDataBackgroundChecks() {
  if (typeof window === 'undefined') return () => undefined;
  if (!backgroundCheckTimer) {
    void establishWorkspaceRevisionBaseline();
    backgroundCheckTimer = setInterval(() => {
      void checkWorkspaceDataRevision();
    }, WORKSPACE_BACKGROUND_CHECK_INTERVAL_MS);
  }
  return stopWorkspaceDataBackgroundChecks;
}

export function stopWorkspaceDataBackgroundChecks() {
  if (backgroundCheckTimer) clearInterval(backgroundCheckTimer);
  backgroundCheckTimer = null;
}

export function prepareWorkspaceDataCacheForRouteChange(nextPathname: string) {
  if (!activePathname) {
    activePathname = nextPathname;
    return false;
  }
  if (nextPathname === activePathname) return false;
  activePathname = nextPathname;
  if (!deferredServerRefresh) return false;

  deferredServerRefresh = false;
  markTagsStale(Array.from(new Set(
    Array.from(knownUrls).flatMap((url) => workspaceReadTags(url)),
  )));
  return true;
}

export function prepareWorkspaceDataCacheForNavigation() {
  if (typeof window === 'undefined' || navigationPrepared) return;
  navigationPrepared = true;

  const navigation = window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  const legacyNavigation = window.performance as Performance & { navigation?: { type?: number } };
  const isReload = navigation?.type === 'reload' || legacyNavigation.navigation?.type === 1;
  if (isReload) {
    memoryCache.clear();
    knownUrls.clear();
    urlGenerations.clear();
    cacheGeneration += 1;
    removeStoredEntries(`${STORAGE_PREFIX}:`);
  }
}

export function configureWorkspaceDataCache(scope: WorkspaceCacheScope | null) {
  const nextScope = scope ? `${scope.userId}:${scope.orgId}` : '';
  if (activeScope === nextScope) return;
  const previousScope = activeScope;
  activeScope = nextScope;
  if (revisionBaselineTimer) clearTimeout(revisionBaselineTimer);
  revisionBaselineTimer = null;
  memoryCache.clear();
  inFlightReads.clear();
  knownUrls.clear();
  urlGenerations.clear();
  activePathname = '';
  serverRevision = null;
  deferredServerRefresh = false;
  cacheGeneration += 1;
  if (previousScope) removeStoredEntries(scopePrefix(previousScope));
}

export function invalidateWorkspaceDataCache() {
  if (revisionBaselineTimer) clearTimeout(revisionBaselineTimer);
  revisionBaselineTimer = null;
  cacheGeneration += 1;
  memoryCache.clear();
  inFlightReads.clear();
  knownUrls.clear();
  urlGenerations.clear();
  activePathname = '';
  serverRevision = null;
  deferredServerRefresh = false;
  removeStoredEntries(scopePrefix());
}

export function invalidateWorkspaceDataTags(tags: WorkspaceCacheTag[]) {
  return markTagsStale(tags);
}

export function subscribeWorkspaceDataLoading(listener: () => void) {
  loadingListeners.add(listener);
  return () => loadingListeners.delete(listener);
}

export function getWorkspaceDataLoadingSnapshot() {
  return activeNetworkReads > 0;
}

export async function warmWorkspaceDataCache(urls: string[]) {
  await Promise.allSettled(
    Array.from(new Set(urls)).map((url) => workspaceFetch(url, {
      headers: { 'X-Workspace-Cache-Prefetch': '1' },
    })),
  );
}

export async function workspaceFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = normalizedRequestUrl(input);
  const method = requestMethod(input, init);

  if (!isWorkspaceApi(url) || isLiveIdentityRequest(url)) {
    return globalThis.fetch(input, init);
  }

  if (method !== 'GET') {
    const response = await globalThis.fetch(input, init);
    if (!response.ok) return response;

    const body = parseRequestBody(init);
    const plan = workspaceMutationPlan(url, method, body);
    if (plan.skip || plan.invalidateTags.length === 0) return response;

    let payload: unknown = null;
    try {
      payload = await response.clone().json();
    } catch {
      // Mutation responses without JSON still receive targeted invalidation.
    }

    const patchedUrls = plan.patchKind
      ? applyMutationPatch(plan.patchKind, url, method, body, payload)
      : [];
    const excludedUrls = new Set(patchedUrls);
    markTagsStale(plan.invalidateTags, excludedUrls);
    notifyCacheUpdate(patchedUrls, plan.invalidateTags, 'patch');
    scheduleRevisionBaselineUpdate();
    return response;
  }

  if (!activeScope) {
    return globalThis.fetch(input, { ...init, cache: 'no-store' });
  }

  const isPrefetch = requestHeader(init, 'X-Workspace-Cache-Prefetch') === '1';
  const isBackground = requestHeader(init, 'X-Workspace-Cache-Background') === '1';
  const forceRefresh = init?.cache === 'no-store' || init?.cache === 'reload';
  knownUrls.add(url);
  const key = cacheKey(url);
  const cached = readCachedResponse(key);
  if (!forceRefresh && cached && !cached.stale) {
    return restoreResponse(cached, 'HIT');
  }

  const pending = inFlightReads.get(key);
  if (pending) return restoreResponse(await pending, 'MISS');

  const showGlobalLoading = !isPrefetch && !isBackground && !cached?.stale;
  const networkValue = await readFromNetwork(input, init, url, showGlobalLoading);
  return restoreResponse(networkValue, cached?.stale ? 'PATCHED' : 'MISS');
}
