import { describe, expect, it } from 'vitest';
import { extractChatFileArtifacts } from './chat-file-artifacts';

describe('Miles chat file artifacts', () => {
  it('turns generated document links into preview descriptors without duplicating the link', () => {
    const result = extractChatFileArtifacts('Invoice created. [Open or download the invoice PDF](/api/invoices/invoice-1/pdf).');

    expect(result.displayText).toBe('Invoice created.');
    expect(result.artifacts).toEqual([{
      href: '/api/invoices/invoice-1/pdf',
      fileName: 'invoice.pdf',
    }]);
  });

  it('supports generated document download formats and ordinary file paths', () => {
    const result = extractChatFileArtifacts([
      '[Proposal](/api/generated-documents/doc-1/download?format=docx)',
      '[Scope](/files/scope.pdf)',
    ].join('\n'));

    expect(result.artifacts.map((artifact) => artifact.fileName)).toEqual(['Proposal.docx', 'scope.pdf']);
  });

  it('leaves external and ordinary navigation links in the message', () => {
    const markdown = '[Website](https://example.com) and [project](/projects/project-1)';
    expect(extractChatFileArtifacts(markdown)).toEqual({ displayText: markdown, artifacts: [] });
  });

  it('renders repeated file links as one card and no duplicate raw link', () => {
    const result = extractChatFileArtifacts('[Invoice](/api/invoices/1/pdf)\n[Invoice again](/api/invoices/1/pdf)');
    expect(result.artifacts).toHaveLength(1);
    expect(result.displayText).toBe('');
  });
});
