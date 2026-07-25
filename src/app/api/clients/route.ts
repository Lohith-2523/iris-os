import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getOrganization, getRequestUser, isOrganizationAdmin } from '@/lib/org';

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      domain,
      status,
      healthScore,
      healthStatus,
      churnRiskScore,
      roiMetric,
      upsellOpportunityValue,
      agencyType,
      businessModel,
      metadata,
      contact,
      sourceLeadId,
      adAccountId,
      initialProject,
      initialRetainer,
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

    const rawProjectBudget = initialProject?.budget;
    const projectBudget = rawProjectBudget === undefined || rawProjectBudget === null || rawProjectBudget === ''
      ? null
      : Number(rawProjectBudget);
    if (projectBudget !== null && !Number.isFinite(projectBudget)) {
      return NextResponse.json({ error: 'Initial project budget must be a number' }, { status: 400 });
    }
    const retainerAmount = initialRetainer ? Number(initialRetainer.amount) : null;
    const retainerStartDate = initialRetainer ? new Date(initialRetainer.startDate) : null;
    if (initialRetainer && (
      !Number.isFinite(retainerAmount) ||
      Number(retainerAmount) <= 0 ||
      !retainerStartDate ||
      Number.isNaN(retainerStartDate.getTime())
    )) {
      return NextResponse.json({ error: 'A positive retainer amount and valid start date are required' }, { status: 400 });
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    const inviteEmail = contact?.email || `contact@${domain || 'example.com'}`;
    const inviteName = contact?.name || `${name} Contact`;

    // A client onboarding submission is one unit of work: an incomplete client
    // record must never be committed if its requested initial project fails.
    const result = await prisma.$transaction(async (tx) => {
      const newClient = await tx.client.create({
        data: {
          name,
          domain: domain || null,
          status: status || 'ACTIVE',
          healthScore: healthScore !== undefined ? healthScore : 100,
          healthStatus: healthStatus || 'EXCELLENT',
          churnRiskScore: churnRiskScore !== undefined ? churnRiskScore : 0,
          roiMetric: roiMetric !== undefined ? roiMetric : 0.0,
          upsellOpportunityValue: upsellOpportunityValue !== undefined ? upsellOpportunityValue : 0.0,
          agencyType: agencyType || null,
          businessModel: businessModel || null,
          metadata: metadata || {},
          adAccountId: adAccountId || null,
          sourceLeadId: sourceLead?.id || null,
          orgId: org.id,
          contacts: contact ? {
            create: {
              name: contact.name || 'Primary Client Contact',
              email: contact.email || 'contact@example.com',
              phone: contact.phone || null,
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
          adAccountId: adAccountId || null,
          token,
          expiresAt,
        }
      });

      let retainer = null;
      if (initialRetainer && retainerAmount && retainerStartDate) {
        retainer = await tx.recurringRetainer.create({
          data: {
            name: String(initialRetainer.name || `${name} Monthly Retainer`).trim(),
            amount: retainerAmount,
            frequency: 'monthly',
            startDate: retainerStartDate,
            clientId: newClient.id,
            orgId: org.id,
          },
        });
      }

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
        const createdStages = [] as { id: string }[];
        if (validStages.length > 0) {
          const fallbackEnd = new Date(projectStart.getTime() + 90 * 24 * 60 * 60 * 1000);
          const scheduleEnd = projectEnd || fallbackEnd;
          const msPerStage = (scheduleEnd.getTime() - projectStart.getTime()) / validStages.length;
          for (const [position, item] of validStages.entries()) {
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

      return { newClient, project, retainer };
    });

    // Simulate sending welcome email in console logs
    console.log('\n==================================================');
    console.log(`✉️ WELCOME EMAIL SIMULATED FOR CLIENT: ${name}`);
    console.log('SUBJECT: Welcome to Iris OS - Set Up Your Client Account');
    console.log('BODY:');
    console.log('This invite token will expire in 7 days.');
    console.log('Best regards,\nIris OS Automation Engine');
    console.log('==================================================\n');

    return NextResponse.json({
      success: true,
      client: result.newClient,
      project: result.project,
      retainer: result.retainer,
      inviteUrl: `/invite?token=${token}`
    });
  } catch (error: any) {
    console.error('Error onboarding client:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
