import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { buildDailyBriefing, DAILY_BRIEFING_VERSION, dailyBriefingBusinessDate, normalizeBriefingTimeZone, type DailyBriefingPayload } from '@/lib/daily-briefing';
import { getDeliveryDelaySummary } from '@/lib/delivery-delays';
import { getRequestUser, isOrganizationAdmin } from '@/lib/org';

type StoredDailyBriefing = {
  id: string;
  businessDate: string;
  timeZone: string;
  payload: DailyBriefingPayload;
  readCount: number;
  openedAt: string | null;
  completedAt: string | null;
};

function settingsObject(value: Prisma.JsonValue | null | undefined) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {} as Record<string, Prisma.JsonValue>;
  return value as Record<string, Prisma.JsonValue>;
}

function storedBriefing(value: Prisma.JsonValue | null | undefined, businessDate: string) {
  const candidate = settingsObject(value).dailyBriefing;
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return null;
  const record = candidate as Record<string, Prisma.JsonValue>;
  if (record.businessDate !== businessDate || !record.payload || typeof record.payload !== 'object') return null;
  const payload = record.payload as Record<string, Prisma.JsonValue>;
  if (payload.version !== DAILY_BRIEFING_VERSION) return null;
  return candidate as unknown as StoredDailyBriefing;
}

async function updateStoredBriefing(
  userId: string,
  businessDate: string,
  update: (briefing: StoredDailyBriefing) => StoredDailyBriefing,
) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`daily-briefing:${userId}`}))`;
    const preference = await tx.userPreference.findUnique({ where: { userId }, select: { settings: true } });
    const settings = settingsObject(preference?.settings);
    const current = storedBriefing(settings, businessDate);
    if (!current) throw new Error('Daily briefing state is unavailable');
    const next = update(current);
    const nextSettings = {
      ...settings,
      dailyBriefing: next as unknown as Prisma.InputJsonValue,
    } as Prisma.InputJsonObject;
    await tx.userPreference.upsert({
      where: { userId },
      create: { userId, settings: nextSettings },
      update: { settings: nextSettings },
    });
    return next;
  });
}

async function generateDailyBriefing(
  user: NonNullable<Awaited<ReturnType<typeof getRequestUser>>>,
  timeZone: string,
  db: Prisma.TransactionClient,
) {
  const now = new Date();
  const historyStart = new Date(now.getTime() - 75 * 24 * 60 * 60 * 1000);
  const meetingHorizon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [tasks, transactions, invoices, meetings, projects, leads, clients] = await Promise.all([
    db.clientTask.findMany({
      where: { client: { orgId: user.orgId }, status: { not: 'COMPLETED' } },
      select: { title: true, status: true, deadline: true, project: { select: { name: true } } },
      orderBy: [{ deadline: 'asc' }, { updatedAt: 'desc' }],
    }),
    db.transaction.findMany({
      where: { orgId: user.orgId, category: 'Revenue', amount: { gt: 0 }, date: { gte: historyStart } },
      select: { amount: true, date: true },
    }),
    db.invoice.findMany({
      where: { orgId: user.orgId, documentType: 'INVOICE', status: { not: 'FULLY_PAID' } },
      select: { amount: true, paidAmount: true, dueDate: true, status: true, invoiceNumber: true },
      orderBy: { dueDate: 'asc' },
    }),
    db.calendarEvent.findMany({
      where: { orgId: user.orgId, startTime: { gte: now, lte: meetingHorizon } },
      select: { title: true, startTime: true, attendees: true },
      orderBy: { startTime: 'asc' },
    }),
    db.project.findMany({
      where: { orgId: user.orgId, status: { not: 'COMPLETED' } },
      select: {
        name: true,
        status: true,
        progress: true,
        tasks: { select: { title: true, status: true, deadline: true, stageId: true } },
        stages: { select: { id: true, name: true, endDate: true } },
      },
      orderBy: { updatedAt: 'desc' },
    }),
    db.agencyLead.findMany({
      where: { orgId: user.orgId, status: { in: ['warm', 'procured', 'Warm', 'Procured'] } },
      select: { fullName: true, status: true, estimatedClientValue: true },
      orderBy: { updatedAt: 'desc' },
    }),
    db.client.findMany({
      where: { orgId: user.orgId, status: 'ACTIVE' },
      select: { name: true, churnRiskScore: true, renewalDate: true },
      orderBy: { churnRiskScore: 'desc' },
    }),
  ]);

  return buildDailyBriefing({
    userName: user.name,
    currency: user.organization.currency,
    timeZone,
    now,
    tasks: tasks.map((task) => ({
      title: task.title,
      status: task.status,
      deadline: task.deadline,
      projectName: task.project?.name || null,
    })),
    transactions,
    invoices,
    meetings,
    projects: projects.map((project) => {
      const delays = getDeliveryDelaySummary(project, now);
      return {
        name: project.name,
        status: project.status,
        progress: project.progress,
        delayedStages: delays.delayedStages.map((stage) => stage.name || 'Unnamed stage'),
        delayedTasks: delays.delayedTasks.map((task) => task.title || 'Untitled task'),
      };
    }),
    leads,
    clients,
  });
}

async function ensureDailyBriefing(user: NonNullable<Awaited<ReturnType<typeof getRequestUser>>>, timeZone: string) {
  const businessDate = dailyBriefingBusinessDate(new Date(), timeZone);
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`daily-briefing:${user.id}`}))`;
    const preference = await tx.userPreference.findUnique({ where: { userId: user.id }, select: { settings: true } });
    const settings = settingsObject(preference?.settings);
    const existing = storedBriefing(settings, businessDate);
    if (existing) return existing;

    const payload = await generateDailyBriefing(user, timeZone, tx);
    const briefing: StoredDailyBriefing = {
      id: `${user.id}:${businessDate}`,
      businessDate,
      timeZone,
      payload,
      readCount: 0,
      openedAt: null,
      completedAt: null,
    };
    const nextSettings = {
      ...settings,
      dailyBriefing: briefing as unknown as Prisma.InputJsonValue,
    } as Prisma.InputJsonObject;
    await tx.userPreference.upsert({
      where: { userId: user.id },
      create: { userId: user.id, settings: nextSettings },
      update: { settings: nextSettings },
    });
    return briefing;
  }, { timeout: 15_000 });
}

async function authorizedAdmin() {
  const user = await getRequestUser();
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) } as const;
  if (!isOrganizationAdmin(user)) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) } as const;
  return { user } as const;
}

export async function GET(request: NextRequest) {
  try {
    const authorization = await authorizedAdmin();
    if ('error' in authorization) return authorization.error;

    const timeZone = normalizeBriefingTimeZone(request.nextUrl.searchParams.get('timeZone'));
    const businessDate = dailyBriefingBusinessDate(new Date(), timeZone);
    const intent = request.nextUrl.searchParams.get('intent') || 'briefing';

    if (intent === 'status') {
      const briefing = storedBriefing(authorization.user.preferences?.settings, businessDate);
      return NextResponse.json({
        businessDate,
        shouldOpen: !briefing?.openedAt,
        completed: Boolean(briefing?.completedAt),
        readCount: briefing?.readCount || 0,
      });
    }

    const briefing = await ensureDailyBriefing(authorization.user, timeZone);
    return NextResponse.json(briefing);
  } catch (error) {
    console.error('Unable to load daily briefing:', error);
    return NextResponse.json({ error: 'Unable to prepare the daily briefing.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authorization = await authorizedAdmin();
    if ('error' in authorization) return authorization.error;

    const body = await request.json() as { action?: string; readCount?: number; timeZone?: string };
    const timeZone = normalizeBriefingTimeZone(body.timeZone);
    const briefing = await ensureDailyBriefing(authorization.user, timeZone);

    if (body.action === 'open') {
      const opened = await updateStoredBriefing(authorization.user.id, briefing.businessDate, (current) => ({
        ...current,
        openedAt: current.openedAt || new Date().toISOString(),
      }));
      return NextResponse.json({ success: true, openedAt: opened.openedAt });
    }

    if (body.action === 'progress') {
      const totalItems = briefing.payload.items.length;
      const requestedCount = Number.isFinite(body.readCount) ? Math.floor(body.readCount || 0) : 0;
      const updated = await updateStoredBriefing(authorization.user.id, briefing.businessDate, (current) => {
        const readCount = Math.min(totalItems, Math.max(current.readCount, requestedCount));
        return {
          ...current,
          readCount,
          completedAt: readCount >= totalItems ? (current.completedAt || new Date().toISOString()) : current.completedAt,
          openedAt: current.openedAt || new Date().toISOString(),
        };
      });
      return NextResponse.json({ success: true, readCount: updated.readCount, completedAt: updated.completedAt });
    }

    return NextResponse.json({ error: 'Invalid daily briefing action.' }, { status: 400 });
  } catch (error) {
    console.error('Unable to update daily briefing:', error);
    return NextResponse.json({ error: 'Unable to update the daily briefing.' }, { status: 500 });
  }
}
