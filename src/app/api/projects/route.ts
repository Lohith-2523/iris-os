import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getRequestUser, isOrganizationAdmin } from '@/lib/org';
import { parseProjectCommercials } from '@/lib/projects/commercial';
import {
  createAndSendProjectInvoice,
  createHistoricalProjectInvoices,
  InvoiceServiceError,
} from '@/lib/invoices/service';
import { publicAppUrl } from '@/lib/app-url';
import { isSelectedAgencyServiceLine } from '@/lib/agency-specializations';
import { cursorHeaders, readCursorPage } from '@/lib/cursor-pagination';
import { getRequestSecurityContext } from '@/server/security/request-security-context';
import { listProjects } from '@/server/domains/project-service';
import { entitlementsFor, planLimitMessage } from '@/lib/plan-entitlements';
import { parseInitialProjectTasks } from '@/server/domains/initial-project-tasks';
import { normalizeProjectStageColor } from '@/lib/projects/stages';

export async function GET(request: NextRequest) {
  try {
    const ctx = await getRequestSecurityContext();
    if (!ctx) {
      return NextResponse.json([]);
    }
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const pageRequest = readCursorPage(request);
    const page = await listProjects(ctx, pageRequest, clientId);
    return NextResponse.json(page.items, { headers: cursorHeaders(page, pageRequest.limit) });
  } catch (error: any) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Oops! Something went wrong. Please try again.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: 'User context required' }, { status: 401 });
    }
    if (!isOrganizationAdmin(user)) return NextResponse.json({ error: 'Oops! You do not have enough permissions.' }, { status: 403 });

    const body = await request.json();
    const {
      name,
      startDate,
      endDate,
      status,
      riskLevel,
      timeline,
      serviceLine,
      budget,
      paymentType,
      paymentAmount,
      paymentFrequency,
      paymentStartDate,
      paymentTerms,
      autoGenerateInvoice,
      metaIntegrationEnabled,
      clientId,
      memberIds, // array of User IDs
      deliverables, // legacy array of strings for initial tasks
      tasks,
      stages // array of stage names (strings) or objects
    } = body;

    if (!name || !clientId) {
      return NextResponse.json({ error: 'Missing name or clientId' }, { status: 400 });
    }
    if (!isSelectedAgencyServiceLine(serviceLine, user.organization.agencyTypes)) {
      return NextResponse.json({ error: 'Select a project specialization enabled in Agency Settings.' }, { status: 400 });
    }

    const commercials = parseProjectCommercials({
      paymentType,
      paymentAmount,
      paymentFrequency,
      paymentStartDate: paymentStartDate || startDate,
      paymentTerms,
    });
    if (commercials.error) {
      return NextResponse.json({ error: commercials.error }, { status: 400 });
    }
    const legacyDeliverables = Array.isArray(deliverables)
      ? deliverables.map((title: unknown) => ({ title, stagePosition: 0 }))
      : [];
    const initialTasksResult = parseInitialProjectTasks(tasks ?? legacyDeliverables);
    if (initialTasksResult.error) return NextResponse.json({ error: initialTasksResult.error }, { status: 400 });
    const initialTasks = initialTasksResult.tasks ?? [];

    // Resolve organization ID from the client
    const client = await prisma.client.findUnique({
      where: { id: clientId }
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    if (client.orgId !== user.orgId || (user.role.toLowerCase() === 'client' && user.clientId !== client.id)) {
      return NextResponse.json({ error: 'Oops! You do not have enough permissions for this project.' }, { status: 403 });
    }

    const orgId = client.orgId;

    const projectLimit = entitlementsFor(user.organization.plan).projectLimit;
    if (projectLimit !== null) {
      const projectCount = await prisma.project.count({ where: { orgId } });
      if (projectCount >= projectLimit) {
        return NextResponse.json({ error: planLimitMessage('projects', projectLimit, user.organization.plan) }, { status: 409 });
      }
    }

    // Create the project
    const newProject = await prisma.project.create({
      data: {
        name,
        status: status || 'NOT_STARTED',
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
        progress: 0,
        riskLevel: riskLevel || 'LOW',
        timeline: timeline || null,
        serviceLine: serviceLine || null,
        budget: budget !== undefined && budget !== '' ? parseFloat(budget) : null,
        ...commercials.data,
        autoGenerateInvoice: Boolean(autoGenerateInvoice),
        metaIntegrationEnabled: Boolean(metaIntegrationEnabled),
        orgId,
        clientId,
      }
    });

    // Create project members and retain the first selected specialist as the
    // default assignee for every task initialized with this project.
    const assignedMemberIds: string[] = [];
    if (memberIds && Array.isArray(memberIds)) {
      for (const userId of memberIds) {
        const member = await prisma.user.findUnique({ where: { id: userId } });
        if (!member || member.orgId !== orgId) continue;
        assignedMemberIds.push(member.id);
        await prisma.projectMember.create({
          data: {
            projectId: newProject.id,
            userId,
          }
        });
      }
    }

    // Calculate dates and create stages (max 8)
    const createdStages: any[] = [];
    if (stages && Array.isArray(stages)) {
      const validStages = stages.slice(0, 8);
      for (let i = 0; i < validStages.length; i++) {
        const stageItem = validStages[i];
        const sName = typeof stageItem === 'string' ? stageItem : stageItem.name;
        const color = normalizeProjectStageColor(typeof stageItem === 'object' ? stageItem.color : undefined, i);

        const newStage = await prisma.projectStage.create({
          data: {
            name: sName,
            color,
            position: i,
            projectId: newProject.id
          }
        });
        createdStages.push(newStage);
      }
    }

    if (initialTasks.length > 0) {
      for (const task of initialTasks) {
        await prisma.clientTask.create({
          data: {
            title: task.title,
            description: `Task for project: ${name}`,
            status: 'TODO',
            progress: 0,
            clientId,
            projectId: newProject.id,
            stageId: createdStages[task.stagePosition]?.id ?? createdStages[0]?.id ?? null,
            assignedToId: assignedMemberIds[0] || null,
            deadline: task.deadline,
          }
        });
      }
    }

    // Return the created project with includes
    const projectWithRelations = await prisma.project.findUnique({
      where: { id: newProject.id },
      include: {
        client: true,
        members: {
          include: {
            user: true,
          }
        },
        tasks: true,
        milestones: true,
        stages: {
          orderBy: { position: 'asc' }
        }
      }
    });

    let invoice = null;
    let invoiceWarning: string | null = null;
    {
      try {
        const isHistoricalRetainer = newProject.paymentType === 'RETAINER'
          && newProject.paymentStartDate
          && newProject.paymentStartDate < new Date(new Date().setHours(0, 0, 0, 0));
        invoice = isHistoricalRetainer
          ? await createHistoricalProjectInvoices({ projectId: newProject.id, orgId, baseUrl: publicAppUrl(request) })
          : await createAndSendProjectInvoice({
              projectId: newProject.id,
              orgId,
              baseUrl: publicAppUrl(request),
              automationKey: `project-initialization:${newProject.id}`,
              source: 'PROJECT_INITIALIZATION',
              issuedDate: newProject.paymentStartDate || undefined,
              sendEmail: newProject.autoGenerateInvoice,
            });
      } catch (error) {
        invoiceWarning = error instanceof InvoiceServiceError
          ? error.message
          : 'The project was created, but its dated invoice could not be generated.';
      }
    }

    return NextResponse.json({
      success: true,
      project: projectWithRelations,
      invoice,
      invoiceWarning,
    });
  } catch (error: any) {
    console.error('Error creating project:', error);
    return NextResponse.json({ error: 'Oops! Something went wrong. Please try again.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: 'User context required' }, { status: 401 });
    }
    if (!isOrganizationAdmin(user)) return NextResponse.json({ error: 'Oops! You do not have enough permissions.' }, { status: 403 });

    const body = await request.json();
    const {
      projectId,
      name,
      startDate,
      endDate,
      status,
      riskLevel,
      timeline,
      serviceLine,
      budget,
      paymentType,
      paymentAmount,
      paymentFrequency,
      paymentStartDate,
      paymentTerms,
      autoGenerateInvoice,
      metaIntegrationEnabled,
      memberIds,
      stages // Array<{ id?: string, name: string, color?: string }>
    } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
    }
    if (serviceLine !== undefined && !isSelectedAgencyServiceLine(serviceLine, user.organization.agencyTypes)) {
      return NextResponse.json({ error: 'Select a project specialization enabled in Agency Settings.' }, { status: 400 });
    }

    const commercials = parseProjectCommercials({
      paymentType,
      paymentAmount,
      paymentFrequency,
      paymentStartDate,
      paymentTerms,
    }, { partial: true });
    if (commercials.error) {
      return NextResponse.json({ error: commercials.error }, { status: 400 });
    }

    const currentProject = await prisma.project.findUnique({
      where: { id: projectId },
      include: { stages: true }
    });

    if (!currentProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (currentProject.orgId !== user.orgId || (user.role.toLowerCase() === 'client' && user.clientId !== currentProject.clientId)) {
      return NextResponse.json({ error: 'Oops! You do not have enough permissions for this project.' }, { status: 403 });
    }

    // 1. Update project basic commercial info
    await prisma.project.update({
      where: { id: projectId },
      data: {
        name: name !== undefined ? name : undefined,
        status: status !== undefined ? status : undefined,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate !== undefined ? (endDate ? new Date(endDate) : null) : undefined,
        riskLevel: riskLevel !== undefined ? riskLevel : undefined,
        timeline: timeline !== undefined ? timeline : undefined,
        serviceLine: serviceLine !== undefined ? serviceLine : undefined,
        budget: budget !== undefined ? (budget === '' || budget === null ? null : parseFloat(budget)) : undefined,
        ...commercials.data,
        autoGenerateInvoice: autoGenerateInvoice !== undefined ? Boolean(autoGenerateInvoice) : undefined,
        metaIntegrationEnabled: metaIntegrationEnabled !== undefined ? Boolean(metaIntegrationEnabled) : undefined,
      }
    });

    // 2. Sync Members
    if (memberIds && Array.isArray(memberIds)) {
      await prisma.projectMember.deleteMany({
        where: { projectId }
      });
      for (const userId of memberIds) {
        const member = await prisma.user.findUnique({ where: { id: userId } });
        if (!member || member.orgId !== currentProject.orgId) continue;
        await prisma.projectMember.create({
          data: { projectId, userId }
        });
      }
    }

    // 3. Sync Stages (Max 8 stages)
    if (stages && Array.isArray(stages)) {
      const validStages = stages.slice(0, 8);
      const stageIdsToKeep = validStages.map(s => s.id).filter(Boolean) as string[];

      // Delete old stages that are not in the payload
      await prisma.projectStage.deleteMany({
        where: {
          projectId,
          id: { notIn: stageIdsToKeep }
        }
      });

      for (let i = 0; i < validStages.length; i++) {
        const stageData = validStages[i];
        const sName = stageData.name;
        const color = normalizeProjectStageColor(stageData.color, i);

        if (stageData.id) {
          await prisma.projectStage.update({
            where: { id: stageData.id },
            data: {
              name: sName,
              color,
              position: i,
            }
          });
        } else {
          await prisma.projectStage.create({
            data: {
              name: sName,
              color,
              position: i,
              projectId
            }
          });
        }
      }
    }

    // Return updated project with includes
    const projectWithRelations = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        client: true,
        members: {
          include: {
            user: true,
          }
        },
        tasks: {
          include: {
            assignedTo: true,
          }
        },
        milestones: true,
        stages: {
          orderBy: { position: 'asc' }
        }
      }
    });

    return NextResponse.json({ success: true, project: projectWithRelations });
  } catch (error: any) {
    console.error('Error updating project:', error);
    return NextResponse.json({ error: 'Oops! Something went wrong. Please try again.' }, { status: 500 });
  }
}
