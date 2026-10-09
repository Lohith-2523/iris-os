import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getRequestUser } from '@/lib/org';
import { cursorHeaders, descendingCursorWhere, finishCursorPage, readCursorPage } from '@/lib/cursor-pagination';
import { z } from 'zod';

const voiceTurnSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(4_000),
  sessionId: z.string().trim().min(1).max(128).optional(),
}).strict();

export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Oops! Please sign in to continue.' }, { status: 401 });

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

    const page = finishCursorPage(sessions, pageRequest.limit, (session) => session.updatedAt);
    return NextResponse.json({
      sessions: page.items.map((session) => ({ id: session.id, title: session.title, updatedAt: session.updatedAt })),
      pagination: { nextCursor: page.nextCursor, hasMore: page.hasMore, limit: pageRequest.limit },
    }, { headers: cursorHeaders(page, pageRequest.limit) });
  } catch (error: any) {
    console.error('Error fetching chat sessions:', error);
    return NextResponse.json({ error: 'Oops! Something went wrong. Please try again.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Oops! Please sign in to continue.' }, { status: 401 });

    const parsed = voiceTurnSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Invalid Miles voice turn.' }, { status: 400 });
    const { role, content, sessionId } = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      let persistedSessionId = sessionId;
      let created = false;
      if (persistedSessionId) {
        const owned = await tx.atlasChatSession.findFirst({
          where: { id: persistedSessionId, userId: user.id, orgId: user.orgId },
          select: { id: true },
        });
        if (!owned) return null;
        await tx.atlasChatSession.update({
          where: { id: persistedSessionId },
          data: { updatedAt: new Date() },
        });
      } else {
        const title = role === 'user'
          ? (content.length > 80 ? `${content.slice(0, 77)}...` : content)
          : 'Voice conversation';
        const session = await tx.atlasChatSession.create({
          data: { title, userId: user.id, orgId: user.orgId },
          select: { id: true },
        });
        persistedSessionId = session.id;
        created = true;
      }
      await tx.askAtlasMessage.create({
        data: { role, content, userId: user.id, orgId: user.orgId, sessionId: persistedSessionId },
      });
      return { sessionId: persistedSessionId, created };
    });

    if (!result) return NextResponse.json({ error: 'Chat session not found' }, { status: 404 });
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Error saving Miles voice turn:', error);
    return NextResponse.json({ error: 'Oops! Something went wrong. Please try again.' }, { status: 500 });
  }
}
