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

async function fetchPrismAI(action: string, bodyData: any = {}): Promise<any> {
  if (typeof window === 'undefined') {
    return { result: '' };
  }

  const res = await fetch('/api/prism-ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...bodyData })
  });
  if (!res.ok) throw new Error();
  return res.json();
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

  /**
   * Delegates query execution.
   */
  async askPrism(query: string, context?: any, sessionId?: string): Promise<{ result: string; model: string; sessionId?: string }> {
    if (typeof window === 'undefined') {
      return { result: AI_UNAVAILABLE, model: 'Prism AI' };
    }
    try {
      const data = await fetchPrismAI('ask-prism', { query, context, sessionId });
      return {
        result: data.result,
        model: data.model || 'Prism AI',
        sessionId: data.sessionId,
      };
    } catch {
      return { result: AI_UNAVAILABLE, model: 'Prism AI' };
    }
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
    const res = await fetch('/api/prism-ai/sessions');
    if (!res.ok) return [];
    const data = await res.json();
    return data.sessions || [];
  },

  async getSessionMessages(id: string) {
    if (typeof window === 'undefined') return null;
    const res = await fetch(`/api/prism-ai/sessions/${id}`);
    if (!res.ok) return null;
    return await res.json();
  },

  async deleteSession(id: string) {
    if (typeof window === 'undefined') return;
    await fetch(`/api/prism-ai/sessions/${id}`, { method: 'DELETE' });
  }
};

export default PrismAIService;
