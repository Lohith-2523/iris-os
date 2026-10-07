import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getOrganization, getRequestUser, isOrganizationAdmin } from '@/lib/org';
import {
  MetaAdAccountAssignmentError,
  resolveAssignableMetaAdAccountId,
} from '@/lib/meta-ad-accounts';
import { parseProjectCommercials } from '@/lib/projects/commercial';
import {
  assertIrisEmailConfigured,
  IrisEmailDeliveryError,
  sendIrisEmail,
} from '@/lib/email/iris-email';
import { clientOnboardingEmail } from '@/lib/email/iris-templates';
import {
  createAndSendProjectInvoice,
  createHistoricalProjectInvoices,
  InvoiceServiceError,
} from '@/lib/invoices/service';
import { publicAppUrl } from '@/lib/app-url';
import { entitlementsFor, planLimitMessage } from '@/lib/plan-entitlements';
import { clientHasMetaEnabledProject, isSelectedAgencyServiceLine } from '@/lib/agency-specializations';
import { normalizeRequiredPhone } from '@/lib/phone';
import { purgeClientData } from '@/server/domains/client-deletion-service';
import { createAuthenticationUserDeleter } from '@/server/domains/auth-user-deletion';
import { parseInitialProjectTasks } from '@/server/domains/initial-project-tasks';
import { validateClientLogoDataUrl } from '@/lib/client-logo';
import { normalizeProjectStageColor } from '@/lib/projects/stages';
import { validateWelcomeBackgroundDataUrl } from '@/lib/welcome-background';
import { resolveWorkspaceBannerPosition, resolveWorkspaceBannerZoom } from '@/lib/workspace-banner';
import { normalizeClientBrandColor, pickRandomClientBrandColor } from '@/lib/client-brand-color';

class ClientPlanLimitError extends Error {}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isOrganizationAdmin(user)) {
      return NextResponse.json({ error: 'Access Denied: Administrative clearance required.' }, { status: 403 });
    }

    const clientId = new URL(request.url).searchParams.get('clientId')?.trim();
    if (!clientId) {
      return NextResponse.json({ error: 'Missing clientId parameter' }, { status: 400 });
    }

    const body = await request.json().catch(() => null) as { deleteRelatedData?: unknown } | null;
    if (body?.deleteRelatedData !== true) {
      return NextResponse.json({ error: 'Confirm deletion of all related client data.' }, { status: 400 });
    }

    // Initialize the privileged auth client before changing database records so
    // missing server credentials cannot leave an active login after a purge.
    const deleteAuthenticationUsers = createAuthenticationUserDeleter();

    const clientUsers = await prisma.$transaction(
      (tx) => purgeClientData(tx, user.orgId, clientId),
      { maxWait: 10_000, timeout: 60_000 },
    );
    if (!clientUsers) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    await deleteAuthenticationUsers(
      clientUsers.map(({ authUserId }) => authUserId).filter((id): id is string => Boolean(id)),
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting client:', error);
    return NextResponse.json({ error: 'Unable to delete client' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json();
    const clientId = typeof body.clientId === 'string' ? body.clientId.trim() : '';
    const isAdmin = isOrganizationAdmin(user);
    const isLinkedClient = user.role.toLowerCase() === 'client' && user.clientId === clientId;
    if (!isAdmin && !isLinkedClient) {
      return NextResponse.json(
        { error: 'Access Denied: Client branding can only be changed by the linked client or a business administrator.' },
        { status: 403 },
      );
    }
    if (!clientId) {
      return NextResponse.json({ error: 'Missing clientId parameter' }, { status: 400 });
    }
    if (!isAdmin && Object.keys(body).some((key) => !['clientId', 'logoDataUrl', 'brandColor', 'workspaceBannerDataUrl', 'workspaceBannerPosition', 'workspaceBannerZoom'].includes(key))) {
      return NextResponse.json({ error: 'Client users may only update their workspace branding.' }, { status: 403 });
    }

    const hasLogoUpdate = Object.prototype.hasOwnProperty.call(body, 'logoDataUrl');
    const logoResult = hasLogoUpdate ? validateClientLogoDataUrl(body.logoDataUrl) : null;
    if (logoResult && 'error' in logoResult) {
      return NextResponse.json({ error: logoResult.error }, { status: 400 });
    }
    const hasBrandColorUpdate = Object.prototype.hasOwnProperty.call(body, 'brandColor');
    const brandColor = normalizeClientBrandColor(body.brandColor);
    if (hasBrandColorUpdate && !brandColor) {
      return NextResponse.json({ error: 'Client brand colour must be a six-digit hex colour.' }, { status: 400 });
    }
    const hasBannerUpdate = Object.prototype.hasOwnProperty.call(body, 'workspaceBannerDataUrl');
    const bannerResult = hasBannerUpdate ? validateWelcomeBackgroundDataUrl(body.workspaceBannerDataUrl) : null;
    if (bannerResult && 'error' in bannerResult) {
      return NextResponse.json({ error: bannerResult.error }, { status: 400 });
    }
    const hasBannerPositionUpdate = Object.prototype.hasOwnProperty.call(body, 'workspaceBannerPosition');
    const bannerPosition = hasBannerPositionUpdate ? resolveWorkspaceBannerPosition(body.workspaceBannerPosition) : null;
    const hasBannerZoomUpdate = Object.prototype.hasOwnProperty.call(body, 'workspaceBannerZoom');
    const bannerZoom = hasBannerZoomUpdate ? resolveWorkspaceBannerZoom(body.workspaceBannerZoom) : null;

    const existingClient = await prisma.client.findFirst({
      where: { id: clientId, orgId: user.orgId },
      select: { id: true, metadata: true, projects: { select: { metaIntegrationEnabled: true } } },
    });
    if (!existingClient) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const hasAdAccountUpdate = Object.prototype.hasOwnProperty.call(body, 'adAccountId');
    const adAccountId = hasAdAccountUpdate
      ? await resolveAssignableMetaAdAccountId(user.orgId, body.adAccountId)
      : undefined;
    if (hasAdAccountUpdate && adAccountId && !clientHasMetaEnabledProject(existingClient.projects)) {
      return NextResponse.json({ error: 'Enable Meta integration on at least one project before assigning a Meta ad account.' }, { status: 400 });
    }
    if (hasAdAccountUpdate && adAccountId) {
      const assignedClient = await prisma.client.findFirst({
        where: {
          orgId: user.orgId,
          adAccountId,
          id: { not: existingClient.id },
        },
        select: { name: true },
      });
      if (assignedClient) {
        return NextResponse.json(
          { error: `This Meta ad account is already assigned to ${assignedClient.name}.` },
          { status: 409 },
        );
      }
    }

    const updatedClient = await prisma.$transaction(async (tx) => {
      const client = await tx.client.update({
        where: { id: existingClient.id },
        data: {
          adAccountId: hasAdAccountUpdate ? adAccountId : undefined,
          logoDataUrl: logoResult ? logoResult.value : undefined,
          metadata: bannerResult || bannerPosition || bannerZoom !== null || hasBrandColorUpdate ? {
            ...(existingClient.metadata && typeof existingClient.metadata === 'object' && !Array.isArray(existingClient.metadata) ? existingClient.metadata : {}),
            ...(hasBrandColorUpdate ? { brandColor } : {}),
            ...(bannerResult ? { workspaceBannerDataUrl: bannerResult.value } : {}),
            ...(bannerPosition ? { workspaceBannerPosition: bannerPosition } : {}),
            ...(bannerZoom !== null ? { workspaceBannerZoom: bannerZoom } : {}),
          } : undefined,
          legalEntityName: typeof body.legalEntityName === 'string' ? body.legalEntityName.trim() || null : undefined,
          billingAddressLine1: typeof body.billingAddressLine1 === 'string' ? body.billingAddressLine1.trim() || null : undefined,
          billingAddressLine2: typeof body.billingAddressLine2 === 'string' ? body.billingAddressLine2.trim() || null : undefined,
          billingCity: typeof body.billingCity === 'string' ? body.billingCity.trim() || null : undefined,
          billingState: typeof body.billingState === 'string' ? body.billingState.trim() || null : undefined,
          billingPostalCode: typeof body.billingPostalCode === 'string' ? body.billingPostalCode.trim() || null : undefined,
          billingCountry: typeof body.billingCountry === 'string' ? body.billingCountry.trim() || null : undefined,
          gstNumber: typeof body.gstNumber === 'string' ? body.gstNumber.trim().toUpperCase() || null : undefined,
        },
        select: {
          id: true,
          logoDataUrl: true,
          metadata: true,
          adAccountId: true,
          legalEntityName: true,
          billingAddressLine1: true,
          billingAddressLine2: true,
          billingCity: true,
          billingState: true,
          billingPostalCode: true,
          billingCountry: true,
          gstNumber: true,
        },
      });
      if (hasAdAccountUpdate) {
        await tx.clientInvite.updateMany({
          where: { clientId: existingClient.id },
          data: { adAccountId },
        });
      }
      return client;
    });

    return NextResponse.json({ success: true, client: updatedClient });
  } catch (error) {
    if (error instanceof MetaAdAccountAssignmentError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Error updating client:', error);
    return NextResponse.json({ error: 'Unable to update the client.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      domain,
      status,
      churnRiskScore,
      roiMetric,
      upsellOpportunityValue,
      agencyType,
      businessModel,
      legalEntityName,
      billingAddressLine1,
      billingAddressLine2,
      billingCity,
      billingState,
      billingPostalCode,
      billingCountry,
      gstNumber,
      logoDataUrl,
      metadata,
      contact,
      sourceLeadId,
      adAccountId,
      initialProject,
    } = body;
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isOrganizationAdmin(user)) {
      return NextResponse.json({ error: 'Access Denied: Administrative clearance required.' }, { status: 403 });
    }

    const org = await getOrganization(request);
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    if (!name) {
      return NextResponse.json({ error: 'Missing client name parameter' }, { status: 400 });
    }

    const logoResult = validateClientLogoDataUrl(logoDataUrl);
    if ('error' in logoResult) {
      return NextResponse.json({ error: logoResult.error }, { status: 400 });
    }

    if (adAccountId) {
      return NextResponse.json({ error: 'Configure client integrations after the qualifying project has been created.' }, { status: 400 });
    }

    const validatedAdAccountId = await resolveAssignableMetaAdAccountId(org.id, adAccountId);
    if (validatedAdAccountId) {
      const assignedClient = await prisma.client.findFirst({
        where: { orgId: org.id, adAccountId: validatedAdAccountId },
        select: { name: true },
      });
      if (assignedClient) {
        return NextResponse.json(
          { error: `This Meta ad account is already assigned to ${assignedClient.name}.` },
          { status: 409 },
        );
      }
    }

    const sourceLead = sourceLeadId ? await prisma.agencyLead.findFirst({
      where: {
        id: String(sourceLeadId),
        orgId: org.id,
        status: { equals: 'closed', mode: 'insensitive' },
      },
      select: {
        id: true,
        convertedClient: { select: { id: true } },
      },
    }) : null;
    if (sourceLeadId && !sourceLead) {
      return NextResponse.json({ error: 'Select a valid closed lead from this workspace' }, { status: 400 });
    }
    if (sourceLead?.convertedClient) {
      return NextResponse.json({ error: 'This closed lead has already been converted to a client' }, { status: 409 });
    }

    if (initialProject && !initialProject.name?.trim()) {
      return NextResponse.json({ error: 'An initial project requires a project name' }, { status: 400 });
    }
    if (initialProject && !isSelectedAgencyServiceLine(initialProject.serviceLine, org.agencyTypes)) {
      return NextResponse.json({ error: 'Select an initial project specialization enabled in Agency Settings.' }, { status: 400 });
    }
    if (initialProject && !initialProject.startDate) {
      return NextResponse.json({ error: 'An initial project requires a start date' }, { status: 400 });
    }
    if (initialProject && Number.isNaN(new Date(initialProject.startDate).getTime())) {
      return NextResponse.json({ error: 'Initial project start date is invalid' }, { status: 400 });
    }

    const rawProjectBudget = initialProject?.budget;
    const projectBudget = rawProjectBudget === undefined || rawProjectBudget === null || rawProjectBudget === ''
      ? null
      : Number(rawProjectBudget);
    if (projectBudget !== null && !Number.isFinite(projectBudget)) {
      return NextResponse.json({ error: 'Initial project budget must be a number' }, { status: 400 });
    }
    const projectCommercials = parseProjectCommercials({
      paymentType: initialProject?.paymentType,
      paymentAmount: initialProject?.paymentAmount,
      paymentFrequency: initialProject?.paymentFrequency,
      paymentStartDate: initialProject?.paymentStartDate || initialProject?.startDate,
      paymentTerms: initialProject?.paymentTerms,
    });
    if (projectCommercials.error) {
      return NextResponse.json({ error: projectCommercials.error }, { status: 400 });
    }
    const legacyDeliverables = Array.isArray(initialProject?.deliverables)
      ? initialProject.deliverables.map((title: unknown) => ({ title, stagePosition: 0 }))
      : [];
    const initialTasksResult = parseInitialProjectTasks(initialProject?.tasks ?? legacyDeliverables);
    if (initialTasksResult.error) {
      return NextResponse.json({ error: initialTasksResult.error }, { status: 400 });
    }
    const initialTasks = initialTasksResult.tasks ?? [];
    assertIrisEmailConfigured();

    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    const normalizedContactPhone = normalizeRequiredPhone(contact?.phone);
    if (!normalizedContactPhone) return NextResponse.json({ error: 'Client contact phone with country code is required.' }, { status: 400 });
    const inviteEmail = contact?.email || `contact@${domain || 'example.com'}`;
    const inviteName = contact?.name || `${name} Contact`;
    const inviteUrl = new URL('/invite', publicAppUrl(request));
    inviteUrl.searchParams.set('token', token);

    // A client onboarding submission is one unit of work: an incomplete client
    // record must never be committed if its requested initial project fails.
    const result = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`client-capacity:${org.id}`}))`;
      const clientCount = await tx.client.count({ where: { orgId: org.id } });
      const clientLimit = entitlementsFor(org.plan).clientLimit;
      if (clientLimit !== null && clientCount >= clientLimit) {
        throw new ClientPlanLimitError(planLimitMessage('clients', clientLimit, org.plan));
      }
      if (initialProject) {
        const projectLimit = entitlementsFor(org.plan).projectLimit;
        if (projectLimit !== null) {
          const projectCount = await tx.project.count({ where: { orgId: org.id } });
          if (projectCount >= projectLimit) {
            throw new ClientPlanLimitError(planLimitMessage('projects', projectLimit, org.plan));
          }
        }
      }
      const existingClientMetadata = await tx.client.findMany({ where: { orgId: org.id }, select: { metadata: true } });
      const onboardingBrandColor = pickRandomClientBrandColor(existingClientMetadata.map((client) => {
        const clientMetadata = client.metadata && typeof client.metadata === 'object' && !Array.isArray(client.metadata)
          ? client.metadata as { brandColor?: unknown }
          : {};
        return clientMetadata.brandColor;
      }));
      const onboardingMetadata = metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? metadata : {};
      const newClient = await tx.client.create({
        data: {
          name,
          logoDataUrl: logoResult.value,
          domain: domain || null,
          status: status || 'ACTIVE',
          churnRiskScore: churnRiskScore !== undefined ? churnRiskScore : 0,
          roiMetric: roiMetric !== undefined ? roiMetric : 0.0,
          upsellOpportunityValue: upsellOpportunityValue !== undefined ? upsellOpportunityValue : 0.0,
          agencyType: agencyType || null,
          businessModel: businessModel || null,
          legalEntityName: typeof legalEntityName === 'string' ? legalEntityName.trim() || null : null,
          billingAddressLine1: typeof billingAddressLine1 === 'string' ? billingAddressLine1.trim() || null : null,
          billingAddressLine2: typeof billingAddressLine2 === 'string' ? billingAddressLine2.trim() || null : null,
          billingCity: typeof billingCity === 'string' ? billingCity.trim() || null : null,
          billingState: typeof billingState === 'string' ? billingState.trim() || null : null,
          billingPostalCode: typeof billingPostalCode === 'string' ? billingPostalCode.trim() || null : null,
          billingCountry: typeof billingCountry === 'string' ? billingCountry.trim() || null : null,
          gstNumber: typeof gstNumber === 'string' ? gstNumber.trim().toUpperCase() || null : null,
          metadata: { ...onboardingMetadata, brandColor: onboardingBrandColor },
          adAccountId: validatedAdAccountId,
          sourceLeadId: sourceLead?.id || null,
          orgId: org.id,
          contacts: contact ? {
            create: {
              name: contact.name || 'Primary Client Contact',
              email: contact.email || 'contact@example.com',
              phone: normalizedContactPhone,
              role: contact.role || 'Primary Client Contact',
            }
          } : undefined
        },
        include: { contacts: true },
      });

      await tx.clientInvite.create({
        data: {
          email: inviteEmail,
          name: inviteName,
          clientId: newClient.id,
          adAccountId: validatedAdAccountId,
          token,
          expiresAt,
        }
      });

      let project: { id: string; name: string } | null = null;
      if (initialProject) {
        const projectStart = initialProject.startDate ? new Date(initialProject.startDate) : new Date();
        const projectEnd = initialProject.endDate ? new Date(initialProject.endDate) : null;
        project = await tx.project.create({
          data: {
            name: initialProject.name.trim(),
            status: initialProject.status || 'NOT_STARTED',
            startDate: projectStart,
            endDate: projectEnd,
            progress: 0,
            riskLevel: initialProject.riskLevel || 'LOW',
            timeline: initialProject.timeline || null,
            serviceLine: initialProject.serviceLine || null,
            budget: projectBudget,
            ...projectCommercials.data,
          autoGenerateInvoice: Boolean(initialProject.autoGenerateInvoice),
          metaIntegrationEnabled: Boolean(initialProject.metaIntegrationEnabled),
            orgId: org.id,
            clientId: newClient.id,
          }
        });

        const requestedMemberIds: string[] = Array.isArray(initialProject.memberIds)
          ? Array.from(new Set((initialProject.memberIds as unknown[]).filter((id): id is string => typeof id === 'string')))
          : [];
        let assignedMemberIds: string[] = [];
        if (requestedMemberIds.length > 0) {
          const organizationMembers = await tx.user.findMany({
            where: { id: { in: requestedMemberIds }, orgId: org.id },
            select: { id: true },
          });
          if (organizationMembers.length > 0) {
            const validMemberIds = new Set(organizationMembers.map(({ id }) => id));
            assignedMemberIds = requestedMemberIds.filter((id) => validMemberIds.has(id));
            await tx.projectMember.createMany({
              data: organizationMembers.map(({ id }) => ({ projectId: project!.id, userId: id })),
              skipDuplicates: true,
            });
          }
        }

        const stageItems = Array.isArray(initialProject.stages) ? initialProject.stages.slice(0, 8) : [];
        const validStages = stageItems.filter((stage: unknown) =>
          typeof stage === 'string' ? stage.trim().length > 0 : Boolean((stage as { name?: string })?.name?.trim())
        );
        const createdStages = [] as { id: string }[];
        if (validStages.length > 0) {
          for (const [position, item] of validStages.entries()) {
            const stage = typeof item === 'string' ? { name: item } : item as { name: string; color?: string };
            const createdStage = await tx.projectStage.create({
              data: {
                name: stage.name.trim(),
                color: normalizeProjectStageColor(stage.color, position),
                position,
                projectId: project!.id,
              }
            });
            createdStages.push(createdStage);
          }
        }

        if (initialTasks.length > 0) {
          await tx.clientTask.createMany({
            data: initialTasks.map((task) => ({
              title: task.title,
              description: `Initial task for project: ${project!.name}`,
              status: 'TODO',
              progress: 0,
              clientId: newClient.id,
              projectId: project!.id,
              stageId: createdStages[task.stagePosition]?.id ?? createdStages[0]?.id ?? null,
              assignedToId: assignedMemberIds[0] || null,
              deadline: task.deadline,
            })),
          });
        }
      }

      return { newClient, project };
    });

    const email = clientOnboardingEmail({
      recipientName: inviteName,
      organizationName: org.name,
      inviteUrl: inviteUrl.toString(),
      expiresAt,
    });
    try {
      await sendIrisEmail({
        to: [inviteEmail],
        subject: email.subject,
        html: email.html,
        text: email.text,
        idempotencyKey: `client-invite-${token}`,
        tags: [{ name: 'category', value: 'client_onboarding' }],
      });
    } catch (error) {
      if (error instanceof IrisEmailDeliveryError) {
        return NextResponse.json({
          error: error.message,
          clientCreated: true,
          inviteUrl: inviteUrl.toString(),
        }, { status: error.status });
      }
      throw error;
    }

    let invoice = null;
    let invoiceWarning: string | null = null;
    if (result.project && initialProject) {
      try {
        const invoiceDate = projectCommercials.data?.paymentStartDate;
        const isHistoricalRetainer = projectCommercials.data?.paymentType === 'RETAINER'
          && invoiceDate
          && invoiceDate < new Date(new Date().setHours(0, 0, 0, 0));
        invoice = isHistoricalRetainer
          ? await createHistoricalProjectInvoices({ projectId: result.project.id, orgId: org.id, baseUrl: publicAppUrl(request) })
          : await createAndSendProjectInvoice({
              projectId: result.project.id,
              orgId: org.id,
              baseUrl: publicAppUrl(request),
              automationKey: `project-initialization:${result.project.id}`,
              source: 'PROJECT_INITIALIZATION',
              issuedDate: invoiceDate || undefined,
              sendEmail: Boolean(initialProject.autoGenerateInvoice),
            });
      } catch (error) {
        invoiceWarning = error instanceof InvoiceServiceError
          ? error.message
          : 'The client and project were created, but the dated invoice could not be generated.';
      }
    }

    return NextResponse.json({
      success: true,
      client: result.newClient,
      project: result.project,
      invoice,
      invoiceWarning,
      emailSent: true,
      inviteUrl: inviteUrl.toString(),
    });
  } catch (error: any) {
    if (error instanceof ClientPlanLimitError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof MetaAdAccountAssignmentError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof IrisEmailDeliveryError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error onboarding client:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
