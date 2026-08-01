import { describe, it, expect } from 'vitest';
import { AtlasAIService } from '../src/lib/atlas-ai/service';

describe('AtlasAIService safe server fallbacks', () => {
  it('does not substitute a synthetic agency health score', async () => {
    const health = await AtlasAIService.getAgencyHealthScore();
    expect(health.score).toBe(0);
    expect(health.details).toContain('No synthetic organization metrics');
  });

  it('does not invent churn-risk clients', async () => {
    const predictions = await AtlasAIService.getChurnPredictions();
    expect(predictions).toEqual([]);
  });

  it('does not invent financial leakage when the service is unavailable', async () => {
    await expect(AtlasAIService.askAtlas('Highlight profit leaks')).rejects.toThrow(
      'Atlas AI is currently unavailable. No synthetic organization data was returned.',
    );
  });
});
