import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getRequestUser, isOrganizationAdmin } from '@/lib/org';
import { parseProjectCommercials } from '@/lib/projects/commercial';
import {
  createAndSendProjectInvoice,
  InvoiceServiceError,
} from '@/lib/invoices/service';
import { publicAppUrl } from '@/lib/app-url';
import { getDeliveryDelaySummary } from '@/lib/delivery-delays';
import { isSelectedAgencyServiceLine } from '@/lib/agency-specializations';

export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) {
      return NextResponse.json([]);
    }
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    let projects;

    const defaultInclude = {
      client: true,
      members: {
        include: {
          user: true,
        }
      },
      tasks: {
        include: {
          assignedTo: true,
          stage: true,
        }
      },
      milestones: true,
      allocations: true,
      stages: {
        orderBy: { position: 'asc' as const }
      },
      invoices: {
        orderBy: { issuedDate: 'desc' as const },
      },
      deliverables: {
        include: {
          task: { select: { id: true, title: true, stage: { select: { id: true, name: true } } } },
        },
        orderBy: { createdAt: 'desc' as const },
      },
      changeRequests: {
        orderBy: { createdAt: 'desc' as const },
      },
    };

    const scopedWhere = {
      orgId: user.orgId,
      ...(user.role.toLowerCase() === 'client' && user.clientId ? { clientId: user.clientId } : {}),
      ...(clientId ? { clientId } : {}),
    };

    if (clientId) {
      projects = await prisma.project.findMany({
        where: scopedWhere,
        include: defaultInclude,
        orderBy: { createdAt: 'desc' },
      });
    } else {
      projects = await prisma.project.findMany({
        where: scopedWhere,
        include: defaultInclude,
        orderBy: { createdAt: 'desc' },
      });
    }

    return NextResponse.json(projects.map((project) => {
      const delays = getDeliveryDelaySummary(project);
      return {
        ...project,
        deliveryDelays: {
          stages: delays.delayedStages.map((stage) => ({ id: stage.id, name: stage.name, endDate: stage.endDate })),
          tasks: delays.delayedTasks.map((task) => ({ title: task.title, deadline: task.deadline, stageId: task.stageId })),
          total: delays.total,
        },
      };
    }));
  } catch (error: any) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: 'User context required' }, { status: 401 });
    }
    if (!isOrganizationAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

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
      deliverables, // array of strings for initial tasks
      stages // array of stage names (strings) or objects
    } = body;

    if (!name || !clientId) {
      return NextResponse.json({ error: 'Missing name or clientId' }, { status: 400 });
    }
    if (!isSelectedAgencyServiceLine(serviceLine, user.organization.agencyTypes)) {
      return NextResponse.json({ error: 'Select a project service line enabled in Agency Settings.' }, { status: 400 });
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

    // Resolve organization ID from the client
    const client = await prisma.client.findUnique({
      where: { id: clientId }
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    if (client.orgId !== user.orgId || (user.role.toLowerCase() === 'client' && user.clientId !== client.id)) {
      return NextResponse.json({ error: 'Unauthorized project scope' }, { status: 403 });
    }

    const orgId = client.orgId;

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

    // Create project members
    if (memberIds && Array.isArray(memberIds)) {
      for (const userId of memberIds) {
        const member = await prisma.user.findUnique({ where: { id: userId } });
        if (!member || member.orgId !== orgId) continue;
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
      const numStages = validStages.length;
      const start = startDate ? new Date(startDate) : new Date();
      const end = endDate ? new Date(endDate) : new Date(start.getTime() + 90 * 24 * 60 * 60 * 1000);
      const totalMs = end.getTime() - start.getTime();
      const msPerStage = totalMs / numStages;

      for (let i = 0; i < numStages; i++) {
        const stageItem = validStages[i];
        const sName = typeof stageItem === 'string' ? stageItem : stageItem.name;
        const sStart = typeof stageItem === 'object' && stageItem.startDate ? new Date(stageItem.startDate) : new Date(start.getTime() + i * msPerStage);
        const sEnd = typeof stageItem === 'object' && stageItem.endDate ? new Date(stageItem.endDate) : new Date(start.getTime() + (i + 1) * msPerStage);

        const newStage = await prisma.projectStage.create({
          data: {
            name: sName,
            position: i,
            startDate: sStart,
            endDate: sEnd,
            projectId: newProject.id
          }
        });
        createdStages.push(newStage);
      }
    }

    // Create initial deliverables as tasks
    if (deliverables && Array.isArray(deliverables)) {
      // Map initial deliverables to Stage 1 (index 0) if stages exist
      const initialStageId = createdStages.length > 0 ? createdStages[0].id : null;

      for (const deliv of deliverables) {
        await prisma.clientTask.create({
          data: {
            title: deliv,
            description: `Initial deliverable for project: ${name}`,
            status: 'TODO',
            progress: 0,
            clientId,
            projectId: newProject.id,
            stageId: initialStageId,
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
        invoice = await createAndSendProjectInvoice({
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
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: 'User context required' }, { status: 401 });
    }
    if (!isOrganizationAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

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
      stages // Array<{ id?: string, name: string, startDate?: string, endDate?: string }>
    } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
    }
    if (serviceLine !== undefined && !isSelectedAgencyServiceLine(serviceLine, user.organization.agencyTypes)) {
      return NextResponse.json({ error: 'Select a project service line enabled in Agency Settings.' }, { status: 400 });
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
      return NextResponse.json({ error: 'Unauthorized project scope' }, { status: 403 });
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

      // Divide timeline equally for stages that don't have dates specified
      const start = startDate ? new Date(startDate) : currentProject.startDate;
      const end = endDate ? new Date(endDate) : (currentProject.endDate || new Date(start.getTime() + 90 * 24 * 60 * 60 * 1000));
      const totalMs = end.getTime() - start.getTime();
      const msPerStage = totalMs / validStages.length;

      for (let i = 0; i < validStages.length; i++) {
        const stageData = validStages[i];
        const sName = stageData.name;
        const sStart = stageData.startDate ? new Date(stageData.startDate) : new Date(start.getTime() + i * msPerStage);
        const sEnd = stageData.endDate ? new Date(stageData.endDate) : new Date(start.getTime() + (i + 1) * msPerStage);

        if (stageData.id) {
          await prisma.projectStage.update({
            where: { id: stageData.id },
            data: {
              name: sName,
              position: i,
              startDate: sStart,
              endDate: sEnd
            }
          });
        } else {
          await prisma.projectStage.create({
            data: {
              name: sName,
              position: i,
              startDate: sStart,
              endDate: sEnd,
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
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
