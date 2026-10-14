import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getOrCreateGeneratedDocumentPdf } from '@/lib/documents/generated-artifacts';

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9]{64}$/.test(token)) return NextResponse.json({ error: 'Invalid signing link.' }, { status: 404 });
  const document = await prisma.generatedDocument.findUnique({ where: { signingToken: token } });
  if (!document || !['CONTRACT', 'SOW'].includes(document.kind)) return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
  const pdf = await getOrCreateGeneratedDocumentPdf(document);
  return new NextResponse(new Uint8Array(pdf), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${document.documentNumber.replace(/[^A-Za-z0-9._-]/g, '_')}.pdf"`, 'Cache-Control': 'private, no-store' } });
}
