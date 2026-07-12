import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { deobfuscateEmail } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const assignedToId = searchParams.get('assignedToId');
    const projectId = searchParams.get('projectId');

    let tasks;

    const defaultInclude = {
      assignedTo: true,
      client: true,
      project: true,
      stage: true,
      updates: {
        orderBy: { createdAt: 'desc' as const }
      },
      comments: {
        include: {
          user: true
        },
        orderBy: { createdAt: 'desc' as const }
      },
      parentTask: true,
      nextTasks: true,
    };

    if (projectId) {
      tasks = await prisma.clientTask.findMany({
        where: { projectId },
        include: defaultInclude,
        orderBy: { createdAt: 'desc' },
      });
    } else if (clientId) {
      tasks = await prisma.clientTask.findMany({
        where: { clientId },
        include: defaultInclude,
        orderBy: { createdAt: 'desc' },
      });
    } else if (assignedToId) {
      tasks = await prisma.clientTask.findMany({
        where: { assignedToId },
        include: defaultInclude,
        orderBy: { createdAt: 'desc' },
      });
    } else {
      tasks = await prisma.clientTask.findMany({
        include: defaultInclude,
        orderBy: { createdAt: 'desc' },
      });
    }

    return NextResponse.json(tasks);
  } catch (error: any) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    // Resolve default include for returned tasks
    const taskInclude = {
      assignedTo: true,
      client: true,
      project: true,
      stage: true,
      updates: true,
      comments: {
        include: { user: true }
      },
      parentTask: true,
      nextTasks: true
    };

    if (action === 'create_task') {
      const { title, description, status, progress, clientId, assignedToId, projectId, stageId, timeline, deadline } = body;

      if (!title || !clientId) {
        return NextResponse.json({ error: 'Missing title or clientId' }, { status: 400 });
      }

      const newTask = await prisma.clientTask.create({
        data: {
          title,
          description: description || null,
          status: status || 'TODO',
          progress: progress !== undefined ? parseInt(progress, 10) : 0,
          clientId,
          projectId: projectId || null,
          stageId: stageId || null,
          assignedToId: assignedToId || null,
          timeline: timeline || null,
          deadline: deadline ? new Date(deadline) : null,
        },
        include: taskInclude
      });

      return NextResponse.json({ success: true, task: newTask });
    }

    if (action === 'update_task') {
      const { id, title, description, status, progress, blocker, update, assignedToId, projectId, stageId, timeline, deadline } = body;

      if (!id) {
        return NextResponse.json({ error: 'Missing task ID' }, { status: 400 });
      }

      // If they provided a raw update string, we also add it to TaskUpdate
      if (update) {
        await prisma.taskUpdate.create({
          data: {
            content: update,
            taskId: id
          }
        });
      }

      const updatedTask = await prisma.clientTask.update({
        where: { id },
        data: {
          title: title !== undefined ? title : undefined,
          description: description !== undefined ? description : undefined,
          status: status !== undefined ? status : undefined,
          progress: progress !== undefined ? parseInt(progress, 10) : undefined,
          blocker: blocker !== undefined ? (blocker === '' ? null : blocker) : undefined,
          update: update !== undefined ? (update === '' ? null : update) : undefined,
          assignedToId: assignedToId !== undefined ? (assignedToId === '' || assignedToId === null ? null : assignedToId) : undefined,
          projectId: projectId !== undefined ? (projectId === '' || projectId === null ? null : projectId) : undefined,
          stageId: stageId !== undefined ? (stageId === '' || stageId === null ? null : stageId) : undefined,
          timeline: timeline !== undefined ? (timeline === '' ? null : timeline) : undefined,
          deadline: deadline !== undefined ? (deadline ? new Date(deadline) : null) : undefined,
        },
        include: taskInclude
      });

      return NextResponse.json({ success: true, task: updatedTask });
    }

    if (action === 'delete_task') {
      const { id } = body;

      if (!id) {
        return NextResponse.json({ error: 'Missing task ID' }, { status: 400 });
      }

      await prisma.clientTask.delete({
        where: { id },
      });

      return NextResponse.json({ success: true });
    }

    if (action === 'add_update') {
      const { taskId, content } = body;

      if (!taskId || !content) {
        return NextResponse.json({ error: 'Missing taskId or content' }, { status: 400 });
      }

      const newUpdate = await prisma.taskUpdate.create({
        data: { content, taskId }
      });

      // Update the main task field as well for quick view
      await prisma.clientTask.update({
        where: { id: taskId },
        data: { update: content }
      });

      return NextResponse.json({ success: true, update: newUpdate });
    }

    if (action === 'add_comment') {
      const { taskId, content, userEmail } = body;

      if (!taskId || !content || !userEmail) {
        return NextResponse.json({ error: 'Missing taskId, content, or userEmail' }, { status: 400 });
      }

      const user = await prisma.user.findUnique({
        where: { email: userEmail }
      });

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const comment = await prisma.taskComment.create({
        data: {
          content,
          taskId,
          userId: user.id
        },
        include: {
          user: true
        }
      });

      return NextResponse.json({ success: true, comment });
    }

    if (action === 'carry_over') {
      const rawEmail = request.cookies.get('currentUserEmail')?.value;
      const email = rawEmail ? deobfuscateEmail(rawEmail) : 'lohith@apex.co';
      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user || user.role.toLowerCase() !== 'member') {
        return NextResponse.json({ error: 'Permission Denied: Only members can carry over tasks.' }, { status: 403 });
      }

      const { taskId, newAssigneeId, outputUrl, carryOverComment } = body;

      if (!taskId || !newAssigneeId || !outputUrl) {
        return NextResponse.json({ error: 'Missing taskId, newAssigneeId, or outputUrl' }, { status: 400 });
      }

      const oldTask = await prisma.clientTask.findUnique({
        where: { id: taskId }
      });

      if (!oldTask) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 });
      }

      // 1. Mark old task as COMPLETED and 100% progress, store output
      const updatedOldTask = await prisma.clientTask.update({
        where: { id: taskId },
        data: {
          status: 'COMPLETED',
          progress: 100,
          outputUrl,
          carryOverComment: carryOverComment || null,
          update: `Completed raw task. Output: ${outputUrl}. Handed over to new team member.`
        }
      });

      // Log an automatic task update
      await prisma.taskUpdate.create({
        data: {
          content: `Task completed. Deliverables output: ${outputUrl}. Handed over to next stage.`,
          taskId
        }
      });

      // Compute stage transition (Carryover moves task to the next stage in position order)
      let nextStageId = oldTask.stageId;
      if (oldTask.projectId && oldTask.stageId) {
        const currentStage = await prisma.projectStage.findUnique({
          where: { id: oldTask.stageId }
        });
        if (currentStage) {
          const nextStage = await prisma.projectStage.findFirst({
            where: {
              projectId: oldTask.projectId,
              position: currentStage.position + 1
            }
          });
          if (nextStage) {
            nextStageId = nextStage.id;
          }
        }
      } else if (oldTask.projectId) {
        // Default to the first stage of the project if the old task did not have one
        const firstStage = await prisma.projectStage.findFirst({
          where: { projectId: oldTask.projectId },
          orderBy: { position: 'asc' }
        });
        if (firstStage) {
          nextStageId = firstStage.id;
        }
      }

      // 2. Create the child carry-over task
      const nextTitle = `${oldTask.title} - Handover`;
      const description = `Follow-up carry-over phase from completed task "${oldTask.title}".\nOutputs from previous stage: ${outputUrl}\nHandover Notes: ${carryOverComment || 'None'}`;
      
      const newTask = await prisma.clientTask.create({
        data: {
          title: nextTitle,
          description,
          status: 'TODO',
          progress: 0,
          clientId: oldTask.clientId,
          projectId: oldTask.projectId,
          stageId: nextStageId,
          assignedToId: newAssigneeId,
          parentTaskId: oldTask.id,
        },
        include: taskInclude
      });

      // Add initial update log on child task
      await prisma.taskUpdate.create({
        data: {
          content: `Task initialized from carry-over chain. Handover notes: ${carryOverComment || 'None'}`,
          taskId: newTask.id
        }
      });

      return NextResponse.json({
        success: true,
        oldTask: updatedOldTask,
        newTask
      });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error managing tasks:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
