import { validateProfileAvatarDataUrl } from '@/lib/profile-avatar';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import * as crypto from 'crypto';
import { getAuthenticatedIdentity, getRequestUser, isOrganizationAdmin } from '@/lib/org';
import {
  assertIrisEmailConfigured,
  IrisEmailDeliveryError,
  sendIrisEmail,
} from '@/lib/email/iris-email';
import { memberOnboardingEmail } from '@/lib/email/iris-templates';
import { entitlementsFor, normalizePlan, planLimitMessage } from '@/lib/plan-entitlements';
import { normalizeRequiredPhone } from '@/lib/phone';
import { normalizeSecurityPages, securityPageLabel } from '@/lib/security-pages';
import { teamMemberWorkspaceHome } from '@/lib/team-member-access';

class TeamPlanLimitError extends Error {}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Missing token parameter' }, { status: 400 });
    }

    const invite = await prisma.memberInvite.findUnique({
      where: { token }
    });

    if (!invite) {
      return NextResponse.json({ error: 'Invalid or expired invite token' }, { status: 404 });
    }

    if (invite.used) {
      return NextResponse.json({ error: 'This invite link has already been used' }, { status: 410 });
    }

    if (invite.expiresAt < new Date()) {
      return NextResponse.json({ error: 'This invite link has expired' }, { status: 410 });
    }

    return NextResponse.json(invite);
  } catch (error: any) {
    console.error('Error fetching member invite details:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    // Action 1: Create an invitation
    if (action === 'invite_member') {
      const requestingUser = await getRequestUser(request);
      if (!requestingUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      if (!isOrganizationAdmin(requestingUser)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      const { name, email, phone, projects } = body;
      const normalizedEmail = String(email || '').trim().toLowerCase();
      const accessPermissions = normalizeSecurityPages(body.accessPermissions);
      const requestedProjects = Array.isArray(projects) ? projects.filter((projectId): projectId is string => typeof projectId === 'string') : [];
      const handlesDeliverables = body.handlesDeliverables === true || requestedProjects.length > 0;

      const normalizedPhone = normalizeRequiredPhone(phone);
      if (!name || !email || !normalizedPhone) {
        return NextResponse.json({ error: 'Name, email, and phone with country code are mandatory.' }, { status: 400 });
      }
      if (accessPermissions.length === 0 && !handlesDeliverables) {
        return NextResponse.json({ error: 'Choose any page or enable the deliverables checkbox to create a workspace for this user.' }, { status: 400 });
      }
      const plan = normalizePlan(requestingUser.organization.plan);
      if (plan === 'BASIC' && accessPermissions.length > 0) {
        return NextResponse.json({ error: 'Individual page access is available on the Pro and Advanced plans.' }, { status: 403 });
      }
      assertIrisEmailConfigured();

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail }
      });

      if (existingUser) {
        return NextResponse.json({ error: 'A team user with this email address already exists.' }, { status: 400 });
      }

      // Check if invitation already exists and is unused
      await prisma.memberInvite.deleteMany({
        where: { email: normalizedEmail, orgId: requestingUser.orgId }
      });

      // Generate random token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

      const { invite, member } = await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`team-capacity:${requestingUser.orgId}`}))`;
        const memberLimit = entitlementsFor(plan).teamMemberLimit;
        if (memberLimit !== null) {
          const memberCount = await tx.user.count({
            where: { orgId: requestingUser.orgId, role: { in: ['member', 'sub_admin'] }, accessRevokedAt: null },
          });
          if (memberCount >= memberLimit) {
            throw new TeamPlanLimitError(planLimitMessage('team members', memberLimit, plan));
          }
        }
        const member = await tx.user.create({
          data: {
            email: normalizedEmail,
            name,
            role: plan === 'BASIC' ? 'member' : 'sub_admin',
            phone: normalizedPhone,
            accessPermissions,
            handlesDeliverables,
            orgId: requestingUser.orgId,
            preferences: { create: {} },
          },
        });

        const assignedProjectIds = requestedProjects;
        if (assignedProjectIds.length > 0) {
          const validProjects = await tx.project.findMany({
            where: { id: { in: assignedProjectIds }, orgId: requestingUser.orgId },
            select: { id: true },
          });
          for (const project of validProjects) {
            await tx.projectMember.create({ data: { projectId: project.id, userId: member.id } });
          }
        }

        const invite = await tx.memberInvite.create({
          data: {
            name,
            email: normalizedEmail,
            phone: normalizedPhone,
            projects: assignedProjectIds,
            accessPermissions,
            handlesDeliverables,
            token,
            expiresAt,
            orgId: requestingUser.orgId,
          },
        });
        return { invite, member };
      });

      const inviteUrl = new URL('/onboarding/member', request.nextUrl.origin);
      inviteUrl.searchParams.set('token', token);

      const emailMessage = memberOnboardingEmail({
        recipientName: name,
        organizationName: requestingUser.organization.name,
        pageAccess: accessPermissions.map(securityPageLabel),
        handlesDeliverables,
        inviteUrl: inviteUrl.toString(),
        expiresAt,
      });
      try {
        await sendIrisEmail({
          to: [normalizedEmail],
          subject: emailMessage.subject,
          html: emailMessage.html,
          text: emailMessage.text,
          idempotencyKey: `member-invite-${token}`,
          tags: [{ name: 'category', value: 'team_onboarding' }],
        });
      } catch (error) {
        if (error instanceof IrisEmailDeliveryError) {
          return NextResponse.json({
            error: error.message,
            inviteCreated: true,
            inviteUrl: inviteUrl.toString(),
          }, { status: error.status });
        }
        throw error;
      }

      return NextResponse.json({
        success: true,
        invite,
        member: { id: member.id, name: member.name, email: member.email },
        inviteUrl: inviteUrl.toString(),
        emailSent: true,
      });
    }

    // Action 2: Complete onboarding (Set password or setup Google login)
    if (action === 'complete_onboarding') {
      const { token } = body;

      if (!token) {
        return NextResponse.json({ error: 'Missing token parameter' }, { status: 400 });
      }

      const invite = await prisma.memberInvite.findUnique({
        where: { token }
      });

      if (!invite || invite.used || invite.expiresAt < new Date()) {
        return NextResponse.json({ error: 'Invalid, used, or expired invite token' }, { status: 400 });
      }

      const identity = await getAuthenticatedIdentity();
      if (!identity?.email || identity.email.toLowerCase() !== invite.email.toLowerCase()) {
        return NextResponse.json({ error: 'Authenticate with the invited email before continuing.' }, { status: 401 });
      }

      const avatarResult = validateProfileAvatarDataUrl(body.avatarDataUrl);
      if ('error' in avatarResult) return NextResponse.json({ error: avatarResult.error }, { status: 400 });
      const avatarUpdate = body.avatarDataUrl === undefined ? {} : { avatarUrl: avatarResult.value };

      // Members created with the invitation are activated here. The create fallback
      // keeps invitations issued before this workflow compatible.
      let newUser = await prisma.user.findFirst({
        where: { email: invite.email, orgId: invite.orgId, role: { in: ['member', 'sub_admin'] } },
      });
      if (newUser) {
        newUser = await prisma.user.update({
          where: { id: newUser.id },
          data: {
            authUserId: identity.id,
            ...avatarUpdate,
            name: invite.name,
            phone: invite.phone,
            accessPermissions: invite.accessPermissions ?? undefined,
            handlesDeliverables: invite.handlesDeliverables || invite.projects.length > 0,
          },
        });
      } else {
        newUser = await prisma.$transaction(async (tx) => {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`team-capacity:${invite.orgId}`}))`;
          const organization = await tx.organization.findUniqueOrThrow({ where: { id: invite.orgId }, select: { plan: true } });
          const plan = normalizePlan(organization.plan);
          const memberLimit = entitlementsFor(plan).teamMemberLimit;
          if (memberLimit !== null) {
            const memberCount = await tx.user.count({ where: { orgId: invite.orgId, role: { in: ['member', 'sub_admin'] }, accessRevokedAt: null } });
            if (memberCount >= memberLimit) {
              throw new TeamPlanLimitError(planLimitMessage('team members', memberLimit, plan));
            }
          }
          return tx.user.create({
            data: {
              email: invite.email,
              authUserId: identity.id,
              ...avatarUpdate,
              name: invite.name,
              role: plan === 'BASIC' ? 'member' : 'sub_admin',
              phone: invite.phone,
              accessPermissions: invite.accessPermissions ?? undefined,
              handlesDeliverables: invite.handlesDeliverables || invite.projects.length > 0,
              orgId: invite.orgId,
              preferences: { create: {} },
            },
          });
        });

        // Legacy invitations did not create an agency member until completion.
        if (invite.projects && invite.projects.length > 0) {
          for (const projectId of invite.projects) {
          try {
            const project = await prisma.project.findFirst({ where: { id: projectId, orgId: invite.orgId }, select: { id: true } });
            if (!project) continue;
            await prisma.projectMember.create({
              data: {
                projectId,
                userId: newUser.id
              }
            });
          } catch (err) {
            console.error(`Failed to assign member to project ${projectId}:`, err);
          }
        }
        }
      }

      // Mark invite as used after the agency member has been activated.
      await prisma.memberInvite.update({
        where: { token },
        data: { used: true }
      });

      return NextResponse.json({
        success: true,
        user: {
          email: newUser.email,
          name: newUser.name,
          role: newUser.role
        },
        destination: teamMemberWorkspaceHome({
          role: newUser.role,
          plan: newUser.role === 'member' ? 'BASIC' : 'PRO',
          accessPermissions: newUser.accessPermissions as string[] | null,
          deliveryWorkspace: newUser.handlesDeliverables || invite.projects.length > 0,
        }),
      });
    }

    return NextResponse.json({ error: 'Invalid action specified' }, { status: 400 });
  } catch (error: any) {
    console.error('Error processing member route request:', error);
    if (error instanceof TeamPlanLimitError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof IrisEmailDeliveryError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
