import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getRequestUser, isOrganizationAdmin } from '@/lib/org';
import { createNotification, notifyOrganizationAdmins } from '@/lib/notifications';
import { applyFinalizedChangeRequest } from '@/lib/atlas-ai/apply-finalized-change-request';

const schema = z.object({
  action: z.enum(['create', 'approve', 'request_changes', 'create_change_request', 'update_change_request', 'resolve_change_request']),
  id: z.string().uuid().optional(),
  title: z.string().trim().min(2).max(200).optional(),
  url: z.url().optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  note: z.string().trim().max(2000).nullable().optional(),
  clientId: z.string().uuid().optional(),
  projectId: z.string().uuid().nullable().optional(),
  taskId: z.string().uuid().nullable().optional(),
  stageId: z.string().uuid().nullable().optional(),
  needsApproval: z.boolean().optional(),
  status: z.enum(['PROPOSED', 'DISCUSSION', 'FINALIZED']).optional(),
  agencyResponse: z.string().trim().max(4000).nullable().optional(),
  alternateProposal: z.string().trim().max(4000).nullable().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const clientScope = user.role.toLowerCase() === 'client' ? { clientId: user.clientId || '__none__' } : {};
    const [deliverables, changeRequests] = await Promise.all([
      prisma.deliverable.findMany({
        where: { orgId: user.orgId, ...clientScope },
        include: { client: { select: { id: true, name: true } }, project: { select: { id: true, name: true } }, task: { select: { id: true, title: true, stage: { select: { id: true, name: true } } } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.changeRequest.findMany({
        where: { orgId: user.orgId, ...clientScope },
        include: { client: { select: { id: true, name: true } }, project: { select: { id: true, name: true } }, task: { select: { id: true, title: true, stage: { select: { id: true, name: true } } } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return NextResponse.json({ deliverables, changeRequests });
  } catch (error) {
    console.error('Unable to load deliverables:', error);
    return NextResponse.json({ error: 'Unable to load deliverables' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'Invalid deliverable request', issues: parsed.error.issues }, { status: 400 });
    const body = parsed.data;

    if (body.action === 'create') {
      if (!['admin', 'sub_admin', 'member'].includes(user.role.toLowerCase())) return NextResponse.json({ error: 'Only agency owners and team members can submit deliverables' }, { status: 403 });
      if (!body.title || !body.url || !body.clientId) return NextResponse.json({ error: 'Title, link, and client are required' }, { status: 400 });
      const client = await prisma.client.findFirst({ where: { id: body.clientId, orgId: user.orgId }, select: { id: true, name: true } });
      if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

      const task = body.taskId ? await prisma.clientTask.findFirst({
        where: { id: body.taskId, clientId: client.id, client: { orgId: user.orgId } },
        select: { id: true, projectId: true, stageId: true, status: true, progress: true, approvalStatus: true },
      }) : null;
      if (body.taskId && !task) return NextResponse.json({ error: 'Task does not belong to this client workspace' }, { status: 400 });

      const projectId = body.projectId || task?.projectId || null;
      if (body.projectId && task?.projectId && body.projectId !== task.projectId) return NextResponse.json({ error: 'Task and deliverable project do not match' }, { status: 400 });
      if (projectId) {
        const project = await prisma.project.findFirst({ where: { id: projectId, orgId: user.orgId, clientId: client.id }, select: { id: true } });
        if (!project) return NextResponse.json({ error: 'Project does not belong to this client workspace' }, { status: 400 });
      }

      const stageId = body.stageId || task?.stageId || null;
      if (stageId) {
        if (!projectId) return NextResponse.json({ error: 'A deliverable stage requires a project' }, { status: 400 });
        const stage = await prisma.projectStage.findFirst({ where: { id: stageId, projectId }, select: { id: true } });
        if (!stage) return NextResponse.json({ error: 'Stage does not belong to the selected project' }, { status: 400 });
      }

      const needsApproval = Boolean(body.needsApproval || ['NEEDS_CLIENT_APPROVAL', 'CHANGES_REQUESTED'].includes(task?.approvalStatus || ''));
      const createDeliverable = prisma.deliverable.create({ data: {
        title: body.title, url: body.url, description: body.description || null,
        status: needsApproval ? 'NEEDS_CLIENT_APPROVAL' : 'SUBMITTED',
        submittedById: user.id, submittedByName: user.name, orgId: user.orgId, clientId: client.id,
        projectId, taskId: task?.id || null, stageId,
      }});
      let deliverable;
      if (task) {
        [deliverable] = await prisma.$transaction([
          createDeliverable,
          prisma.clientTask.update({ where: { id: task.id }, data: { outputUrl: body.url, status: needsApproval ? 'NEEDS_CLIENT_APPROVAL' : task.status, progress: needsApproval ? 100 : task.progress, approvalStatus: needsApproval ? 'NEEDS_CLIENT_APPROVAL' : task.approvalStatus } }),
        ]);
      } else {
        deliverable = await createDeliverable;
      }
      const clientUsers = await prisma.user.findMany({ where: { clientId: client.id, accessRevokedAt: null }, select: { id: true } });
      await Promise.all(clientUsers.map((recipient) => createNotification({ orgId: user.orgId, userId: recipient.id, type: needsApproval ? 'APPROVAL' : 'UPDATE', title: needsApproval ? 'Deliverable needs your approval' : 'New deliverable available', body: `${body.title} was submitted for ${client.name}.`, href: '/client-dashboard?tab=approvals', actionLabel: needsApproval ? 'Review deliverable' : 'Open deliverable' })));
      return NextResponse.json({ success: true, deliverable });
    }

    if (body.action === 'create_change_request') {
      if (!body.title || !body.note || !body.clientId) return NextResponse.json({ error: 'Title, details, and client are required' }, { status: 400 });
      if (user.role.toLowerCase() === 'client' && user.clientId !== body.clientId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      const client = await prisma.client.findFirst({ where: { id: body.clientId, orgId: user.orgId }, select: { id: true } });
      if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });
      if (body.projectId) {
        const project = await prisma.project.findFirst({ where: { id: body.projectId, orgId: user.orgId, clientId: client.id }, select: { id: true } });
        if (!project) return NextResponse.json({ error: 'Project does not belong to this client workspace' }, { status: 400 });
      }
      if (body.taskId) {
        const task = await prisma.clientTask.findFirst({ where: { id: body.taskId, clientId: client.id, ...(body.projectId ? { projectId: body.projectId } : {}) }, select: { id: true } });
        if (!task) return NextResponse.json({ error: 'Task does not belong to this client workspace' }, { status: 400 });
      }
      if (!body.projectId) return NextResponse.json({ error: 'A project is required for change requests' }, { status: 400 });
      const changeRequest = await prisma.changeRequest.create({ data: { title: body.title, details: body.note, status: 'PROPOSED', requestedById: user.id, requestedByName: user.name, orgId: user.orgId, clientId: client.id, projectId: body.projectId, taskId: body.taskId || null } });
      await notifyOrganizationAdmins({ orgId: user.orgId, type: 'ISSUE', title: 'Project change proposed', body: `${user.name} proposed: ${body.title}`, href: `/clients?clientId=${client.id}&tab=changes`, actionLabel: 'Review proposal' });
      return NextResponse.json({ success: true, changeRequest });
    }

    if (!body.id) return NextResponse.json({ error: 'Record ID is required' }, { status: 400 });
    if (body.action === 'update_change_request' || body.action === 'resolve_change_request') {
      if (!isOrganizationAdmin(user)) return NextResponse.json({ error: 'Only the agency admin can manage project change requests' }, { status: 403 });
      const changeRequest = await prisma.changeRequest.findFirst({ where: { id: body.id, orgId: user.orgId } });
      if (!changeRequest) return NextResponse.json({ error: 'Change request not found' }, { status: 404 });
      if (!changeRequest.projectId) return NextResponse.json({ error: 'This change request is not linked to a project' }, { status: 400 });
      const requestedStatus = body.action === 'resolve_change_request' ? 'FINALIZED' : (body.status || changeRequest.status);
      const scopeChanged = body.title !== undefined
        || body.note !== undefined
        || body.agencyResponse !== undefined
        || body.alternateProposal !== undefined;
      const shouldApplyAtlas = requestedStatus === 'FINALIZED'
        && (changeRequest.status !== 'FINALIZED' || scopeChanged || !changeRequest.atlasAppliedAt);
      const updated = await prisma.changeRequest.update({
        where: { id: changeRequest.id },
        data: {
          ...(body.title !== undefined ? { title: body.title } : {}),
          ...(body.note !== undefined && body.note !== null ? { details: body.note } : {}),
          ...(body.agencyResponse !== undefined ? { agencyResponse: body.agencyResponse || null } : {}),
          ...(body.alternateProposal !== undefined ? { alternateProposal: body.alternateProposal || null } : {}),
          status: requestedStatus,
          finalizedAt: requestedStatus === 'FINALIZED' ? new Date() : null,
          ...(shouldApplyAtlas ? { atlasAppliedAt: null, atlasSummary: null } : {}),
        },
      });

      let atlas = null;
      if (shouldApplyAtlas) {
        atlas = await applyFinalizedChangeRequest({
          id: updated.id,
          title: updated.title,
          details: updated.details,
          agencyResponse: updated.agencyResponse,
          alternateProposal: updated.alternateProposal,
          projectId: changeRequest.projectId,
          clientId: updated.clientId,
          orgId: updated.orgId,
        });
      }

      const finalChangeRequest = await prisma.changeRequest.findUnique({
        where: { id: updated.id },
        include: { project: { select: { id: true, name: true } }, task: { select: { id: true, title: true } } },
      });
      const clientUsers = await prisma.user.findMany({ where: { clientId: changeRequest.clientId, accessRevokedAt: null }, select: { id: true } });
      await Promise.all(clientUsers.map((recipient) => createNotification({
        orgId: user.orgId,
        userId: recipient.id,
        type: requestedStatus === 'FINALIZED' ? 'APPROVAL' : 'UPDATE',
        title: `Change request ${requestedStatus.toLowerCase()}`,
        body: requestedStatus === 'FINALIZED' ? `${updated.title} was finalized and added to the project plan.` : `${updated.title} moved to discussion.`,
        href: '/client-dashboard?tab=approvals',
        actionLabel: 'View request',
      })));
      return NextResponse.json({ success: true, changeRequest: finalChangeRequest, atlas });
    }
    if (user.role.toLowerCase() !== 'client') return NextResponse.json({ error: 'Only a client can approve or request changes' }, { status: 403 });
    const deliverable = await prisma.deliverable.findFirst({ where: { id: body.id, orgId: user.orgId, clientId: user.clientId || '__none__' } });
    if (!deliverable) return NextResponse.json({ error: 'Deliverable not found' }, { status: 404 });
    if (deliverable.status !== 'NEEDS_CLIENT_APPROVAL') return NextResponse.json({ error: 'This deliverable is not awaiting approval' }, { status: 409 });
    const approved = body.action === 'approve';
    if (!approved && !body.note) return NextResponse.json({ error: 'Describe the requested changes' }, { status: 400 });
    const otherPendingApprovals = deliverable.taskId && approved ? await prisma.deliverable.count({ where: { taskId: deliverable.taskId, status: 'NEEDS_CLIENT_APPROVAL', id: { not: deliverable.id } } }) : 0;
    const taskApprovalStatus = approved && otherPendingApprovals > 0 ? 'NEEDS_CLIENT_APPROVAL' : approved ? 'APPROVED' : 'CHANGES_REQUESTED';
    const updateDeliverable = prisma.deliverable.update({ where: { id: deliverable.id }, data: { status: approved ? 'APPROVED' : 'CHANGES_REQUESTED', approvalNote: body.note || null, approvedAt: approved ? new Date() : null } });
    let updated;
    if (deliverable.taskId) {
      [updated] = await prisma.$transaction([
        updateDeliverable,
        prisma.clientTask.update({ where: { id: deliverable.taskId }, data: { status: taskApprovalStatus === 'APPROVED' ? 'COMPLETED' : taskApprovalStatus === 'CHANGES_REQUESTED' ? 'IN_PROGRESS' : 'NEEDS_CLIENT_APPROVAL', progress: taskApprovalStatus === 'CHANGES_REQUESTED' ? 99 : 100, approvalStatus: taskApprovalStatus, approvalNote: body.note || null, approvedAt: taskApprovalStatus === 'APPROVED' ? new Date() : null } }),
      ]);
    } else {
      updated = await updateDeliverable;
    }
    await notifyOrganizationAdmins({ orgId: user.orgId, type: 'APPROVAL', title: approved ? 'Deliverable approved' : 'Changes requested', body: `${user.name} ${approved ? 'approved' : 'requested changes to'} ${deliverable.title}.`, href: '/tasks', actionLabel: 'Open task' });
    if (deliverable.submittedById) await createNotification({ orgId: user.orgId, userId: deliverable.submittedById, type: 'APPROVAL', title: approved ? 'Your deliverable was approved' : 'Client requested changes', body: `${user.name} ${approved ? 'approved' : 'requested changes to'} ${deliverable.title}.`, href: deliverable.taskId ? `/tasks?taskId=${deliverable.taskId}` : '/tasks', actionLabel: 'Open deliverable' });
    return NextResponse.json({ success: true, deliverable: updated });
  } catch (error) {
    console.error('Unable to update deliverables:', error);
    return NextResponse.json({ error: 'Unable to update deliverables' }, { status: 500 });
  }
}
