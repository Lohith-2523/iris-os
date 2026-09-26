import 'server-only';

import { prisma } from '@/lib/db';
import { clientPortfolioValueForYear } from '@/lib/clients/portfolio-value';
import { serializeClientOnboardingInvite } from '@/lib/clients/onboarding-invite';
import { isOrganizationAdmin, userHasDeliveryWorkspace } from '@/lib/org';
import type { RequestSecurityContext } from '@/server/security/request-security-context';

export async function listWorkspaceClients(ctx: RequestSecurityContext) {
  const role = ctx.role.toLowerCase();
  const clients = await prisma.client.findMany({
    where: {
      orgId: ctx.orgId,
      ...(role === 'client' && ctx.clientId ? { id: ctx.clientId } : {}),
      ...(role === 'member'
        ? { projects: { some: { members: { some: { userId: ctx.userId } } } } }
        : {}),
    },
    include: {
      contacts: {
        select: { id: true, name: true, email: true, phone: true, role: true },
        orderBy: { createdAt: 'asc' },
      },
      projects: {
        select: {
          id: true,
          name: true,
          serviceLine: true,
          metaIntegrationEnabled: true,
          status: true,
          progress: true,
          startDate: true,
          endDate: true,
          paymentType: true,
          paymentAmount: true,
          paymentFrequency: true,
          paymentStartDate: true,
          members: {
            select: {
              user: { select: { id: true, name: true, email: true, avatarUrl: true } },
            },
          },
        },
      },
      invoices: {
        include: { project: { select: { id: true, name: true } } },
        orderBy: { issuedDate: 'desc' },
      },
      invites: {
        select: { token: true, email: true, used: true, expiresAt: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { name: 'asc' },
  });

  const portfolioYear = new Date().getUTCFullYear();
  return clients.map((client) => ({
    id: client.id,
    name: client.name,
    logoDataUrl: client.logoDataUrl,
    domain: client.domain || '',
    status: client.status,
    churnRiskScore: client.churnRiskScore,
    roiMetric: client.roiMetric,
    renewalDate: client.renewalDate?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) ?? null,
    upsellOpportunityValue: client.upsellOpportunityValue,
    agencyType: client.agencyType,
    businessModel: client.businessModel,
    legalEntityName: client.legalEntityName,
    billingAddressLine1: client.billingAddressLine1,
    billingAddressLine2: client.billingAddressLine2,
    billingCity: client.billingCity,
    billingState: client.billingState,
    billingPostalCode: client.billingPostalCode,
    billingCountry: client.billingCountry,
    gstNumber: client.gstNumber,
    adAccountId: client.adAccountId,
    metadata: client.metadata || null,
    contacts: client.contacts,
    onboardingInvite: serializeClientOnboardingInvite(client.invites[0], isOrganizationAdmin(ctx.user)),
    projects: client.projects.map((project) => ({
      ...project,
      members: project.members.map(({ user }) => user),
      startDate: project.startDate.toISOString(),
      endDate: project.endDate?.toISOString() || null,
      paymentStartDate: project.paymentStartDate?.toISOString() || null,
    })),
    invoices: client.invoices.map((invoice) => ({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      amount: invoice.amount,
      paidAmount: invoice.paidAmount,
      balanceDue: Math.max(0, invoice.amount - invoice.paidAmount),
      status: invoice.status,
      dueDate: invoice.dueDate?.toISOString() ?? null,
      issuedDate: invoice.issuedDate.toISOString(),
      deliveryStatus: invoice.deliveryStatus,
      project: invoice.project,
      downloadUrl: `/api/invoices/${invoice.id}/pdf`,
    })),
    contractValue: clientPortfolioValueForYear(client.projects, portfolioYear),
    portfolioYear,
  }));
}

export async function listWorkspaceTeam(ctx: RequestSecurityContext) {
  const users = await prisma.user.findMany({
    where: {
      orgId: ctx.orgId,
      role: { in: ['admin', 'member', 'sub_admin'] },
      accessRevokedAt: null,
    },
    include: {
      projectMembers: {
        where: { project: { status: { not: 'COMPLETED' } } },
        select: { id: true, project: { select: { name: true } } },
      },
      clientTasks: {
        where: { status: { not: 'COMPLETED' } },
        select: { id: true },
        take: 1,
      },
    },
    orderBy: { name: 'asc' },
  });
  const activeDeliverables = await prisma.deliverable.findMany({
    where: { orgId: ctx.orgId, submittedById: { in: users.map((user) => user.id) }, status: { not: 'APPROVED' } },
    select: { submittedById: true },
  });
  const activeDeliverableAuthors = new Set(activeDeliverables.map((deliverable) => deliverable.submittedById).filter(Boolean));

  return users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    accessPermissions: user.accessPermissions as string[] | null,
    handlesDeliverables: user.handlesDeliverables,
    deliveryWorkspace: userHasDeliveryWorkspace(user) || activeDeliverableAuthors.has(user.id),
    phone: user.phone || null,
    avatarUrl: user.avatarUrl || null,
    projects: user.projectMembers.map((membership) => membership.project.name).join(', '),
    status: '',
  }));
}
