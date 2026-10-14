import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  generateProposalPdf: vi.fn(),
  generateProposalDocx: vi.fn(),
  generateLegalDocumentPdf: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({ prisma: { generatedDocument: { update: mocks.update } } }));
vi.mock('@/lib/proposals/types', () => ({ proposalSchema: { parse: (value: unknown) => value } }));
vi.mock('@/lib/proposals/pdf', () => ({ generateProposalPdf: mocks.generateProposalPdf }));
vi.mock('@/lib/proposals/docx', () => ({ generateProposalDocx: mocks.generateProposalDocx }));
vi.mock('@/lib/legal-documents/pdf', () => ({ generateLegalDocumentPdf: mocks.generateLegalDocumentPdf }));
vi.mock('@/lib/documents/signing', () => ({ contentWithSignatureAudit: (value: unknown) => value }));

import { getOrCreateGeneratedDocumentPdf } from './generated-artifacts';

const legalDocument = {
  id: 'document-1',
  kind: 'CONTRACT',
  content: { title: 'Contract' },
  pdfArtifact: null,
  recipientSignerName: null,
  recipientSignedAt: null,
  agencySignerName: null,
  agencySignedAt: null,
  fullySignedAt: null,
  signedContentHash: null,
};

describe('generated document artifact reuse', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns a stored PDF without rendering it again', async () => {
    const stored = Buffer.from('%PDF-stored');
    await expect(getOrCreateGeneratedDocumentPdf({ ...legalDocument, pdfArtifact: stored })).resolves.toEqual(stored);
    expect(mocks.generateLegalDocumentPdf).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('stores a legal PDF after the first render', async () => {
    const rendered = Buffer.from('%PDF-rendered');
    mocks.generateLegalDocumentPdf.mockResolvedValue(rendered);
    mocks.update.mockResolvedValue({});

    await expect(getOrCreateGeneratedDocumentPdf(legalDocument)).resolves.toEqual(rendered);
    expect(mocks.generateLegalDocumentPdf).toHaveBeenCalledTimes(1);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'document-1' },
      data: expect.objectContaining({ pdfArtifact: rendered }),
    }));
  });
});
