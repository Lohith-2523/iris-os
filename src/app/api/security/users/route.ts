import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getRequestUser, isOrganizationAdmin } from '@/lib/org';
import { sendIrisEmail } from '@/lib/email/iris-email';
import { SECURITY_ALLOWED_PAGES } from '@/lib/security-pages';

const schema = z.object({
  action: z.enum(['make_sub_admin', 'update_permissions', 'update_access', 'offboard']),
  userId: z.string().uuid(),
  permissions: z.array(z.enum(SECURITY_ALLOWED_PAGES)).optional(),
  handlesDeliverables: z.boolean().optional(),
  feedback: z.string().trim().min(5).max(3000).optional(),
});

export async function GET(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isOrganizationAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const users = await prisma.user.findMany({
    where: { orgId: user.orgId },
    select: { id: true, name: true, email: true, phone: true, role: true, accessPermissions: true, handlesDeliverables: true, offboardedAt: true, accessRevokedAt: true, createdAt: true },
    orderBy: [{ accessRevokedAt: 'asc' }, { role: 'asc' }, { name: 'asc' }],
  });
  return NextResponse.json({ users, plan: user.organization.plan, hasAddon: user.organization.hasAddon, allowedPages: SECURITY_ALLOWED_PAGES });
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getRequestUser(request);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isOrganizationAdmin(admin)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'Invalid security request', issues: parsed.error.issues }, { status: 400 });
    const body = parsed.data;
    const target = await prisma.user.findFirst({ where: { id: body.userId, orgId: admin.orgId } });
    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (target.id === admin.id && body.action === 'offboard') return NextResponse.json({ error: 'The primary admin cannot offboard their own account' }, { status: 400 });

    if (body.action === 'make_sub_admin') {
      if (!['PRO', 'ADVANCED'].includes(admin.organization.plan)) return NextResponse.json({ error: 'Individual team member page access is available on the Pro and Advanced plans.' }, { status: 403 });
      if (target.role.toLowerCase() !== 'member') return NextResponse.json({ error: 'Individual access can only be enabled for active team members.' }, { status: 400 });
      const updated = await prisma.user.update({ where: { id: target.id }, data: { role: 'sub_admin', accessPermissions: body.permissions || [], handlesDeliverables: body.handlesDeliverables ?? true } });
      return NextResponse.json({ success: true, user: updated });
    }

    if (body.action === 'update_permissions' || body.action === 'update_access') {
      if (!['PRO', 'ADVANCED'].includes(admin.organization.plan)) return NextResponse.json({ error: 'Individual team member page access is available on the Pro and Advanced plans.' }, { status: 403 });
      if (!['member', 'sub_admin'].includes(target.role.toLowerCase())) return NextResponse.json({ error: 'Access is configurable only for team members.' }, { status: 400 });
      const permissions = body.permissions || [];
      if (body.action === 'update_access' && permissions.length === 0 && !body.handlesDeliverables) {
        const [ongoingProjects, activeTasks, activeDeliverables] = await Promise.all([
          prisma.projectMember.count({ where: { userId: target.id, project: { status: { not: 'COMPLETED' } } } }),
          prisma.clientTask.count({ where: { assignedToId: target.id, status: { not: 'COMPLETED' } } }),
          prisma.deliverable.count({ where: { orgId: admin.orgId, submittedById: target.id, status: { not: 'APPROVED' } } }),
        ]);
        if (ongoingProjects === 0 && activeTasks === 0 && activeDeliverables === 0) {
          return NextResponse.json({ error: 'Choose any page or enable the deliverables checkbox to create a workspace for this user.' }, { status: 400 });
        }
      }
      const updated = await prisma.user.update({
        where: { id: target.id },
        data: {
          role: 'sub_admin',
          accessPermissions: permissions,
          ...(body.action === 'update_access' ? { handlesDeliverables: body.handlesDeliverables ?? false } : {}),
        },
      });
      return NextResponse.json({ success: true, user: updated });
    }

    if (!body.feedback) return NextResponse.json({ error: 'Offboarding feedback is required.' }, { status: 400 });
    if (!['member', 'sub_admin'].includes(target.role.toLowerCase())) return NextResponse.json({ error: 'Only team members can be offboarded from this workflow.' }, { status: 400 });
    const revokedAt = new Date();
    const [updated] = await prisma.$transaction([
      prisma.user.update({ where: { id: target.id }, data: { offboardedAt: revokedAt, accessRevokedAt: revokedAt, offboardingFeedback: body.feedback } }),
      prisma.messagingDevice.updateMany({ where: { userId: target.id, revokedAt: null }, data: { revokedAt } }),
      prisma.clientTask.updateMany({ where: { assignedToId: target.id }, data: { assignedToId: null } }),
      prisma.projectMember.deleteMany({ where: { userId: target.id } }),
    ]);
    let emailSent = false;
    try {
      const escapedFeedback = body.feedback.replace(/[<>&]/g, '');
      await sendIrisEmail({
        to: [target.email],
        subject: `Your access to ${admin.organization.name} has been revoked`,
        text: `Hello ${target.name},\n\nYour Iris OS team access has been revoked.\n\nFeedback from the agency:\n${body.feedback}\n\nPlease contact ${admin.name} if you have questions.`,
        html: `<p>Hello ${target.name},</p><p>Your Iris OS team access has been revoked.</p><p><strong>Feedback from the agency</strong></p><p>${escapedFeedback}</p><p>Please contact ${admin.name} if you have questions.</p>`,
        idempotencyKey: `offboard-${target.id}-${updated.updatedAt.toISOString()}`,
        tags: [{ name: 'category', value: 'team_offboarding' }],
      });
      emailSent = true;
    } catch (emailError) {
      console.error('Offboarding email could not be delivered:', emailError);
    }
    return NextResponse.json({ success: true, user: updated, emailSent });
  } catch (error) {
    console.error('Unable to update workspace security:', error);
    return NextResponse.json({ error: 'Unable to update workspace security' }, { status: 500 });
  }
}
