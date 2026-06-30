import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
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
        }
      },
      milestones: true,
      allocations: true,
      stages: {
        orderBy: { position: 'asc' as const }
      }
    };

    if (clientId) {
      projects = await prisma.project.findMany({
        where: { clientId },
        include: defaultInclude,
        orderBy: { createdAt: 'desc' },
      });
    } else {
      projects = await prisma.project.findMany({
        include: defaultInclude,
        orderBy: { createdAt: 'desc' },
      });
    }

    return NextResponse.json(projects);
  } catch (error: any) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
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
      clientId,
      memberIds, // array of User IDs
      deliverables, // array of strings for initial tasks
      stages // array of stage names (strings) or objects
    } = body;

    if (!name || !clientId) {
      return NextResponse.json({ error: 'Missing name or clientId' }, { status: 400 });
    }

    // Resolve organization ID from the client
    const client = await prisma.client.findUnique({
      where: { id: clientId }
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
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
        orgId,
        clientId,
      }
    });

    // Create project members
    if (memberIds && Array.isArray(memberIds)) {
      for (const userId of memberIds) {
        await prisma.projectMember.create({
          data: {
            projectId: newProject.id,
            userId,
          }
        });
      }
    }

    // Calculate dates and create stages (max 8)
    let createdStages: any[] = [];
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

    return NextResponse.json({ success: true, project: projectWithRelations });
  } catch (error: any) {
    console.error('Error creating project:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
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
      memberIds,
      stages // Array<{ id?: string, name: string, startDate?: string, endDate?: string }>
    } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
    }

    const currentProject = await prisma.project.findUnique({
      where: { id: projectId },
      include: { stages: true }
    });

    if (!currentProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
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
      }
    });

    // 2. Sync Members
    if (memberIds && Array.isArray(memberIds)) {
      await prisma.projectMember.deleteMany({
        where: { projectId }
      });
      for (const userId of memberIds) {
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
