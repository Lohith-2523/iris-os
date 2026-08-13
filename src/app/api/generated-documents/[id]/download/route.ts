import JSZip from 'jszip';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getRequestUser } from '@/lib/org';
import { proposalSchema } from '@/lib/proposals/types';
import { generateProposalPdf } from '@/lib/proposals/pdf';
import { generateProposalDocx } from '@/lib/proposals/docx';
import { generateLegalDocumentPdf } from '@/lib/legal-documents/pdf';
import { contentWithSignatureAudit } from '@/lib/documents/signing';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const format = new URL(request.url).searchParams.get('format') || 'pdf';
  if (!['pdf', 'docx', 'both'].includes(format)) return NextResponse.json({ error: 'Unsupported file format.' }, { status: 400 });
  const document = await prisma.generatedDocument.findFirst({ where: { id, orgId: user.orgId } });
  if (!document) return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
  if (document.kind !== 'PROPOSAL' && format !== 'pdf') return NextResponse.json({ error: 'Word downloads are available for proposals only.' }, { status: 400 });
  if (document.kind === 'PROPOSAL' && !document.approvedAt) return NextResponse.json({ error: 'Approve the proposal before downloading its final copies.' }, { status: 409 });

  try {
    const safeNumber = document.documentNumber.replace(/[^A-Za-z0-9._-]/g, '_');
    const proposal = document.kind === 'PROPOSAL' ? proposalSchema.parse(document.content) : null;
    const pdf = document.kind === 'PROPOSAL'
      ? document.pdfArtifact || await generateProposalPdf(proposal!)
      : await generateLegalDocumentPdf(contentWithSignatureAudit(document));

    if (format === 'pdf') return new NextResponse(new Uint8Array(pdf), { headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${safeNumber}.pdf"`,
      'Cache-Control': 'private, no-store',
    } });

    const docx = document.docxArtifact || await generateProposalDocx(proposal!);
    if (format === 'docx') return new NextResponse(new Uint8Array(docx), { headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${safeNumber}.docx"`,
      'Cache-Control': 'private, no-store',
    } });

    const zip = new JSZip();
    zip.file(`${safeNumber}.pdf`, pdf);
    zip.file(`${safeNumber}.docx`, docx);
    const archive = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    return new NextResponse(Uint8Array.from(archive), { headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${safeNumber}_files.zip"`,
      'Cache-Control': 'private, no-store',
    } });
  } catch (error) {
    console.error('Unable to download saved document:', error);
    return NextResponse.json({ error: 'Unable to prepare the requested download.' }, { status: 500 });
  }
}
