import { describe, expect, it } from 'vitest';
import { isDetailedDocument, isDocumentGenerationRequest } from './document-intent';

describe('Miles document delegation', () => {
  it.each([
    'Generate a financial report for this quarter',
    'Build a detailed client retention strategy',
    'Please prepare a strategic plan from our project data',
  ])('detects explicit document creation: %s', (query) => {
    expect(isDocumentGenerationRequest(query)).toBe(true);
  });

  it('does not treat an ordinary strategy question as a document request', () => {
    expect(isDocumentGenerationRequest('What strategy would you recommend?')).toBe(false);
  });

  it('rejects thin documents even when they contain headings', () => {
    expect(isDetailedDocument('# Title\n## Summary\nA short answer.', 100, 2)).toBe(false);
  });
});
