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
  InvoiceServiceError,
} from '@/lib/invoices/service';
import { publicAppUrl } from '@/lib/app-url';
import { entitlementsFor, planLimitMessage } from '@/lib/plan-entitlements';
import { clientHasMetaEnabledProject, isSelectedAgencyServiceLine } from '@/lib/agency-specializations';
import { normalizeRequiredPhone } from '@/lib/phone';

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

    // Scope deletion to the active organization. Database referential actions
    // remove related client-owned records atomically with the client record.
    const result = await prisma.client.deleteMany({
      where: { id: clientId, orgId: user.orgId },
    });
    if (result.count === 0) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

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
    if (!isOrganizationAdmin(user)) {
      return NextResponse.json(
        { error: 'Access Denied: Administrative clearance required.' },
        { status: 403 },
      );
    }

    const body = await request.json();
    const clientId = typeof body.clientId === 'string' ? body.clientId.trim() : '';
    if (!clientId) {
      return NextResponse.json({ error: 'Missing clientId parameter' }, { status: 400 });
    }

    const existingClient = await prisma.client.findFirst({
      where: { id: clientId, orgId: user.orgId },
      select: { id: true, projects: { select: { serviceLine: true } } },
    });
    if (!existingClient) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const hasAdAccountUpdate = Object.prototype.hasOwnProperty.call(body, 'adAccountId');
    const adAccountId = hasAdAccountUpdate
      ? await resolveAssignableMetaAdAccountId(user.orgId, body.adAccountId)
      : undefined;
    if (hasAdAccountUpdate && adAccountId && !clientHasMetaEnabledProject(existingClient.projects)) {
      return NextResponse.json({ error: 'Client integrations become available after a Digital Marketing, Social Media Management, or Paid Advertising project has been created.' }, { status: 400 });
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
    console.error('Error assigning client Meta ad account:', error);
    return NextResponse.json({ error: 'Unable to update the client Meta ad account.' }, { status: 500 });
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
      return NextResponse.json({ error: 'Select an initial project service line enabled in Agency Settings.' }, { status: 400 });
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
      if (clientCount >= clientLimit) {
        throw new ClientPlanLimitError(planLimitMessage('clients', clientLimit, org.plan));
      }
      const newClient = await tx.client.create({
        data: {
          name,
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
          metadata: metadata || {},
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
            orgId: org.id,
            clientId: newClient.id,
          }
        });

        const requestedMemberIds: string[] = Array.isArray(initialProject.memberIds)
          ? Array.from(new Set((initialProject.memberIds as unknown[]).filter((id): id is string => typeof id === 'string')))
          : [];
        if (requestedMemberIds.length > 0) {
          const organizationMembers = await tx.user.findMany({
            where: { id: { in: requestedMemberIds }, orgId: org.id },
            select: { id: true },
          });
          if (organizationMembers.length > 0) {
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
        const schedulableStages = projectEnd
          ? validStages
          : validStages.filter((stage: unknown) => (
              typeof stage === 'object'
              && Boolean((stage as { startDate?: string }).startDate)
              && Boolean((stage as { endDate?: string }).endDate)
            ));
        const createdStages = [] as { id: string }[];
        if (schedulableStages.length > 0) {
          const scheduleEnd = projectEnd || projectStart;
          const msPerStage = (scheduleEnd.getTime() - projectStart.getTime()) / schedulableStages.length;
          for (const [position, item] of schedulableStages.entries()) {
            const stage = typeof item === 'string' ? { name: item } : item as { name: string; startDate?: string; endDate?: string };
            const createdStage = await tx.projectStage.create({
              data: {
                name: stage.name.trim(),
                position,
                startDate: stage.startDate ? new Date(stage.startDate) : new Date(projectStart.getTime() + position * msPerStage),
                endDate: stage.endDate ? new Date(stage.endDate) : new Date(projectStart.getTime() + (position + 1) * msPerStage),
                projectId: project!.id,
              }
            });
            createdStages.push(createdStage);
          }
        }

        const deliverables = Array.isArray(initialProject.deliverables)
          ? initialProject.deliverables.filter((item: unknown) => typeof item === 'string' && item.trim().length > 0)
          : [];
        if (deliverables.length > 0) {
          await tx.clientTask.createMany({
            data: deliverables.map((title: string) => ({
              title: title.trim(),
              description: `Initial deliverable for project: ${project!.name}`,
              status: 'TODO',
              progress: 0,
              clientId: newClient.id,
              projectId: project!.id,
              stageId: createdStages[0]?.id ?? null,
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
        invoice = await createAndSendProjectInvoice({
          projectId: result.project.id,
          orgId: org.id,
          baseUrl: publicAppUrl(request),
          automationKey: `project-initialization:${result.project.id}`,
          source: 'PROJECT_INITIALIZATION',
          issuedDate: projectCommercials.data?.paymentStartDate || undefined,
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
