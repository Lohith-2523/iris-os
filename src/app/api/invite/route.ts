import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedIdentity } from '@/lib/org';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Missing token parameter' }, { status: 400 });
    }

    const invite = await prisma.clientInvite.findUnique({
      where: { token },
      include: { client: true },
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
    console.error('Error validating invite token:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password, name } = body;

    if (!token || !password) {
      return NextResponse.json({ error: 'Missing token or password parameters' }, { status: 400 });
    }

    const invite = await prisma.clientInvite.findUnique({
      where: { token },
      include: { client: true },
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

    const identity = await getAuthenticatedIdentity();
    if (!identity?.email || identity.email.toLowerCase() !== invite.email.toLowerCase()) {
      return NextResponse.json({ error: 'Authenticate with the invited email before continuing.' }, { status: 401 });
    }

    // 1. Create local user record linked to client
    const existingUser = await prisma.user.findUnique({
      where: { email: invite.email }
    });

    let dbUser;
    if (existingUser) {
      // If user already exists, update their role and link to client
      dbUser = await prisma.user.update({
        where: { email: invite.email },
        data: {
          role: 'client',
          clientId: invite.clientId,
          authUserId: identity.id,
        }
      });
    } else {
      dbUser = await prisma.user.create({
        data: {
          email: invite.email,
          authUserId: identity.id,
          name: name || invite.name || invite.email.split('@')[0],
          role: 'client',
          clientId: invite.clientId,
          orgId: invite.client.orgId,
          preferences: { create: {} },
        }
      });
    }

    // 2. Mark invite as used
    await prisma.clientInvite.update({
      where: { token },
      data: { used: true }
    });

    return NextResponse.json({
      success: true,
      user: {
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role,
        clientId: dbUser.clientId
      }
    });
  } catch (error: any) {
    console.error('Error processing client invite sign-up:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
