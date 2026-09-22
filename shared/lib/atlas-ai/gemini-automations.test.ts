import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('./token-budget', () => ({
  estimateInputTokens: () => 1,
  reserveAtlasTokens: vi.fn(),
  settleAtlasTokenReservation: vi.fn(),
}));

let parseGeminiAutomationResponse: typeof import('./gemini-automations').parseGeminiAutomationResponse;

beforeAll(async () => {
  ({ parseGeminiAutomationResponse } = await import('./gemini-automations'));
});

describe('Gemini automation response parsing', () => {
  it('returns null for a response truncated inside a JSON string', () => {
    expect(parseGeminiAutomationResponse('{"kind":"TASK","reply":"unfinished')).toBeNull();
  });

  it('validates a complete structured response and applies draft defaults', () => {
    const parsed = parseGeminiAutomationResponse(JSON.stringify({
      kind: 'TASK',
      action: 'COLLECT',
      draft: { title: 'Review launch plan' },
      reply: 'Which project should own this task?',
      decisionMode: false,
      decisionRationale: '',
      decisionEvidence: [],
    }));
    expect(parsed?.draft.title).toBe('Review launch plan');
    expect(parsed?.draft.projectName).toBe('');
  });
});
