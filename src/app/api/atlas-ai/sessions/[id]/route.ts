import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getRequestUser } from '@/lib/org';
import { normalizePlan } from '@/lib/plan-entitlements';

function proSessionAllowed(session: { workflowType: string | null; workflowState: unknown }) {
  if (session.workflowType === 'MEETING') return true;
  return session.workflowType === 'AUTOMATION'
    && typeof session.workflowState === 'object'
    && session.workflowState !== null
    && !Array.isArray(session.workflowState)
    && (session.workflowState as Record<string, unknown>).kind === 'INVOICE';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const plan = normalizePlan(user.organization.plan);
    if (plan === 'BASIC') return NextResponse.json({ error: 'Atlas AI is not available on the Basic plan.' }, { status: 403 });

    const session = await prisma.atlasChatSession.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            role: true,
            content: true,
            createdAt: true,
          }
        },
      },
    });

    if (!session || session.userId !== user.id || session.orgId !== user.orgId) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    if (plan === 'PRO' && !proSessionAllowed(session)) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    return NextResponse.json(session);
  } catch (error: any) {
    console.error('Error fetching chat session:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const plan = normalizePlan(user.organization.plan);
    if (plan === 'BASIC') return NextResponse.json({ error: 'Atlas AI is not available on the Basic plan.' }, { status: 403 });

    const session = await prisma.atlasChatSession.findUnique({
      where: { id },
    });

    if (!session || session.userId !== user.id || session.orgId !== user.orgId) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    if (plan === 'PRO' && !proSessionAllowed(session)) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    await prisma.atlasChatSession.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting chat session:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
