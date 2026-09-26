import {
  invalidateWorkspaceDataTags,
  workspaceFetch,
} from '@/lib/workspace-data-cache';
import { consumeAtlasStream } from '@/lib/atlas-ai/stream-protocol';

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
  details: 'Miles AI health data is currently unavailable. No synthetic organization metrics were substituted.',
};

const AI_UNAVAILABLE = 'Miles AI is currently unavailable. No synthetic organization data was returned.';

export class AtlasAIRequestError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'AtlasAIRequestError';
  }
}

export type AtlasVoiceWorkflowAction = {
  kind: 'PROJECT' | 'TASK' | 'INVOICE' | 'REPORT' | 'MEETING';
  request: string;
  details: Record<string, unknown>;
};

export type AtlasVoiceWorkflowHandoff = {
  confirmed: true;
  transcript: Array<{ role: 'user' | 'assistant'; content: string }>;
  action: AtlasVoiceWorkflowAction;
};

// Automatic Miles insights are derived from a point-in-time workspace snapshot.
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

export function setAtlasAIWorkspaceScope(scope: { userId: string; orgId: string } | null) {
  activeWorkspaceScope = scope ? `${scope.userId}:${scope.orgId}` : '';
}

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`).join(',')}}`;
}

function insightCacheKey(action: string, bodyData: Record<string, unknown>) {
  return `crystal.atlas.insight:${activeWorkspaceScope || 'unscoped'}:${action}:${stableSerialize(bodyData)}:v1`;
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
    // Session storage is only a performance optimization and must never block Miles.
  }
}

async function fetchAtlasAI(action: string, bodyData: Record<string, unknown> = {}): Promise<any> {
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
      res = await workspaceFetch('/api/atlas-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...bodyData })
      });
    } catch {
      throw new AtlasAIRequestError(AI_UNAVAILABLE);
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new AtlasAIRequestError(
        typeof data.error === 'string' ? data.error : 'Miles AI could not complete this request.',
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

export const AtlasAIService = {
  /**
   * Calculates overall agency health score based on clients and projects.
   */
  async getAgencyHealthScore(): Promise<AgencyHealthScore> {
    if (typeof window === 'undefined') {
      return UNAVAILABLE_HEALTH;
    }
    try {
      const data = await fetchAtlasAI('dashboard-summary');
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
      await fetchAtlasAI('operations-advice');
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
      await fetchAtlasAI('finance-analysis');
      // Returns dynamic list of leaks or mock structures
      return [];
    } catch {
      return [];
    }
  },

  async getReportingBrief(context?: Record<string, unknown>): Promise<{ result: string; model: string }> {
    if (typeof window === 'undefined') return { result: AI_UNAVAILABLE, model: 'Miles AI' };
    const data = await fetchAtlasAI('reporting-brief', { context });
    return { result: data.result || AI_UNAVAILABLE, model: data.model || 'Miles AI' };
  },

  /**
   * Delegates query execution.
   */
  async askAtlas(
    query: string,
    context?: any,
    sessionId?: string,
    options?: {
      onDelta?: (delta: string) => void;
      signal?: AbortSignal;
      voiceWorkflow?: AtlasVoiceWorkflowHandoff;
    },
  ): Promise<{
    result: string;
    model: string;
    sessionId: string;
    automation?: {
      completed: boolean;
      entity?: { type: 'project' | 'task' | 'invoice' | 'report'; id: string; href: string };
    };
    workflow?: {
      active: boolean;
      kind: 'PROJECT' | 'TASK' | 'INVOICE' | 'REPORT' | 'MEETING';
    };
  }> {
    if (typeof window === 'undefined') {
      throw new AtlasAIRequestError('Miles chat is only available in the browser.');
    }
    const meetingContext = {
      ...(context || {}),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      locale: navigator.language,
      clientDateTime: new Date().toISOString(),
    };
    let response: Response;
    try {
      response = await globalThis.fetch('/api/atlas-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/x-ndjson',
        },
        body: JSON.stringify({
          action: 'ask-atlas',
          query,
          context: meetingContext,
          sessionId,
          voiceWorkflow: options?.voiceWorkflow,
        }),
        signal: options?.signal,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      throw new AtlasAIRequestError(AI_UNAVAILABLE);
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new AtlasAIRequestError(
        typeof errorData.error === 'string' ? errorData.error : 'Miles AI could not complete this request.',
        response.status,
      );
    }

    let streamedResult = '';
    let completedData: Record<string, any> | null = null;
    await consumeAtlasStream(response, (event) => {
      if (event.type === 'delta') {
        streamedResult += event.delta;
        options?.onDelta?.(event.delta);
      } else if (event.type === 'done') {
        completedData = event.data;
      } else {
        throw new AtlasAIRequestError(event.error, event.status);
      }
    });
    const data = completedData as Record<string, any> | null;
    if (!data) {
      throw new AtlasAIRequestError('Miles response ended before it could be saved. Please retry.');
    }
    data.result = typeof data.result === 'string' && data.result ? data.result : streamedResult;
    if (!data.persisted || typeof data.sessionId !== 'string' || !data.result) {
      throw new AtlasAIRequestError('Miles replied, but the chat could not be saved. Please retry.');
    }
    if (data.meeting) {
      invalidateWorkspaceDataTags(['calendar', 'dashboard']);
    }
    if (data.automation?.completed && data.automation.entity) {
      const tagsByEntity = {
        project: ['projects', 'tasks', 'clients', 'finance', 'dashboard', 'operations'],
        task: ['tasks', 'projects', 'team', 'dashboard', 'operations'],
        invoice: ['invoices', 'finance', 'projects', 'clients', 'dashboard'],
        report: ['reports', 'reporting', 'dashboard'],
      } as const;
      const entityType = data.automation.entity.type as keyof typeof tagsByEntity;
      if (entityType in tagsByEntity) {
        invalidateWorkspaceDataTags([...tagsByEntity[entityType]]);
      }
    }
    return {
      result: data.result,
      model: data.model || 'Miles AI',
      sessionId: data.sessionId,
      automation: data.automation,
      workflow: data.workflow,
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
      await fetchAtlasAI('reporting-brief');
      return [];
    } catch {
      return [];
    }
  },

  async getSessions() {
    if (typeof window === 'undefined') return [];
    // Chat history must reflect completed Miles writes immediately. Unlike
    // dashboard reads, a stale session list makes a persisted conversation look
    // as though it was lost.
    const res = await workspaceFetch('/api/atlas-ai/sessions', { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return data.sessions || [];
  },

  async persistVoiceTurn(
    role: 'user' | 'assistant',
    content: string,
    sessionId?: string,
  ): Promise<{ sessionId: string; created: boolean }> {
    const res = await workspaceFetch('/api/atlas-ai/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, content, sessionId }),
      keepalive: true,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || typeof data.sessionId !== 'string') {
      throw new AtlasAIRequestError(
        typeof data.error === 'string' ? data.error : 'Miles could not save this voice turn.',
        res.status,
      );
    }
    return { sessionId: data.sessionId, created: Boolean(data.created) };
  },

  async getSessionMessages(id: string) {
    if (typeof window === 'undefined') return null;
    const res = await workspaceFetch(`/api/atlas-ai/sessions/${id}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  },

  async deleteSession(id: string) {
    if (typeof window === 'undefined') return;
    const res = await workspaceFetch(`/api/atlas-ai/sessions/${id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new AtlasAIRequestError(
        typeof data.error === 'string' ? data.error : 'Miles could not delete this chat.',
        res.status,
      );
    }
  },

  async renameSession(id: string, title: string): Promise<{ id: string; title: string }> {
    const res = await workspaceFetch(`/api/atlas-ai/sessions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new AtlasAIRequestError(
        typeof data.error === 'string' ? data.error : 'Miles could not rename this chat.',
        res.status,
      );
    }
    return data;
  }
};

export default AtlasAIService;
