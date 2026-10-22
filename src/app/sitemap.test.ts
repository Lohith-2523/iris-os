import { describe, expect, it } from 'vitest';
import sitemap from './sitemap';

describe('public sitemap', () => {
  it('contains only canonical public pages', () => {
    expect(sitemap().map((entry) => entry.url)).toEqual([
      'https://irisos.app/',
      'https://irisos.app/pricing',
      'https://irisos.app/contact',
      'https://irisos.app/privacy',
      'https://irisos.app/terms',
      'https://irisos.app/cancellation-refund-policy',
      'https://irisos.app/data-processing-agreement',
      'https://irisos.app/ai-usage-policy',
      'https://irisos.app/subprocessors',
    ]);
  });
});
