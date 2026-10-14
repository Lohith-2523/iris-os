import 'server-only';

import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { proposalSchema } from '@/lib/proposals/types';
import { generateProposalPdf } from '@/lib/proposals/pdf';
import { generateProposalDocx } from '@/lib/proposals/docx';
import { generateLegalDocumentPdf } from '@/lib/legal-documents/pdf';
import { contentWithSignatureAudit } from '@/lib/documents/signing';

type GeneratedArtifactRecord = {
  id: string;
  kind: string;
  content: Prisma.JsonValue;
  pdfArtifact?: Uint8Array | null;
  docxArtifact?: Uint8Array | null;
  recipientSignerName: string | null;
  recipientSignedAt: Date | null;
  agencySignerName: string | null;
  agencySignedAt: Date | null;
  fullySignedAt: Date | null;
  signedContentHash: string | null;
};

export async function getOrCreateGeneratedDocumentPdf(document: GeneratedArtifactRecord) {
  if (document.pdfArtifact) return Buffer.from(document.pdfArtifact);
  const pdf = document.kind === 'PROPOSAL'
    ? await generateProposalPdf(proposalSchema.parse(document.content))
    : await generateLegalDocumentPdf(contentWithSignatureAudit(document));
  await prisma.generatedDocument.update({
    where: { id: document.id },
    data: { pdfArtifact: pdf, artifactsGeneratedAt: new Date() },
  });
  return pdf;
}

export async function getOrCreateGeneratedDocumentDocx(document: GeneratedArtifactRecord) {
  if (document.kind !== 'PROPOSAL') throw new Error('Word artifacts are available for proposals only.');
  if (document.docxArtifact) return Buffer.from(document.docxArtifact);
  const docx = await generateProposalDocx(proposalSchema.parse(document.content));
  await prisma.generatedDocument.update({
    where: { id: document.id },
    data: { docxArtifact: docx, artifactsGeneratedAt: new Date() },
  });
  return docx;
}
