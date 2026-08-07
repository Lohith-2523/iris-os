import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getRequestUser, isOrganizationAdmin } from '@/lib/org';
import { createDocumentDraft, createSimpleDocumentDraft, type DocumentKind, type DocumentRecipient } from '@/lib/documents/draft';
import { proposalSchema } from '@/lib/proposals/types';
import { legalDocumentSchema } from '@/lib/legal-documents/types';
import { generateProposalPdf } from '@/lib/proposals/pdf';
import { generateLegalDocumentPdf } from '@/lib/legal-documents/pdf';
import { IrisEmailDeliveryError, sendIrisEmail } from '@/lib/email/iris-email';
import { agencyViaIrisSenderName } from '@/lib/email/sender-name';
import { contentWithSignatureAudit, newSigningToken, runSignedDocumentAutomation, signingContentHash } from '@/lib/documents/signing';

const mutationSchema = z.object({
  action: z.enum(['atlas_create', 'simple_create', 'save', 'send', 'agency_sign']),
  kind: z.enum(['PROPOSAL', 'CONTRACT', 'SOW']).optional(),
  recipientType: z.enum(['LEAD', 'CLIENT']).optional(),
  recipientId: z.string().uuid().optional(),
  prompt: z.string().trim().min(10).max(8_000).optional(),
  simpleDetails: z.object({
    workProvided: z.string().trim().min(2, 'Describe the work being provided.').max(8_000),
    timeline: z.string().trim().min(2, 'Enter the delivery timeline.').max(2_000),
    paymentTerms: z.string().trim().min(2, 'Enter the payment terms.').max(4_000),
    termsAndConditions: z.string().trim().max(10_000).optional().default(''),
  }).optional(),
  content: z.unknown().optional(),
  id: z.string().uuid().optional(),
});

async function findRecipient(orgId: string, type: 'LEAD' | 'CLIENT', id: string): Promise<DocumentRecipient | null> {
  if (type === 'LEAD') {
    const lead = await prisma.agencyLead.findFirst({ where: { id, orgId } });
    return lead ? { id: lead.id, type, name: lead.fullName, company: lead.fullName, email: lead.email, phone: lead.phone } : null;
  }
  const client = await prisma.client.findFirst({ where: { id, orgId }, include: { contacts: { orderBy: { createdAt: 'asc' }, take: 1 } } });
  if (!client) return null;
  const contact = client.contacts[0];
  const metadata = client.metadata && typeof client.metadata === 'object' && !Array.isArray(client.metadata) ? client.metadata as Record<string, unknown> : {};
  const email = contact?.email || String(metadata.email || '');
  if (!email) return null;
  return {
    id: client.id, type, name: contact?.name || client.name, company: client.legalEntityName || client.name,
    email, phone: contact?.phone,
    address: [client.billingAddressLine1, client.billingAddressLine2, client.billingCity, client.billingState, client.billingPostalCode, client.billingCountry].filter(Boolean).join(', '),
  };
}

function validate(kind: DocumentKind, content: unknown) {
  return kind === 'PROPOSAL' ? proposalSchema.parse(content) : legalDocumentSchema.parse(content);
}

async function pdfFor(kind: DocumentKind, content: unknown) {
  const parsed = validate(kind, content);
  return kind === 'PROPOSAL'
    ? generateProposalPdf(parsed as z.infer<typeof proposalSchema>)
    : generateLegalDocumentPdf(parsed as z.infer<typeof legalDocumentSchema>);
}

async function sendDocument(record: { id: string; kind: string; title: string; documentNumber: string; recipientName: string; recipientEmail: string; content: Prisma.JsonValue; signingToken?: string | null; recipientSignerName?: string | null; recipientSignedAt?: Date | null; agencySignerName?: string | null; agencySignedAt?: Date | null; fullySignedAt?: Date | null; signedContentHash?: string | null }, organization: { name: string; plan: string }, baseUrl: string) {
  const pdfContent = record.kind === 'PROPOSAL' ? record.content : contentWithSignatureAudit({ ...record, recipientSignerName: record.recipientSignerName || null, recipientSignedAt: record.recipientSignedAt || null, agencySignerName: record.agencySignerName || null, agencySignedAt: record.agencySignedAt || null, fullySignedAt: record.fullySignedAt || null, signedContentHash: record.signedContentHash || null });
  const pdf = await pdfFor(record.kind as DocumentKind, pdfContent);
  const label = record.kind === 'SOW' ? 'statement of work' : record.kind.toLowerCase();
  const signingUrl = record.signingToken && record.kind !== 'PROPOSAL' ? `${baseUrl.replace(/\/$/, '')}/sign-document/${record.signingToken}` : '';
  const signingHtml = signingUrl ? `<p><a href="${signingUrl}" style="display:inline-block;background:#111;color:#fff;padding:12px 18px;text-decoration:none;border-radius:8px">Review and sign document</a></p><p style="font-size:12px;color:#666">This secure signing link is intended for ${record.recipientEmail}.</p>` : '';
  const signingText = signingUrl ? `\n\nReview and sign securely: ${signingUrl}` : '';
  await sendIrisEmail({
    to: [record.recipientEmail],
    fromName: agencyViaIrisSenderName(organization.name, organization.plan),
    subject: `${record.title} from Iris OS`,
    html: `<div style="font-family:Arial,sans-serif;color:#111;line-height:1.6"><p>Hello ${record.recipientName.replace(/[<>&]/g, '')},</p><p>Your ${label} is attached for review.</p>${signingHtml}<p>Regards,<br>Iris OS</p></div>`,
    text: `Hello ${record.recipientName},\n\nYour ${label} is attached for review.${signingText}\n\nRegards,\nIris OS`,
    idempotencyKey: `generated-document-${record.id}-${Date.now()}`,
    tags: [{ name: 'category', value: 'generated_document' }],
    attachments: [{ filename: `${record.documentNumber.replace(/[^A-Za-z0-9._-]/g, '_')}.pdf`, content: Buffer.from(pdf), contentType: 'application/pdf' }],
  });
}

export async function GET(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role.toLowerCase() === 'client') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const family = new URL(request.url).searchParams.get('family');
  const kinds = family === 'PROPOSAL' ? ['PROPOSAL'] : ['CONTRACT', 'SOW'];
  const [documents, clients, leads] = await Promise.all([
    prisma.generatedDocument.findMany({ where: { orgId: user.orgId, kind: { in: kinds } }, orderBy: { createdAt: 'desc' } }),
    prisma.client.findMany({ where: { orgId: user.orgId, status: { not: 'DELETED' } }, include: { contacts: { orderBy: { createdAt: 'asc' }, take: 1 } }, orderBy: { name: 'asc' } }),
    prisma.agencyLead.findMany({ where: { orgId: user.orgId }, select: { id: true, fullName: true, email: true }, orderBy: { fullName: 'asc' } }),
  ]);
  return NextResponse.json({
    documents,
    recipients: [
      ...clients.flatMap(client => client.contacts[0]?.email ? [{ id: client.id, type: 'CLIENT', name: client.contacts[0].name || client.name, company: client.name, email: client.contacts[0].email }] : []),
      ...leads.map(lead => ({ id: lead.id, type: 'LEAD', name: lead.fullName, company: lead.fullName, email: lead.email })),
    ],
  });
}

export async function POST(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isOrganizationAdmin(user) && user.role.toLowerCase() !== 'member') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const parsed = mutationSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid request.' }, { status: 400 });
  const input = parsed.data;
  const configuredUrl = process.env.APP_URL?.trim().replace(/\/+$/, '');
  const forwardedHost = request.headers.get('x-forwarded-host');
  const baseUrl = configuredUrl || (forwardedHost ? `${request.headers.get('x-forwarded-proto') || 'https'}://${forwardedHost}` : new URL(request.url).origin);

  if (input.action === 'agency_sign') {
    if (!isOrganizationAdmin(user)) return NextResponse.json({ error: 'Only an agency administrator can countersign documents.' }, { status: 403 });
    if (!input.id) return NextResponse.json({ error: 'Document is required.' }, { status: 400 });
    const record = await prisma.generatedDocument.findFirst({ where: { id: input.id, orgId: user.orgId, kind: { in: ['CONTRACT', 'SOW'] } } });
    if (!record) return NextResponse.json({ error: 'Contract or SOW not found.' }, { status: 404 });
    if (record.agencySignedAt) return NextResponse.json({ document: record });
    const now = new Date();
    const fullySignedAt = record.recipientSignedAt ? now : null;
    const document = await prisma.generatedDocument.update({ where: { id: record.id }, data: { agencySignerName: user.name, agencySignedById: user.id, agencySignedAt: now, fullySignedAt, signedContentHash: record.signedContentHash || signingContentHash(record.content), status: fullySignedAt ? 'EXECUTED' : 'PARTIALLY_SIGNED' } });
    if (fullySignedAt) await runSignedDocumentAutomation(document.id);
    return NextResponse.json({ document: await prisma.generatedDocument.findUnique({ where: { id: document.id } }) });
  }

  if (input.action === 'send') {
    if (!input.id) return NextResponse.json({ error: 'Document is required.' }, { status: 400 });
    let record = await prisma.generatedDocument.findFirst({ where: { id: input.id, orgId: user.orgId } });
    if (!record) return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
    if (record.kind !== 'PROPOSAL' && !record.signingToken) record = await prisma.generatedDocument.update({ where: { id: record.id }, data: { signingToken: newSigningToken(), signingTokenExpiresAt: new Date(Date.now() + 30 * 86_400_000) } });
    try {
      await sendDocument(record, user.organization, baseUrl);
      const document = await prisma.generatedDocument.update({ where: { id: record.id }, data: { status: record.recipientSignedAt || record.agencySignedAt ? 'PARTIALLY_SIGNED' : 'SENT', sentAt: new Date() } });
      return NextResponse.json({ document });
    } catch (error) {
      if (error instanceof IrisEmailDeliveryError) return NextResponse.json({ error: error.message }, { status: error.status });
      throw error;
    }
  }

  if (!input.kind) return NextResponse.json({ error: 'Document type is required.' }, { status: 400 });
  if (input.kind !== 'SOW' && input.recipientType === 'CLIENT') return NextResponse.json({ error: 'Proposals and contracts can only be created for leads.' }, { status: 400 });
  if ((input.action === 'atlas_create' || input.action === 'simple_create') && (!input.recipientType || !input.recipientId)) return NextResponse.json({ error: 'Select a lead or client.' }, { status: 400 });
  if (input.action === 'simple_create' && !input.simpleDetails) return NextResponse.json({ error: 'Complete the work, timeline, and payment details.' }, { status: 400 });
  const manualContent = input.content && typeof input.content === 'object' ? input.content as Record<string, unknown> : {};
  const manualEmail = String(manualContent.clientEmail || '').trim().toLowerCase();
  const matchedClient = input.action === 'save' && input.kind === 'SOW' && manualEmail ? await prisma.client.findFirst({ where: { orgId: user.orgId, contacts: { some: { email: { equals: manualEmail, mode: 'insensitive' } } } }, include: { contacts: { where: { email: { equals: manualEmail, mode: 'insensitive' } }, take: 1 } } }) : null;
  const matchedLead = input.action === 'save' && manualEmail ? await prisma.agencyLead.findFirst({ where: { orgId: user.orgId, email: { equals: manualEmail, mode: 'insensitive' } } }) : null;
  const recipient = input.recipientType && input.recipientId
    ? await findRecipient(user.orgId, input.recipientType, input.recipientId)
    : matchedClient
      ? { id: matchedClient.id, type: 'CLIENT' as const, name: matchedClient.contacts[0]?.name || matchedClient.name, company: matchedClient.legalEntityName || matchedClient.name, email: manualEmail }
      : matchedLead
        ? { id: matchedLead.id, type: 'LEAD' as const, name: matchedLead.fullName, company: matchedLead.fullName, email: manualEmail, phone: matchedLead.phone }
        : manualEmail
          ? { id: `manual:${manualEmail}`, type: 'CLIENT' as const, name: String(manualContent.clientName || manualContent.clientLegalName || manualEmail), company: String(manualContent.clientCompany || manualContent.clientLegalName || manualContent.clientName || manualEmail), email: manualEmail }
          : null;
  if (!recipient) return NextResponse.json({ error: 'The selected recipient needs a valid email address.' }, { status: 400 });
  if (input.kind !== 'SOW' && recipient.type !== 'LEAD') return NextResponse.json({ error: 'Select a saved lead for proposals and contracts.' }, { status: 400 });
  const content = input.action === 'atlas_create'
    ? createDocumentDraft(input.kind, input.prompt || '', recipient, user.organization, user.email)
    : input.action === 'simple_create'
      ? createSimpleDocumentDraft(input.kind, input.simpleDetails!, recipient, user.organization, user.email)
      : validate(input.kind, input.content);
  const validated = validate(input.kind, content);
  const documentNumber = input.kind === 'PROPOSAL' ? (validated as z.infer<typeof proposalSchema>).proposalNumber : (validated as z.infer<typeof legalDocumentSchema>).documentNumber;
  const signingToken = input.kind === 'PROPOSAL' ? null : newSigningToken();
  const signingTokenExpiresAt = signingToken ? new Date(Date.now() + 30 * 86_400_000) : null;
  const document = await prisma.generatedDocument.create({ data: {
    orgId: user.orgId, createdById: user.id, kind: input.kind, title: validated.title, documentNumber,
    recipientType: recipient.type, recipientId: recipient.id, recipientName: recipient.name, recipientEmail: recipient.email,
    prompt: input.prompt || (input.simpleDetails ? JSON.stringify(input.simpleDetails) : null), content: validated as unknown as Prisma.InputJsonValue,
    signingToken, signingTokenExpiresAt,
  } });

  if (input.action === 'atlas_create' || input.action === 'simple_create') {
    try {
      await sendDocument(document, user.organization, baseUrl);
      const sent = await prisma.generatedDocument.update({ where: { id: document.id }, data: { status: 'SENT', sentAt: new Date() } });
      return NextResponse.json({ document: sent, sent: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Email delivery failed.';
      return NextResponse.json({ document, sent: false, warning: message }, { status: 201 });
    }
  }
  return NextResponse.json({ document }, { status: 201 });
}

export async function DELETE(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isOrganizationAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Document is required.' }, { status: 400 });
  const signed = await prisma.generatedDocument.findFirst({ where: { id, orgId: user.orgId, OR: [{ recipientSignedAt: { not: null } }, { agencySignedAt: { not: null } }] }, select: { id: true } });
  if (signed) return NextResponse.json({ error: 'Signed documents are immutable and cannot be deleted.' }, { status: 409 });
  const result = await prisma.generatedDocument.deleteMany({ where: { id, orgId: user.orgId } });
  return result.count ? NextResponse.json({ success: true }) : NextResponse.json({ error: 'Document not found.' }, { status: 404 });
}
