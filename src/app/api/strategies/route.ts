import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getRequestUser, isOrganizationAdmin } from '@/lib/org';
import { entitlementsFor, normalizePlan } from '@/lib/plan-entitlements';
import { AtlasTokenLimitError } from '@/lib/atlas-ai/token-budget';
import {
  AtlasStrategyError,
  generateStrategyWithAtlas,
  type StrategyKind,
} from '@/lib/strategies/atlas';
import { cursorHeaders, descendingCursorWhere, finishCursorPage, readCursorPage } from '@/lib/cursor-pagination';

export const runtime = 'nodejs';

const STRATEGY_TYPES = new Set<StrategyKind>(['UPSELL', 'MARKETING', 'FINANCIAL']);

function stringValue(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function stringIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean))].slice(0, 100);
}

function strategyTitle(content: string, type: StrategyKind, customTitle: string) {
  if (customTitle) return customTitle;
  const heading = content.split('\n').map((line) => line.trim()).find((line) => /^#\s+/.test(line));
  return (heading?.replace(/^#\s+/, '').trim() || `${type.charAt(0)}${type.slice(1).toLowerCase()} strategy`).slice(0, 140);
}

async function strategyContext(orgId: string, clientIds: string[], projectIds: string[]) {
  const [clients, projects] = await Promise.all([
    prisma.client.findMany({
      where: {
        orgId,
        ...(clientIds.length ? { id: { in: clientIds } } : {}),
      },
      select: {
        id: true,
        name: true,
        status: true,
        churnRiskScore: true,
        renewalDate: true,
        upsellOpportunityValue: true,
        agencyType: true,
        businessModel: true,
      },
      orderBy: { name: 'asc' },
      take: 100,
    }),
    prisma.project.findMany({
      where: {
        orgId,
        ...(projectIds.length ? { id: { in: projectIds } } : {}),
        ...(clientIds.length ? { clientId: { in: clientIds } } : {}),
      },
      select: {
        id: true,
        name: true,
        status: true,
        startDate: true,
        endDate: true,
        progress: true,
        riskLevel: true,
        riskDescription: true,
        timeline: true,
        serviceLine: true,
        budget: true,
        paymentType: true,
        paymentAmount: true,
        paymentFrequency: true,
        paymentTerms: true,
        clientId: true,
        client: { select: { name: true } },
      },
      orderBy: { name: 'asc' },
      take: 100,
    }),
  ]);
  return { clients, projects };
}

export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Oops! Please sign in to continue.' }, { status: 401 });
    if (!isOrganizationAdmin(user)) return NextResponse.json({ error: 'Oops! You do not have enough permissions.' }, { status: 403 });
    if (!entitlementsFor(user.organization.plan).strategyGeneration) {
      return NextResponse.json({ error: 'Strategy generation is available on the Advanced plan.' }, { status: 403 });
    }
    const typeParam = request.nextUrl.searchParams.get('type')?.toUpperCase() as StrategyKind | undefined;
    const type = typeParam && STRATEGY_TYPES.has(typeParam) ? typeParam : undefined;
    const pageRequest = readCursorPage(request);

    const [strategies, context] = await Promise.all([
      prisma.strategy.findMany({
        where: { orgId: user.orgId, ...(type ? { type } : {}), ...descendingCursorWhere(pageRequest.cursor, 'createdAt') },
        select: {
          id: true,
          type: true,
          title: true,
          goal: true,
          timeline: true,
          targetAudience: true,
          constraints: true,
          additionalNotes: true,
          content: true,
          model: true,
          createdAt: true,
          updatedAt: true,
          createdBy: { select: { name: true } },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: pageRequest.take,
      }),
      strategyContext(user.orgId, [], []),
    ]);
    const page = finishCursorPage(strategies, pageRequest.limit, (strategy) => strategy.createdAt);
    return NextResponse.json({
      strategies: page.items,
      clients: context.clients.map(({ id, name, status }) => ({ id, name, status })),
      projects: context.projects.map(({ id, name, status, clientId, client }) => ({
        id,
        name,
        status,
        clientId,
        clientName: client.name,
      })),
      dataPolicy: 'Manual IrisOS Client and Project records only. Connected integrations are excluded.',
      pagination: { nextCursor: page.nextCursor, hasMore: page.hasMore, limit: pageRequest.limit },
    }, { headers: cursorHeaders(page, pageRequest.limit) });
  } catch (error) {
    console.error('Unable to load strategies:', error);
    return NextResponse.json({ error: 'Unable to load strategy history.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Oops! Please sign in to continue.' }, { status: 401 });
    if (!isOrganizationAdmin(user)) return NextResponse.json({ error: 'Oops! You do not have enough permissions.' }, { status: 403 });
    if (!entitlementsFor(user.organization.plan).strategyGeneration) {
      return NextResponse.json({ error: 'Strategy generation is available on the Advanced plan.' }, { status: 403 });
    }
    if (!user.organization.aiSharingConsent) {
      return NextResponse.json({
        error: 'Enable Miles AI Analysis in Settings > AI Settings & Data Privacy before sending workspace records to Miles AI.',
      }, { status: 403 });
    }

    const body = await request.json() as Record<string, unknown>;
    const type = stringValue(body.type, 20).toUpperCase() as StrategyKind;
    const title = stringValue(body.title, 140);
    const goal = stringValue(body.goal, 1500);
    const timeline = stringValue(body.timeline, 240);
    const targetAudience = stringValue(body.targetAudience, 800);
    const constraints = stringValue(body.constraints, 1200);
    const additionalNotes = stringValue(body.additionalNotes, 2000);
    const clientIds = stringIds(body.clientIds);
    const projectIds = stringIds(body.projectIds);

    if (!STRATEGY_TYPES.has(type)) {
      return NextResponse.json({ error: 'Choose upsell, marketing, or financial strategy.' }, { status: 400 });
    }
    if (!goal) return NextResponse.json({ error: 'An end goal is required.' }, { status: 400 });
    if (!timeline) return NextResponse.json({ error: 'A strategy timeline is required.' }, { status: 400 });

    const context = await strategyContext(user.orgId, clientIds, projectIds);
    if (clientIds.length && context.clients.length !== clientIds.length) {
      return NextResponse.json({ error: 'One or more selected clients are unavailable.' }, { status: 400 });
    }
    if (projectIds.length && context.projects.length !== projectIds.length) {
      return NextResponse.json({ error: 'One or more selected projects are unavailable.' }, { status: 400 });
    }

    const generated = await generateStrategyWithAtlas({
      type,
      goal,
      timeline,
      targetAudience,
      constraints,
      additionalNotes,
      organizationName: user.organization.name,
      currency: user.organization.currency,
      clients: context.clients,
      projects: context.projects,
      tokenBudget: { orgId: user.orgId, userId: user.id, userRole: user.role, plan: normalizePlan(user.organization.plan) },
    });
    const inputSnapshot = {
      type,
      goal,
      timeline,
      targetAudience: targetAudience || null,
      constraints: constraints || null,
      additionalNotes: additionalNotes || null,
      clientIds,
      projectIds,
    };
    const contextSnapshot = {
      source: 'IRIS_OS_MANUAL_CLIENT_PROJECT_RECORDS',
      integrationsExcluded: true,
      clients: context.clients,
      projects: context.projects,
    };
    const strategy = await prisma.strategy.create({
      data: {
        type,
        title: strategyTitle(generated.content, type, title),
        goal,
        timeline,
        targetAudience: targetAudience || null,
        constraints: constraints || null,
        additionalNotes: additionalNotes || null,
        content: generated.content,
        model: generated.model,
        inputSnapshot: inputSnapshot as Prisma.InputJsonValue,
        contextSnapshot: contextSnapshot as Prisma.InputJsonValue,
        orgId: user.orgId,
        createdById: user.id,
      },
      include: { createdBy: { select: { name: true } } },
    });
    return NextResponse.json({ strategy }, { status: 201 });
  } catch (error) {
    if (error instanceof AtlasStrategyError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof AtlasTokenLimitError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Unable to create strategy:', error);
    return NextResponse.json({ error: 'Unable to create the strategy.' }, { status: 500 });
  }
}
