import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getRequestUser, isOrganizationAdmin } from '@/lib/org';
import { sendIrisEmail } from '@/lib/email/iris-email';
import { teamOffboardingEmail } from '@/lib/email/iris-templates';
import { SECURITY_ALLOWED_PAGES } from '@/lib/security-pages';
import { purgeWorkspaceUsers } from '@/server/domains/member-deletion-service';
import { createAuthenticationUserDeleter } from '@/server/domains/auth-user-deletion';
import { entitlementsFor, normalizePlan, planLimitMessage } from '@/lib/plan-entitlements';

class CoreTeamPlanLimitError extends Error {}

const schema = z.object({
  action: z.enum(['make_sub_admin', 'update_permissions', 'update_access', 'offboard']),
  userId: z.string().uuid(),
  permissions: z.array(z.enum(SECURITY_ALLOWED_PAGES)).optional(),
  handlesDeliverables: z.boolean().optional(),
  feedback: z.string().trim().min(5).max(3000).optional(),
  deleteRelatedData: z.boolean().optional(),
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
      const updated = await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`core-team-capacity:${admin.orgId}`}))`;
        const plan = normalizePlan(admin.organization.plan);
        const limit = entitlementsFor(plan).coreTeamMemberLimit;
        const count = await tx.user.count({ where: { orgId: admin.orgId, role: 'sub_admin', accessRevokedAt: null } });
        if (count >= limit) throw new CoreTeamPlanLimitError(planLimitMessage('core team members', limit, plan));
        return tx.user.update({ where: { id: target.id }, data: { role: 'sub_admin', accessPermissions: body.permissions || [], handlesDeliverables: body.handlesDeliverables ?? true } });
      });
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
      const nextRole = permissions.length > 0 ? 'sub_admin' : 'member';
      const updated = await prisma.$transaction(async (tx) => {
        if (nextRole === 'sub_admin' && target.role.toLowerCase() !== 'sub_admin') {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`core-team-capacity:${admin.orgId}`}))`;
          const plan = normalizePlan(admin.organization.plan);
          const limit = entitlementsFor(plan).coreTeamMemberLimit;
          const count = await tx.user.count({ where: { orgId: admin.orgId, role: 'sub_admin', accessRevokedAt: null } });
          if (count >= limit) throw new CoreTeamPlanLimitError(planLimitMessage('core team members', limit, plan));
        }
        return tx.user.update({
          where: { id: target.id },
          data: {
            role: nextRole,
            accessPermissions: permissions,
            ...(body.action === 'update_access' ? { handlesDeliverables: body.handlesDeliverables ?? false } : {}),
          },
        });
      });
      return NextResponse.json({ success: true, user: updated });
    }

    if (!body.feedback) return NextResponse.json({ error: 'Offboarding feedback is required.' }, { status: 400 });
    if (body.deleteRelatedData !== true) return NextResponse.json({ error: 'Confirm deletion of all related team member data.' }, { status: 400 });
    if (!['member', 'sub_admin'].includes(target.role.toLowerCase())) return NextResponse.json({ error: 'Only team members can be offboarded from this workflow.' }, { status: 400 });
    const deleteAuthenticationUsers = target.authUserId ? createAuthenticationUserDeleter() : null;
    await prisma.$transaction(
      (tx) => purgeWorkspaceUsers(tx, admin.orgId, [{ id: target.id, authUserId: target.authUserId, email: target.email }]),
      { maxWait: 10_000, timeout: 60_000 },
    );
    if (target.authUserId && deleteAuthenticationUsers) await deleteAuthenticationUsers([target.authUserId]);
    let emailSent = false;
    try {
      const email = teamOffboardingEmail({
        recipientName: target.name,
        organizationName: admin.organization.name,
        administratorName: admin.name,
        administratorEmail: admin.email,
        feedback: body.feedback,
      });
      await sendIrisEmail({
        to: [target.email],
        subject: email.subject,
        text: email.text,
        html: email.html,
        idempotencyKey: `offboard-${target.id}`,
        tags: [{ name: 'category', value: 'team_offboarding' }],
      });
      emailSent = true;
    } catch (emailError) {
      console.error('Offboarding email could not be delivered:', emailError);
    }
    return NextResponse.json({ success: true, emailSent });
  } catch (error) {
    if (error instanceof CoreTeamPlanLimitError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error('Unable to update workspace security:', error);
    return NextResponse.json({ error: 'Unable to update workspace security' }, { status: 500 });
  }
}
