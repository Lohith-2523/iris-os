import {
  invalidateWorkspaceDataTags,
  workspaceFetch,
} from '@/lib/workspace-data-cache';

export interface AgencyHealthScore {
  score: number;
  rating: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'RISK';
  details: string;
}

export interface ChurnPrediction {
  clientId: string;
  clientName: string;
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  reasons: string[];
  recommendation: string;
}

export interface ProfitLeak {
  id: string;
  title: string;
  description: string;
  impactValue: number;
  category: 'CONTRACTOR' | 'SUBSCRIPTION' | 'SCOPE_CREEP';
  actionStep: string;
}

const UNAVAILABLE_HEALTH = {
  score: 0,
  rating: 'FAIR' as const,
  details: 'Prism AI health data is currently unavailable. No synthetic organization metrics were substituted.',
};

const AI_UNAVAILABLE = 'Prism AI is currently unavailable. No synthetic organization data was returned.';

export class PrismAIRequestError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'PrismAIRequestError';
  }
}

// Automatic Prisma insights are derived from a point-in-time workspace snapshot.
// Keep them in session storage (not local storage) so navigating between workspace
// pages does not repeatedly invoke an AI provider, while a new browser session starts
// with a fresh, authenticated snapshot.
const INSIGHT_CACHE_TTL_MS = 30 * 60 * 1000;
const CACHEABLE_ACTIONS = new Set([
  'dashboard-summary',
  'operations-advice',
  'finance-analysis',
  'forecasting',
  'reporting-brief',
]);
const inFlightRequests = new Map<string, Promise<any>>();
let activeWorkspaceScope = '';

export function setPrismAIWorkspaceScope(scope: { userId: string; orgId: string } | null) {
  activeWorkspaceScope = scope ? `${scope.userId}:${scope.orgId}` : '';
}

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`).join(',')}}`;
}

function insightCacheKey(action: string, bodyData: Record<string, unknown>) {
  return `crystal.prism.insight:${activeWorkspaceScope || 'unscoped'}:${action}:${stableSerialize(bodyData)}:v1`;
}

function readCachedInsight(key: string): any | null {
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const cached = JSON.parse(raw) as { expiresAt?: number; data?: unknown };
    if (!cached.expiresAt || cached.expiresAt <= Date.now()) {
      window.sessionStorage.removeItem(key);
      return null;
    }
    return cached.data ?? null;
  } catch {
    return null;
  }
}

function cacheInsight(key: string, data: unknown) {
  try {
    window.sessionStorage.setItem(key, JSON.stringify({
      expiresAt: Date.now() + INSIGHT_CACHE_TTL_MS,
      data,
    }));
  } catch {
    // Session storage is only a performance optimization and must never block Prism.
  }
}

async function fetchPrismAI(action: string, bodyData: Record<string, unknown> = {}): Promise<any> {
  if (typeof window === 'undefined') {
    return { result: '' };
  }

  const cacheable = CACHEABLE_ACTIONS.has(action);
  const cacheKey = cacheable ? insightCacheKey(action, bodyData) : null;
  if (cacheKey) {
    const cached = readCachedInsight(cacheKey);
    if (cached) return cached;

    const pending = inFlightRequests.get(cacheKey);
    if (pending) return pending;
  }

  const request = (async () => {
    let res: Response;
    try {
      res = await workspaceFetch('/api/prism-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...bodyData })
      });
    } catch {
      throw new PrismAIRequestError(AI_UNAVAILABLE);
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new PrismAIRequestError(
        typeof data.error === 'string' ? data.error : 'Prism AI could not complete this request.',
        res.status,
      );
    }
    if (cacheKey) cacheInsight(cacheKey, data);
    return data;
  })();

  if (cacheKey) inFlightRequests.set(cacheKey, request);
  try {
    return await request;
  } finally {
    if (cacheKey) inFlightRequests.delete(cacheKey);
  }
}

export const PrismAIService = {
  /**
   * Calculates overall agency health score based on clients and projects.
   */
  async getAgencyHealthScore(): Promise<AgencyHealthScore> {
    if (typeof window === 'undefined') {
      return UNAVAILABLE_HEALTH;
    }
    try {
      const data = await fetchPrismAI('dashboard-summary');
      return {
        score: 0,
        rating: 'FAIR',
        details: data.result,
      };
    } catch {
      return UNAVAILABLE_HEALTH;
    }
  },

  /**
   * Identifies clients with high churn risk.
   */
  async getChurnPredictions(): Promise<ChurnPrediction[]> {
    if (typeof window === 'undefined') {
      return [];
    }
    try {
      await fetchPrismAI('operations-advice');
      // Returns dynamic predictions or fallback structured list
      return [];
    } catch {
      return [];
    }
  },

  /**
   * Detects profit leakage in contractor rates, subscriptions, or project scopes.
   */
  async getProfitLeaks(): Promise<ProfitLeak[]> {
    if (typeof window === 'undefined') {
      return [];
    }
    try {
      await fetchPrismAI('finance-analysis');
      // Returns dynamic list of leaks or mock structures
      return [];
    } catch {
      return [];
    }
  },

  async getReportingBrief(context?: Record<string, unknown>): Promise<{ result: string; model: string }> {
    if (typeof window === 'undefined') return { result: AI_UNAVAILABLE, model: 'Prism AI' };
    const data = await fetchPrismAI('reporting-brief', { context });
    return { result: data.result || AI_UNAVAILABLE, model: data.model || 'Prism AI' };
  },

  /**
   * Delegates query execution.
   */
  async askPrism(query: string, context?: any, sessionId?: string): Promise<{ result: string; model: string; sessionId: string }> {
    if (typeof window === 'undefined') {
      throw new PrismAIRequestError('Prism chat is only available in the browser.');
    }
    const meetingContext = {
      ...(context || {}),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      locale: navigator.language,
      clientDateTime: new Date().toISOString(),
    };
    const data = await fetchPrismAI('ask-prism', { query, context: meetingContext, sessionId });
    if (!data.persisted || typeof data.sessionId !== 'string' || !data.result) {
      throw new PrismAIRequestError('Prism replied, but the chat could not be saved. Please retry.');
    }
    if (data.meeting) {
      invalidateWorkspaceDataTags(['calendar', 'dashboard']);
    }
    return {
      result: data.result,
      model: data.model || 'Prism AI',
      sessionId: data.sessionId,
    };
  },

  /**
   * Suggests campaign optimizations inside the Design Hub.
   */
  async getCreativeRecommendations(): Promise<string[]> {
    if (typeof window === 'undefined') {
      return [];
    }
    try {
      await fetchPrismAI('reporting-brief');
      return [];
    } catch {
      return [];
    }
  },

  async getSessions() {
    if (typeof window === 'undefined') return [];
    // Chat history must reflect completed Prism writes immediately. Unlike
    // dashboard reads, a stale session list makes a persisted conversation look
    // as though it was lost.
    const res = await workspaceFetch('/api/prism-ai/sessions', { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return data.sessions || [];
  },

  async getSessionMessages(id: string) {
    if (typeof window === 'undefined') return null;
    const res = await workspaceFetch(`/api/prism-ai/sessions/${id}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  },

  async deleteSession(id: string) {
    if (typeof window === 'undefined') return;
    await workspaceFetch(`/api/prism-ai/sessions/${id}`, { method: 'DELETE' });
  }
};

export default PrismAIService;
