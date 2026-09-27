import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getRequestUser, isOrganizationAdmin, userHasDeliveryWorkspace } from '@/lib/org';
import { isTaskStatus, normalizeTaskStatusProgress } from '@/lib/tasks/status-progress';
import { createNotification, notifyOrganizationAdmins } from '@/lib/notifications';
import { cursorHeaders, readCursorPage } from '@/lib/cursor-pagination';
import { getRequestSecurityContext } from '@/server/security/request-security-context';
import { listTasks } from '@/server/domains/task-service';
import { isTaskWriteConflict } from '@/lib/tasks/write-conflict';

function canEditTask(user: Parameters<typeof userHasDeliveryWorkspace>[0] & { id: string; role: string }, task: { assignedToId: string | null }) {
  const role = user.role.toLowerCase();
  const ownsTask = task.assignedToId === user.id;
  return isOrganizationAdmin(user)
    || (role === 'sub_admin' && (!userHasDeliveryWorkspace(user) || ownsTask))
    || (role === 'member' && ownsTask);
}

const taskApprovalStatuses = new Set(['NOT_REQUIRED', 'NEEDS_CLIENT_APPROVAL', 'APPROVED', 'CHANGES_REQUESTED']);

export async function GET(request: NextRequest) {
  try {
    const ctx = await getRequestSecurityContext();
    if (!ctx) {
      return NextResponse.json([]);
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const assignedToId = searchParams.get('assignedToId');
    const projectId = searchParams.get('projectId');

    const pageRequest = readCursorPage(request);
    const page = await listTasks(ctx, pageRequest, { clientId, assignedToId, projectId });
    return NextResponse.json(page.items, { headers: cursorHeaders(page, pageRequest.limit) });
  } catch (error: any) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const requestUser = await getRequestUser(request);
    if (!requestUser) {
      return NextResponse.json({ error: 'User context required' }, { status: 401 });
    }

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
      ,deliverables: true
    };

    if (action === 'create_task') {
      const { title, description, status, progress, clientId, assignedToId, projectId, stageId, timeline, deadline, approvalStatus } = body;

      if (!title || !clientId) {
        return NextResponse.json({ error: 'Missing title or clientId' }, { status: 400 });
      }

      const client = await prisma.client.findUnique({ where: { id: clientId } });
      if (!client || client.orgId !== requestUser.orgId) {
        return NextResponse.json({ error: 'Unauthorized client scope' }, { status: 403 });
      }
      let projectDefaultAssigneeId: string | null = null;
      if (projectId) {
        const project = await prisma.project.findFirst({
          where: { id: projectId, clientId, client: { orgId: requestUser.orgId } },
          select: { id: true, members: { orderBy: { createdAt: 'asc' }, take: 1, select: { userId: true } } },
        });
        if (!project) return NextResponse.json({ error: 'Project must belong to the selected client.' }, { status: 400 });
        projectDefaultAssigneeId = project.members[0]?.userId || null;
      }
      const requestedStatus = status || 'TODO';
      const requestedProgress = progress !== undefined ? Number(progress) : 0;
      if (!isTaskStatus(requestedStatus)) {
        return NextResponse.json({ error: 'Invalid task status' }, { status: 400 });
      }
      if (!Number.isInteger(requestedProgress) || requestedProgress < 0 || requestedProgress > 100) {
        return NextResponse.json({ error: 'Task progress must be a whole number between 0 and 100' }, { status: 400 });
      }
      const normalizedStatusProgress = normalizeTaskStatusProgress(
        { status: 'TODO', progress: 0 },
        { status: requestedStatus, progress: requestedProgress },
      );

      const newTask = await prisma.clientTask.create({
        data: {
          title,
          description: description || null,
          status: normalizedStatusProgress.status,
          progress: normalizedStatusProgress.progress,
          clientId,
          projectId: projectId || null,
          stageId: stageId || null,
          assignedToId: assignedToId || projectDefaultAssigneeId,
          timeline: timeline || null,
          deadline: deadline ? new Date(deadline) : null,
          approvalStatus: requestedStatus === 'NEEDS_CLIENT_APPROVAL' || approvalStatus === 'NEEDS_CLIENT_APPROVAL' ? 'NEEDS_CLIENT_APPROVAL' : 'NOT_REQUIRED',
        },
        include: taskInclude
      });

      if (deadline) {
        const scheduledAt = new Date(deadline);
        await notifyOrganizationAdmins({ orgId: requestUser.orgId, type: 'DELAY', title: 'Task deadline reached', body: `${title} is due now. Review its progress and resolve any delay.`, href: `/tasks?taskId=${newTask.id}`, actionLabel: 'Review task', scheduledAt });
        if (assignedToId) await createNotification({ orgId: requestUser.orgId, userId: assignedToId, type: 'REMINDER', title: 'Task follow-up due', body: `${title} is due now. Add a progress update or complete it.`, href: `/tasks?taskId=${newTask.id}`, actionLabel: 'Update task', scheduledAt });
      }

      return NextResponse.json({ success: true, task: newTask });
    }

    if (action === 'update_task') {
      const { id, title, description, status, progress, blocker, update, assignedToId, projectId, stageId, timeline, deadline, approvalStatus, expectedUpdatedAt } = body;

      if (!id) {
        return NextResponse.json({ error: 'Missing task ID' }, { status: 400 });
      }

      const existingTask = await prisma.clientTask.findUnique({
        where: { id },
        include: { client: true },
      });

      if (!existingTask || existingTask.client.orgId !== requestUser.orgId) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 });
      }
      if (!canEditTask(requestUser, existingTask)) {
        return NextResponse.json({ error: 'You can only edit tasks assigned to you.' }, { status: 403 });
      }
      const expectedVersion = expectedUpdatedAt ? new Date(expectedUpdatedAt) : null;
      if (expectedUpdatedAt && Number.isNaN(expectedVersion?.getTime())) {
        return NextResponse.json({ error: 'Invalid task version.' }, { status: 400 });
      }

      const normalizedTitle = title !== undefined ? String(title).trim() : undefined;
      if (normalizedTitle !== undefined && !normalizedTitle) {
        return NextResponse.json({ error: 'Task title is required' }, { status: 400 });
      }
      const normalizedProgress = progress !== undefined ? Number(progress) : undefined;
      if (normalizedProgress !== undefined && (!Number.isInteger(normalizedProgress) || normalizedProgress < 0 || normalizedProgress > 100)) {
        return NextResponse.json({ error: 'Task progress must be a whole number between 0 and 100' }, { status: 400 });
      }
      if (status !== undefined && !isTaskStatus(status)) {
        return NextResponse.json({ error: 'Invalid task status' }, { status: 400 });
      }
      if (approvalStatus !== undefined && !taskApprovalStatuses.has(approvalStatus)) {
        return NextResponse.json({ error: 'Invalid client approval status' }, { status: 400 });
      }
      if (approvalStatus !== undefined && ['APPROVED', 'CHANGES_REQUESTED'].includes(approvalStatus) && approvalStatus !== existingTask.approvalStatus) {
        return NextResponse.json({ error: 'Approved and changes-requested states can only be set through the client approval workflow.' }, { status: 400 });
      }
      const normalizedStatusProgress = normalizeTaskStatusProgress(
        { status: existingTask.status, progress: existingTask.progress },
        { status, progress: normalizedProgress },
      );
      const normalizedDeadline = deadline !== undefined && deadline ? new Date(deadline) : null;
      if (deadline !== undefined && deadline && Number.isNaN(normalizedDeadline?.getTime())) {
        return NextResponse.json({ error: 'Task deadline must be a valid date' }, { status: 400 });
      }

      if (assignedToId !== undefined && assignedToId) {
        const assignee = await prisma.user.findFirst({
          where: { id: assignedToId, orgId: requestUser.orgId },
          select: { id: true },
        });
        if (!assignee) {
          return NextResponse.json({ error: 'Assignee must belong to this organization' }, { status: 400 });
        }
      }

      const targetProjectId = projectId === undefined
        ? existingTask.projectId
        : (projectId || null);
      if (targetProjectId) {
        const project = await prisma.project.findFirst({
          where: { id: targetProjectId, orgId: requestUser.orgId, clientId: existingTask.clientId },
          select: { id: true },
        });
        if (!project) {
          return NextResponse.json({ error: 'Project must belong to the task client' }, { status: 400 });
        }
      }
      if (stageId && !targetProjectId) {
        return NextResponse.json({ error: 'A task stage requires a project' }, { status: 400 });
      }
      if (stageId && targetProjectId) {
        const stage = await prisma.projectStage.findFirst({
          where: { id: stageId, projectId: targetProjectId },
          select: { id: true },
        });
        if (!stage) {
          return NextResponse.json({ error: 'Stage must belong to the selected project' }, { status: 400 });
        }
      }

      let updatedTask;
      try {
        // A nested write is atomic, but unlike an interactive transaction it does
        // not keep a pooled connection checked out while Prisma loads the task's
        // related records for the response. That prevents the transaction from
        // expiring under normal connection-pool pressure.
        updatedTask = await prisma.clientTask.update({
          where: expectedVersion ? { id, updatedAt: expectedVersion } : { id },
          data: {
            title: normalizedTitle,
            description: description !== undefined ? (description === '' ? null : String(description)) : undefined,
            status: status !== undefined || normalizedProgress !== undefined ? normalizedStatusProgress.status : undefined,
            progress: status !== undefined || normalizedProgress !== undefined ? normalizedStatusProgress.progress : undefined,
            blocker: blocker !== undefined ? (blocker === '' ? null : blocker) : undefined,
            update: update !== undefined ? (update === '' ? null : update) : undefined,
            updates: update ? { create: { content: update } } : undefined,
            assignedToId: assignedToId !== undefined ? (assignedToId === '' || assignedToId === null ? null : assignedToId) : undefined,
            projectId: projectId !== undefined ? (projectId === '' || projectId === null ? null : projectId) : undefined,
            stageId: stageId !== undefined ? (stageId === '' || stageId === null ? null : stageId) : undefined,
            timeline: timeline !== undefined ? (timeline === '' ? null : String(timeline)) : undefined,
            deadline: deadline !== undefined ? normalizedDeadline : undefined,
            approvalStatus: status === 'NEEDS_CLIENT_APPROVAL' ? 'NEEDS_CLIENT_APPROVAL' : approvalStatus !== undefined ? approvalStatus : undefined,
          },
          include: taskInclude,
        });
      } catch (error) {
        if (isTaskWriteConflict(error)) {
          return NextResponse.json(
            { error: 'This task changed while you were editing it. Refresh and retry.' },
            { status: 409 },
          );
        }
        throw error;
      }

      if (status === 'BLOCKED') await notifyOrganizationAdmins({ orgId: requestUser.orgId, type: 'ISSUE', title: 'Task blocked', body: `${updatedTask.title} is blocked${blocker ? `: ${blocker}` : '.'}`, href: `/tasks?taskId=${updatedTask.id}`, actionLabel: 'Review task' });
      return NextResponse.json({ success: true, task: updatedTask });
    }

    if (action === 'delete_task') {
      const { id } = body;

      if (!id) {
        return NextResponse.json({ error: 'Missing task ID' }, { status: 400 });
      }

      const task = await prisma.clientTask.findUnique({
        where: { id },
        include: { client: true },
      });
      if (!task || task.client.orgId !== requestUser.orgId) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 });
      }
      if (!canEditTask(requestUser, task)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

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

      const task = await prisma.clientTask.findUnique({
        where: { id: taskId },
        include: { client: true },
      });
      if (!task || task.client.orgId !== requestUser.orgId) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 });
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

      const task = await prisma.clientTask.findUnique({
        where: { id: taskId },
        include: { client: true },
      });
      if (!task || task.client.orgId !== requestUser.orgId || user.orgId !== requestUser.orgId) {
        return NextResponse.json({ error: 'Unauthorized task scope' }, { status: 403 });
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
      const user = requestUser;

      if (!user || user.role.toLowerCase() !== 'member') {
        return NextResponse.json({ error: 'Permission Denied: Only members can carry over tasks.' }, { status: 403 });
      }

      const { taskId, newAssigneeId, outputUrl, carryOverComment } = body;

      if (!taskId || !newAssigneeId || !outputUrl) {
        return NextResponse.json({ error: 'Missing taskId, newAssigneeId, or outputUrl' }, { status: 400 });
      }

      const oldTask = await prisma.clientTask.findUnique({
        where: { id: taskId },
        include: { client: true },
      });

      if (!oldTask || oldTask.client.orgId !== requestUser.orgId) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 });
      }

      const newAssignee = await prisma.user.findUnique({ where: { id: newAssigneeId } });
      if (!newAssignee || newAssignee.orgId !== requestUser.orgId) {
        return NextResponse.json({ error: 'Unauthorized assignee scope' }, { status: 403 });
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
