import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({ reserve: vi.fn(), settle: vi.fn() }));
vi.mock('@/lib/atlas-ai/token-budget', () => ({
  estimateInputTokens: vi.fn(() => 100),
  reserveAtlasTokens: mocks.reserve,
  settleAtlasTokenReservation: mocks.settle,
}));

import { AtlasStrategyError, generateStrategyWithAtlas } from './atlas';

const strategyInput = {
  type: 'FINANCIAL' as const,
  goal: 'Improve margin quality',
  timeline: 'Next 90 days',
  organizationName: 'Example Agency',
  currency: 'INR',
  clients: [{ name: 'Acme' }],
  projects: [{ name: 'Nova', riskLevel: 'HIGH' }],
  workspaceContext: 'Invoice INV-1 is unpaid. Project Nova is high risk.',
  tokenBudget: { orgId: 'org-1', userId: 'user-1', userRole: 'admin', plan: 'ADVANCED' as const },
};

describe('Claude strategy generation', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('refuses to save a thin strategy document', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key');
    mocks.reserve.mockResolvedValue({ id: 'reservation' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ content: [{ type: 'text', text: '# Strategy\nA short answer.' }] }),
    }));

    await expect(generateStrategyWithAtlas(strategyInput)).rejects.toBeInstanceOf(AtlasStrategyError);
    expect(mocks.reserve).toHaveBeenCalledWith(expect.objectContaining({ provider: 'CLAUDE', output: 7000 }));
  });

  it('accepts a detailed evidence-led strategy', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key');
    mocks.reserve.mockResolvedValue({ id: 'reservation' });
    const headings = ['Title', 'Executive direction', 'Evidence', 'Priorities', 'Roadmap', 'Actions', 'Measures', 'Risks'];
    const content = headings.map((heading) => `## ${heading}\n${Array.from({ length: 120 }, () => 'evidence').join(' ')}`).join('\n');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ content: [{ type: 'text', text: content }], usage: { input_tokens: 400, output_tokens: 1600 } }),
    }));

    await expect(generateStrategyWithAtlas(strategyInput)).resolves.toMatchObject({ content, model: 'Miles AI' });
    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect(JSON.parse(String(init?.body)).model).toBe('claude-opus-4-8');
  });
});
