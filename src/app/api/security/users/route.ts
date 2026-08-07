import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getRequestUser, isOrganizationAdmin } from '@/lib/org';
import { sendIrisEmail } from '@/lib/email/iris-email';

const allowedPages = ['dashboard', 'finance', 'agency-leads', 'clients', 'projects', 'tasks', 'team', 'calendar', 'messages', 'reporting', 'analytics', 'invoices', 'atlas', 'strategy', 'settings'] as const;
const schema = z.object({
  action: z.enum(['make_sub_admin', 'update_permissions', 'offboard']),
  userId: z.string().uuid(),
  permissions: z.array(z.enum(allowedPages)).optional(),
  feedback: z.string().trim().min(5).max(3000).optional(),
});

export async function GET(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isOrganizationAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const users = await prisma.user.findMany({
    where: { orgId: user.orgId },
    select: { id: true, name: true, email: true, phone: true, role: true, accessPermissions: true, offboardedAt: true, accessRevokedAt: true, createdAt: true },
    orderBy: [{ accessRevokedAt: 'asc' }, { role: 'asc' }, { name: 'asc' }],
  });
  return NextResponse.json({ users, plan: user.organization.plan, hasAddon: user.organization.hasAddon, allowedPages });
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
      if (admin.organization.plan !== 'ADVANCED') return NextResponse.json({ error: 'Sub-admin access is available on the Advanced plan.' }, { status: 403 });
      if (target.role.toLowerCase() !== 'member') return NextResponse.json({ error: 'Only active team members can become sub-admins.' }, { status: 400 });
      const existingCount = await prisma.user.count({ where: { orgId: admin.orgId, role: 'sub_admin', accessRevokedAt: null } });
      if (existingCount >= 1 && !admin.organization.hasAddon) return NextResponse.json({ error: 'One sub-admin is included. Enable the additional sub-admin add-on before assigning another.' }, { status: 409 });
      const updated = await prisma.user.update({ where: { id: target.id }, data: { role: 'sub_admin', accessPermissions: body.permissions || ['dashboard', 'clients', 'projects', 'tasks', 'team'] } });
      return NextResponse.json({ success: true, user: updated });
    }

    if (body.action === 'update_permissions') {
      if (target.role.toLowerCase() !== 'sub_admin') return NextResponse.json({ error: 'Permissions are configurable only for sub-admins.' }, { status: 400 });
      const updated = await prisma.user.update({ where: { id: target.id }, data: { accessPermissions: body.permissions || [] } });
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
