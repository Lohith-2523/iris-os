import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getRequestUser } from '@/lib/org';
import { cursorHeaders, descendingCursorWhere, finishCursorPage, readCursorPage } from '@/lib/cursor-pagination';

const notificationSchema = z.object({
  action: z.enum(['create', 'mark_read', 'mark_all_read', 'delete']),
  id: z.string().uuid().optional(),
  type: z.enum(['UPDATE', 'APPROVAL', 'MESSAGE', 'DELAY', 'REMINDER', 'ISSUE']).optional(),
  title: z.string().trim().min(2).max(160).optional(),
  body: z.string().trim().min(2).max(1000).optional(),
  href: z.string().trim().max(500).nullable().optional(),
  actionLabel: z.string().trim().max(80).nullable().optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Oops! Please sign in to continue.' }, { status: 401 });
    const now = new Date();
    const pageRequest = readCursorPage(request, { defaultLimit: 50 });
    const visibilityWhere = {
      orgId: user.orgId,
      OR: [{ userId: user.id }, { userId: null }],
      AND: [{ OR: [{ scheduledAt: null }, { scheduledAt: { lte: now } }] }],
    };
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { ...visibilityWhere, AND: [...visibilityWhere.AND, descendingCursorWhere(pageRequest.cursor, 'createdAt')] },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: pageRequest.take,
      }),
      prisma.notification.count({ where: { ...visibilityWhere, readAt: null } }),
    ]);
    const page = finishCursorPage(notifications, pageRequest.limit, (notification) => notification.createdAt);
    page.items.sort((left, right) => Number(Boolean(left.readAt)) - Number(Boolean(right.readAt)));
    return NextResponse.json({
      notifications: page.items,
      unreadCount,
      pagination: { nextCursor: page.nextCursor, hasMore: page.hasMore, limit: pageRequest.limit },
    }, { headers: cursorHeaders(page, pageRequest.limit) });
  } catch (error) {
    console.error('Unable to load notifications:', error);
    return NextResponse.json({ error: 'Unable to load notifications' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Oops! Please sign in to continue.' }, { status: 401 });
    const parsed = notificationSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'Invalid notification request', issues: parsed.error.issues }, { status: 400 });
    const body = parsed.data;

    if (body.action === 'mark_all_read') {
      await prisma.notification.updateMany({
        where: { orgId: user.orgId, OR: [{ userId: user.id }, { userId: null }], readAt: null },
        data: { readAt: new Date() },
      });
      return NextResponse.json({ success: true });
    }
    if (!body.id && body.action !== 'create') return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 });
    if (body.action === 'mark_read') {
      await prisma.notification.updateMany({
        where: { id: body.id, orgId: user.orgId, OR: [{ userId: user.id }, { userId: null }] },
        data: { readAt: new Date() },
      });
      return NextResponse.json({ success: true });
    }
    if (body.action === 'delete') {
      await prisma.notification.deleteMany({ where: { id: body.id, orgId: user.orgId, userId: user.id } });
      return NextResponse.json({ success: true });
    }
    if (!body.type || !body.title || !body.body) return NextResponse.json({ error: 'Type, title, and message are required' }, { status: 400 });
    const notification = await prisma.notification.create({
      data: {
        orgId: user.orgId,
        userId: user.id,
        type: body.type,
        title: body.title,
        body: body.body,
        href: body.href || null,
        actionLabel: body.actionLabel || null,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
      },
    });
    return NextResponse.json({ success: true, notification });
  } catch (error) {
    console.error('Unable to update notifications:', error);
    return NextResponse.json({ error: 'Unable to update notifications' }, { status: 500 });
  }
}
