import { describe, it, expect } from 'vitest';
import { PrismAIService } from '../src/lib/prism-ai/service';

describe('PrismAIService safe server fallbacks', () => {
  it('does not substitute a synthetic agency health score', async () => {
    const health = await PrismAIService.getAgencyHealthScore();
    expect(health.score).toBe(0);
    expect(health.details).toContain('No synthetic organization metrics');
  });

  it('does not invent churn-risk clients', async () => {
    const predictions = await PrismAIService.getChurnPredictions();
    expect(predictions).toEqual([]);
  });

  it('does not invent financial leakage when the service is unavailable', async () => {
    const answer = await PrismAIService.askPrism('Highlight profit leaks');
    expect(answer.result).toContain('unavailable');
    expect(answer.result).toContain('No synthetic organization data');
  });
});
