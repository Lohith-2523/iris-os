import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({ reserve: vi.fn(), settle: vi.fn() }));
vi.mock('./token-budget', () => ({
  AtlasTokenLimitError: class AtlasTokenLimitError extends Error {},
  estimateInputTokens: vi.fn(() => 42),
  reserveAtlasTokens: mocks.reserve,
  settleAtlasTokenReservation: mocks.settle,
}));

import { generateReportWithClaude } from './claude-documents';

describe('Claude report generation', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('charges Claude and sends the verified workspace context to Opus', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key');
    mocks.reserve.mockResolvedValue({ id: 'reservation' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ content: [{ type: 'text', text: '## Executive analysis\nVerified findings.' }], usage: { input_tokens: 80, output_tokens: 20 } }),
    }));

    const output = await generateReportWithClaude({
      title: 'Quarterly report',
      type: 'EXECUTIVE',
      focus: 'Delivery and margin risk',
      workspaceContext: 'Client Acme; Project Nova is high risk.',
      tokenBudget: { orgId: 'org-1', userId: 'user-1', userRole: 'admin', plan: 'ADVANCED' },
    });

    expect(output).toContain('Verified findings');
    expect(mocks.reserve).toHaveBeenCalledWith(expect.objectContaining({ provider: 'CLAUDE', output: 2200 }));
    const [, init] = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse(String(init?.body));
    expect(body.model).toBe('claude-opus-4-8');
    expect(body.messages[0].content).toContain('Project Nova is high risk');
  });
});
