import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import * as crypto from 'crypto';
import { getOrganization } from '@/lib/org';

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
      const { name, email, phone, agencyTypes, projects } = body;

      if (!name || !email || !agencyTypes || !Array.isArray(agencyTypes) || agencyTypes.length === 0) {
        return NextResponse.json({ error: 'Missing required parameters. Name, Email, and at least one Agency Type are mandatory.' }, { status: 400 });
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        return NextResponse.json({ error: 'A team user with this email address already exists.' }, { status: 400 });
      }

      // Check if invitation already exists and is unused
      await prisma.memberInvite.deleteMany({
        where: { email }
      });

      // Generate random token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

      const invite = await prisma.memberInvite.create({
        data: {
          name,
          email,
          phone: phone || null,
          agencyTypes,
          projects: projects || [],
          token,
          expiresAt
        }
      });

      // Simulated email text
      const simulatedEmail = `
Subject: Complete your Iris OS Specialist Onboarding
To: ${email}

Hi ${name},

Welcome to Apex Creative Group! You have been onboarded as a team specialist in Iris OS and assigned to the following agency disciplines:
${agencyTypes.map(t => `- ${t}`).join('\n')}

To activate your workspace access and set up your credentials, please click the secure link below:
http://localhost:3000/onboarding/member?token=${token}

You can set your account password or link your Google login credentials immediately.

Best regards,
The Iris OS Operations Team
      `.trim();

      return NextResponse.json({
        success: true,
        invite,
        simulatedEmail
      });
    }

    // Action 2: Complete onboarding (Set password or setup Google login)
    if (action === 'complete_onboarding') {
      const { token, password, useGoogle } = body;

      if (!token) {
        return NextResponse.json({ error: 'Missing token parameter' }, { status: 400 });
      }

      const invite = await prisma.memberInvite.findUnique({
        where: { token }
      });

      if (!invite || invite.used || invite.expiresAt < new Date()) {
        return NextResponse.json({ error: 'Invalid, used, or expired invite token' }, { status: 400 });
      }

      // Get primary organization
      const org = await getOrganization(request);
      if (!org) {
        return NextResponse.json({ error: 'Organization not found' }, { status: 500 });
      }

      // 1. Create the Member User in the DB
      const newUser = await prisma.user.create({
        data: {
          email: invite.email,
          name: invite.name,
          role: 'member',
          phone: invite.phone,
          agencyTypes: invite.agencyTypes,
          orgId: org.id
        }
      });

      // 2. Assign to selected projects
      if (invite.projects && invite.projects.length > 0) {
        for (const projectId of invite.projects) {
          try {
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
