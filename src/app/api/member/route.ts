import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import * as crypto from 'crypto';
import { getAuthenticatedIdentity, getRequestUser, isOrganizationAdmin } from '@/lib/org';

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

      if (!name || !email || !agencyTypes || !Array.isArray(agencyTypes) || agencyTypes.length === 0) {
        return NextResponse.json({ error: 'Missing required parameters. Name, Email, and at least one Agency Type are mandatory.' }, { status: 400 });
      }

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

      const invite = await prisma.memberInvite.create({
        data: {
          name,
          email: normalizedEmail,
          phone: phone || null,
          agencyTypes,
          projects: projects || [],
          token,
          expiresAt,
          orgId: requestingUser.orgId,
        }
      });

      const inviteUrl = new URL('/onboarding/member', request.nextUrl.origin);
      inviteUrl.searchParams.set('token', token);

      // Simulated email text
      const simulatedEmail = `
Subject: Complete your Iris OS Specialist Onboarding
To: ${email}

Hi ${name},

Welcome to ${requestingUser.organization.name}! You have been onboarded as a team specialist in Iris OS and assigned to the following agency disciplines:
${agencyTypes.map(t => `- ${t}`).join('\n')}

To activate your workspace access and set up your credentials, please click the secure link below:
${inviteUrl.toString()}

You can set your account password or link your Google login credentials immediately.

Best regards,
The Iris OS Operations Team
      `.trim();

      return NextResponse.json({
        success: true,
        invite,
        inviteUrl: inviteUrl.toString(),
        simulatedEmail
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

      // 1. Create the Member User in the DB
      const newUser = await prisma.user.create({
        data: {
          email: invite.email,
          authUserId: identity.id,
          name: invite.name,
          role: 'member',
          phone: invite.phone,
          agencyTypes: invite.agencyTypes,
          orgId: invite.orgId,
          preferences: { create: {} },
        }
      });

      // 2. Assign to selected projects
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

      // 3. Mark invite as used
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
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
