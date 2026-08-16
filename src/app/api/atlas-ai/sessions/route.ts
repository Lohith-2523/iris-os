import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getRequestUser } from '@/lib/org';
import { normalizePlan } from '@/lib/plan-entitlements';
import { cursorHeaders, descendingCursorWhere, finishCursorPage, readCursorPage } from '@/lib/cursor-pagination';

export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const plan = normalizePlan(user.organization.plan);
    if (plan === 'BASIC') {
      return NextResponse.json({ error: 'Atlas AI is not available on the Basic plan.' }, { status: 403 });
    }

    const pageRequest = readCursorPage(request);
    const sessions = await prisma.atlasChatSession.findMany({
      where: { userId: user.id, orgId: user.orgId, ...descendingCursorWhere(pageRequest.cursor, 'updatedAt') },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: pageRequest.take,
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
    const page = finishCursorPage(visibleSessions, pageRequest.limit, (session) => session.updatedAt);
    return NextResponse.json({
      sessions: page.items.map((session) => ({ id: session.id, title: session.title, updatedAt: session.updatedAt })),
      pagination: { nextCursor: page.nextCursor, hasMore: page.hasMore, limit: pageRequest.limit },
    }, { headers: cursorHeaders(page, pageRequest.limit) });
  } catch (error: any) {
    console.error('Error fetching chat sessions:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
