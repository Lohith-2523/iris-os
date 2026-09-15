import 'server-only';

import { createHash, randomBytes } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { legalDocumentSchema, type LegalDocumentInput, type SowInput } from '@/lib/legal-documents/types';
import { entitlementsFor } from '@/lib/plan-entitlements';

type SignatureRecord = {
  content: Prisma.JsonValue;
  recipientSignerName: string | null;
  recipientSignedAt: Date | null;
  agencySignerName: string | null;
  agencySignedAt: Date | null;
  fullySignedAt: Date | null;
  signedContentHash: string | null;
};

export function recipientSignatureNotification(document: { kind: string; title: string; documentNumber: string; recipientSignerName: string }) {
  const kindLabel = document.kind === 'SOW' ? 'statement of work' : 'contract';
  return {
    type: 'APPROVAL' as const,
    title: `Client signed ${kindLabel}`,
    body: `${document.recipientSignerName} signed ${document.title} (${document.documentNumber}). Countersign it to finalize the document.`,
    href: '/documents',
    actionLabel: 'Countersign now',
  };
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, canonical(child)]));
  return value;
}

export function newSigningToken() {
  return randomBytes(32).toString('hex');
}

export function signingContentHash(content: Prisma.JsonValue) {
  return createHash('sha256').update(JSON.stringify(canonical(content))).digest('hex');
}

export function signatureRequestHash(value: string) {
  const secret = process.env.DOCUMENT_SIGNING_AUDIT_SECRET || process.env.AUTH_SECRET || 'iris-os-signing-audit';
  return createHash('sha256').update(`${secret}:${value}`).digest('hex');
}

export function contentWithSignatureAudit(record: SignatureRecord): LegalDocumentInput {
  const parsed = legalDocumentSchema.parse(record.content);
  return legalDocumentSchema.parse({
    ...parsed,
    signatureAudit: {
      recipientName: record.recipientSignerName || undefined,
      recipientSignedAt: record.recipientSignedAt?.toISOString(),
      agencyName: record.agencySignerName || undefined,
      agencySignedAt: record.agencySignedAt?.toISOString(),
      executedAt: record.fullySignedAt?.toISOString(),
      contentHash: record.signedContentHash || undefined,
    },
  });
}

function validDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function sowHasProjectDetails(sow: SowInput) {
  return sow.projectName.trim().length >= 2
    && sow.scope.trim().length >= 2
    && Boolean(validDate(sow.startDate))
    && Boolean(validDate(sow.endDate))
    && sow.deliverables.some(item => item.name.trim().length >= 2 && item.scope.trim().length >= 2);
}

export async function runSignedDocumentAutomation(documentId: string) {
  const eligibility = await prisma.generatedDocument.findUnique({
    where: { id: documentId },
    select: { organization: { select: { plan: true } } },
  });
  if (!eligibility || !entitlementsFor(eligibility.organization.plan).signedDocumentAutomation) return;

  const claimed = await prisma.generatedDocument.updateMany({
    where: { id: documentId, fullySignedAt: { not: null }, OR: [{ automationStatus: null }, { automationStatus: { in: ['FAILED', 'NEEDS_REVIEW'] } }] },
    data: { automationStatus: 'PROCESSING', automationError: null },
  });
  if (!claimed.count) return;

  try {
    await prisma.$transaction(async tx => {
      const document = await tx.generatedDocument.findUnique({ where: { id: documentId } });
      if (!document?.fullySignedAt || !document.recipientSignedAt || !document.agencySignedAt || !['CONTRACT', 'SOW'].includes(document.kind)) throw new Error('The document is not fully executed.');
      const content = legalDocumentSchema.parse(document.content);

      let client = document.onboardedClientId ? await tx.client.findFirst({ where: { id: document.onboardedClientId, orgId: document.orgId } }) : null;
      const lead = document.recipientType === 'LEAD' ? await tx.agencyLead.findFirst({ where: { id: document.recipientId, orgId: document.orgId } }) : null;
      if (!client && lead) client = await tx.client.findFirst({ where: { sourceLeadId: lead.id, orgId: document.orgId } });
      if (!client && document.recipientType === 'CLIENT') client = await tx.client.findFirst({ where: { id: document.recipientId, orgId: document.orgId } });

      if (!client && lead) {
        client = await tx.client.create({
          data: {
            name: content.clientLegalName || content.clientName || lead.fullName,
            legalEntityName: content.clientLegalName || null,
            status: 'ACTIVE', churnRiskScore: 0, roiMetric: 0, upsellOpportunityValue: 0,
            billingAddressLine1: content.clientAddress || null,
            metadata: { atlasAutoOnboarded: true, signedDocumentId: document.id, signedDocumentNumber: document.documentNumber },
            sourceLeadId: lead.id, orgId: document.orgId,
            contacts: { create: { name: content.clientName || lead.fullName, email: content.clientEmail || lead.email, phone: content.clientPhone || lead.phone || null, role: 'Primary Client Contact' } },
          },
        });
        await tx.agencyLead.update({ where: { id: lead.id }, data: { status: 'closed', activity: { atlasAutoOnboardedAt: new Date().toISOString(), signedDocumentId: document.id } } });
      }
      if (!client) throw new Error('Atlas could not resolve a lead or client from the signed document.');

      let projectId = document.onboardedProjectId;
      let automationStatus = 'COMPLETED';
      let automationError: string | null = null;
      if (content.kind === 'SOW' && !projectId) {
        if (sowHasProjectDetails(content)) {
          const startDate = validDate(content.startDate)!;
          const endDate = validDate(content.endDate)!;
          const project = await tx.project.create({
            data: {
              name: content.projectName, status: 'NOT_STARTED', startDate, endDate, progress: 0, riskLevel: 'LOW',
              timeline: `${content.startDate} to ${content.endDate}`, serviceLine: content.engagementType || null,
              paymentType: 'ONE_TIME', paymentAmount: content.fee > 0 ? content.fee : null, paymentStartDate: startDate,
              paymentTerms: content.paymentTerms, orgId: document.orgId, clientId: client.id,
            },
          });
          projectId = project.id;
          const stage = await tx.projectStage.create({ data: { name: 'Delivery', position: 0, startDate, endDate, projectId: project.id } });
          await tx.clientTask.createMany({ data: content.deliverables.map(item => ({ title: item.name, description: item.scope, status: 'TODO', progress: 0, clientId: client!.id, projectId: project.id, stageId: stage.id })) });
        } else {
          automationStatus = 'NEEDS_REVIEW';
          automationError = 'The client was onboarded, but the SOW needs a project name, dates, scope, and at least one complete deliverable before Atlas can create the project.';
        }
      }

      await tx.generatedDocument.update({ where: { id: document.id }, data: { onboardedClientId: client.id, onboardedProjectId: projectId, automationStatus, automationError } });
      const admins = await tx.user.findMany({ where: { orgId: document.orgId, role: { equals: 'admin', mode: 'insensitive' } }, select: { id: true } });
      if (admins.length) await tx.notification.createMany({ data: admins.map(admin => ({ orgId: document.orgId, userId: admin.id, type: automationStatus === 'COMPLETED' ? 'UPDATE' : 'ISSUE', title: automationStatus === 'COMPLETED' ? 'Atlas onboarding completed' : 'Atlas onboarding needs review', body: automationError || `${client!.name} was onboarded${projectId ? ' and its signed SOW was converted into a project' : ''}.`, href: projectId ? '/projects' : '/clients', actionLabel: projectId ? 'View project' : 'View client' })) });
    }, { timeout: 10_000 });
  } catch (error) {
    await prisma.generatedDocument.updateMany({ where: { id: documentId }, data: { automationStatus: 'FAILED', automationError: error instanceof Error ? error.message.slice(0, 1000) : 'Atlas onboarding failed.' } });
  }
}
