import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getRequestUser } from '@/lib/org';
import { proposalSchema } from '@/lib/proposals/types';
import { generateProposalPdf } from '@/lib/proposals/pdf';
import { generateLegalDocumentPdf } from '@/lib/legal-documents/pdf';
import { contentWithSignatureAudit } from '@/lib/documents/signing';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const isClient = user.role.toLowerCase() === 'client';
  const document = await prisma.generatedDocument.findFirst({
    where: {
      id,
      orgId: user.orgId,
      ...(isClient ? { recipientType: 'CLIENT', recipientId: user.clientId || '__none__', sentAt: { not: null } } : {}),
    },
  });
  if (!document) return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
  try {
    const pdf = document.kind === 'PROPOSAL'
      ? document.pdfArtifact || await generateProposalPdf(proposalSchema.parse(document.content))
      : await generateLegalDocumentPdf(contentWithSignatureAudit(document));
    return new NextResponse(new Uint8Array(pdf), { headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${document.documentNumber.replace(/[^A-Za-z0-9._-]/g, '_')}.pdf"`,
      'Cache-Control': 'private, no-store',
    } });
  } catch (error) {
    console.error('Unable to render saved document:', error);
    return NextResponse.json({ error: 'Unable to render document.' }, { status: 500 });
  }
}
