import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getRequestUser } from '@/lib/org';
import { normalizePlan } from '@/lib/plan-entitlements';

export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const plan = normalizePlan(user.organization.plan);
    if (plan === 'BASIC') {
      return NextResponse.json({ error: 'Atlas AI is not available on the Basic plan.' }, { status: 403 });
    }

    const sessions = await prisma.atlasChatSession.findMany({
      where: { userId: user.id, orgId: user.orgId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        updatedAt: true,
        workflowType: true,
        workflowState: true,
      },
    });

    const visibleSessions = plan === 'PRO'
      ? sessions.filter((session) => session.workflowType === 'MEETING'
        || (session.workflowType === 'AUTOMATION'
          && typeof session.workflowState === 'object'
          && session.workflowState !== null
          && !Array.isArray(session.workflowState)
          && (session.workflowState as Record<string, unknown>).kind === 'INVOICE'))
      : sessions;
    return NextResponse.json({
      sessions: visibleSessions.map((session) => ({ id: session.id, title: session.title, updatedAt: session.updatedAt })),
    });
  } catch (error: any) {
    console.error('Error fetching chat sessions:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
