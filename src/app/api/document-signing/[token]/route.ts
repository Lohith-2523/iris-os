import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { recipientSignatureNotification, runSignedDocumentAutomation, signatureRequestHash, signingContentHash } from '@/lib/documents/signing';

const signatureSchema = z.object({
  signerName: z.string().trim().min(2, 'Enter your full legal name.').max(160),
  consent: z.literal(true, { error: 'Consent is required to sign electronically.' }),
});

function validToken(token: string) {
  return /^[a-f0-9]{64}$/.test(token);
}

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!validToken(token)) return NextResponse.json({ error: 'Invalid signing link.' }, { status: 404 });
  const document = await prisma.generatedDocument.findUnique({ where: { signingToken: token }, include: { organization: { select: { name: true } } } });
  if (!document || !['CONTRACT', 'SOW'].includes(document.kind)) return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
  if (document.signingTokenExpiresAt && document.signingTokenExpiresAt < new Date() && !document.recipientSignedAt) return NextResponse.json({ error: 'This signing link has expired. Ask the agency to resend the document.' }, { status: 410 });
  return NextResponse.json({
    title: document.title, documentNumber: document.documentNumber, kind: document.kind,
    agencyName: document.organization.name, recipientName: document.recipientName, recipientEmail: document.recipientEmail,
    status: document.status, recipientSignerName: document.recipientSignerName, recipientSignedAt: document.recipientSignedAt,
    agencySignerName: document.agencySignerName, agencySignedAt: document.agencySignedAt, fullySignedAt: document.fullySignedAt,
  }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!validToken(token)) return NextResponse.json({ error: 'Invalid signing link.' }, { status: 404 });
  const parsed = signatureSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid signature.' }, { status: 400 });
  const document = await prisma.generatedDocument.findUnique({ where: { signingToken: token } });
  if (!document || !['CONTRACT', 'SOW'].includes(document.kind)) return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
  if (document.recipientSignedAt) return NextResponse.json({ success: true, alreadySigned: true, fullySigned: Boolean(document.fullySignedAt) });
  if (document.signingTokenExpiresAt && document.signingTokenExpiresAt < new Date()) return NextResponse.json({ error: 'This signing link has expired. Ask the agency to resend the document.' }, { status: 410 });
  const currentHash = signingContentHash(document.content);
  if (document.signedContentHash && document.signedContentHash !== currentHash) return NextResponse.json({ error: 'The document changed after signing began. Ask the agency to issue a new copy.' }, { status: 409 });

  const now = new Date();
  const fullySignedAt = document.agencySignedAt ? now : null;
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unavailable';
  const updated = await prisma.$transaction(async tx => {
    const signedDocument = await tx.generatedDocument.update({
      where: { id: document.id },
      data: {
        recipientSignerName: parsed.data.signerName, recipientSignedAt: now,
        recipientSignatureIpHash: signatureRequestHash(forwardedFor),
        recipientSignatureUserAgent: (request.headers.get('user-agent') || 'unavailable').slice(0, 500),
        signedContentHash: currentHash, fullySignedAt, status: fullySignedAt ? 'EXECUTED' : 'PARTIALLY_SIGNED',
        pdfArtifact: null, artifactsGeneratedAt: null,
      },
    });
    if (!fullySignedAt) {
      const admins = await tx.user.findMany({ where: { orgId: document.orgId, role: { equals: 'admin', mode: 'insensitive' }, accessRevokedAt: null }, select: { id: true } });
      const notification = recipientSignatureNotification({ id: document.id, kind: document.kind, title: document.title, documentNumber: document.documentNumber, recipientSignerName: parsed.data.signerName });
      if (admins.length) await tx.notification.createMany({ data: admins.map(admin => ({ ...notification, orgId: document.orgId, userId: admin.id })) });
    }
    return signedDocument;
  });
  if (fullySignedAt) await runSignedDocumentAutomation(updated.id);
  return NextResponse.json({ success: true, fullySigned: Boolean(fullySignedAt) });
}
