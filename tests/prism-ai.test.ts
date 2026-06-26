import { describe, it, expect } from 'vitest';
import { PrismAIService } from '../src/lib/prism-ai/service';

describe('PrismAIService Mock Calculations', () => {
  it('returns deterministic agency health scores', async () => {
    const health = await PrismAIService.getAgencyHealthScore();
    expect(health.score).toBe(84);
    expect(health.rating).toBe('EXCELLENT');
  });

  it('identifies at least one high-risk churn client', async () => {
    const predictions = await PrismAIService.getChurnPredictions();
    expect(predictions.length).toBeGreaterThan(0);
    const highRisk = predictions.find((p) => p.riskLevel === 'HIGH');
    expect(highRisk).toBeDefined();
    expect(highRisk?.clientName).toBe('Solaria Energy');
  });

  it('answers executive questions about profit leakage', async () => {
    const answer = await PrismAIService.askPrism('Highlight profit leaks');
    expect(answer.result).toContain('Lohith');
    expect(answer.result).toContain('$2,800');
    expect(answer.result).toContain('$1,400');
  });
});
