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
import { entitlementsFor, planLimitMessage } from '@/lib/plan-entitlements';
import { normalizeRequiredPhone } from '@/lib/phone';

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
      const { name, email, phone, agencyTypes, projects } = body;
      const normalizedEmail = String(email || '').trim().toLowerCase();

      const normalizedPhone = normalizeRequiredPhone(phone);
      if (!name || !email || !normalizedPhone || !agencyTypes || !Array.isArray(agencyTypes) || agencyTypes.length === 0) {
        return NextResponse.json({ error: 'Name, email, phone with country code, and at least one specialization are mandatory.' }, { status: 400 });
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
        const memberCount = await tx.user.count({
          where: { orgId: requestingUser.orgId, role: 'member' },
        });
        const memberLimit = entitlementsFor(requestingUser.organization.plan).teamMemberLimit;
        if (memberCount >= memberLimit) {
          throw new TeamPlanLimitError(planLimitMessage('team members', memberLimit, requestingUser.organization.plan));
        }
        const member = await tx.user.create({
          data: {
            email: normalizedEmail,
            name,
            role: 'member',
            phone: normalizedPhone,
            agencyTypes,
            orgId: requestingUser.orgId,
            preferences: { create: {} },
          },
        });

        const assignedProjectIds = Array.isArray(projects) ? projects.filter((projectId) => typeof projectId === 'string') : [];
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
            agencyTypes,
            projects: assignedProjectIds,
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
        agencyTypes,
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

      // Members created with the invitation are activated here. The create fallback
      // keeps invitations issued before this workflow compatible.
      let newUser = await prisma.user.findFirst({
        where: { email: invite.email, orgId: invite.orgId, role: 'member' },
      });
      if (newUser) {
        newUser = await prisma.user.update({
          where: { id: newUser.id },
          data: {
            authUserId: identity.id,
            name: invite.name,
            phone: invite.phone,
            agencyTypes: invite.agencyTypes,
          },
        });
      } else {
        newUser = await prisma.$transaction(async (tx) => {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`team-capacity:${invite.orgId}`}))`;
          const [organization, memberCount] = await Promise.all([
            tx.organization.findUniqueOrThrow({ where: { id: invite.orgId }, select: { plan: true } }),
            tx.user.count({ where: { orgId: invite.orgId, role: 'member' } }),
          ]);
          const memberLimit = entitlementsFor(organization.plan).teamMemberLimit;
          if (memberCount >= memberLimit) {
            throw new TeamPlanLimitError(planLimitMessage('team members', memberLimit, organization.plan));
          }
          return tx.user.create({
            data: {
              email: invite.email,
              authUserId: identity.id,
              name: invite.name,
              role: 'member',
              phone: invite.phone,
              agencyTypes: invite.agencyTypes,
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
        }
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
