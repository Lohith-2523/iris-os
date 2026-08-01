import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getRequestUser, isOrganizationAdmin } from '@/lib/org';

const patchSchema = z.object({
  organization: z.object({
    name: z.string().trim().min(2).max(120).optional(),
    billingEmail: z.email().trim().toLowerCase().nullable().optional(),
    currency: z.enum(['USD', 'EUR', 'GBP', 'INR', 'CAD']).optional(),
    preferences: z.record(z.string(), z.unknown()).optional(),
  }).optional(),
  user: z.object({
    username: z.string().trim().min(2).max(64).regex(/^[a-zA-Z0-9._-]+$/).nullable().optional(),
    preferences: z.object({
      theme: z.enum(['dark', 'light']).optional(),
      settings: z.record(z.string(), z.unknown()).optional(),
    }).optional(),
  }).optional(),
  onboarding: z.object({
    needsOnboarding: z.boolean().optional(),
    currentStep: z.number().int().min(0).max(50).optional(),
    checklist: z.record(z.string(), z.unknown()).optional(),
    draft: z.record(z.string(), z.unknown()).optional(),
    completed: z.boolean().optional(),
  }).optional(),
}).strict();

export async function GET() {
  try {
    const user = await getRequestUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [organizationIntegrations, googleCalendarConnection, reportCount, atlasSessionCount] = await Promise.all([
      prisma.integrationConnection.findMany({
        where: { orgId: user.orgId, provider: { not: 'GOOGLE' } },
        select: { provider: true, status: true, lastSync: true },
        orderBy: { provider: 'asc' },
      }),
      prisma.googleCalendarConnection.findUnique({
        where: { userId: user.id },
        select: { status: true, lastSync: true },
      }),
      prisma.report.count({ where: { orgId: user.orgId } }),
      prisma.atlasChatSession.count({ where: { orgId: user.orgId } }),
    ]);
    const integrations = [
      ...organizationIntegrations,
      {
        provider: 'GOOGLE',
        status: googleCalendarConnection?.status || 'DISCONNECTED',
        lastSync: googleCalendarConnection?.lastSync || null,
      },
    ];

    const response = NextResponse.json({
      organization: {
        id: user.organization.id,
        name: user.organization.name,
        plan: user.organization.plan,
        billingEmail: user.organization.billingEmail,
        currency: user.organization.currency,
        preferences: user.organization.preferences ?? {},
      },
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        hasMetaAccount: Boolean(user.client?.adAccountId),
        preferences: user.preferences ?? { theme: 'dark', settings: {} },
      },
      onboarding: user.organization.onboardingState ?? {
        needsOnboarding: true,
        currentStep: 0,
        checklist: {},
        draft: {},
        completedAt: null,
      },
      integrations,
      counts: { reports: reportCount, atlasSessions: atlasSessionCount },
    });
    return response;
  } catch (error) {
    console.error('Failed to load workspace state:', error);
    return NextResponse.json({ error: 'Unable to load workspace' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getRequestUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const parsed = patchSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid workspace update', issues: parsed.error.issues }, { status: 400 });
    }

    const update = parsed.data;
    if ((update.organization || update.onboarding) && !isOrganizationAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (update.organization?.currency && update.organization.currency !== user.organization.currency) {
      const [transactions, invoices, expenses] = await Promise.all([
        prisma.transaction.count({ where: { orgId: user.orgId } }),
        prisma.invoice.count({ where: { orgId: user.orgId } }),
        prisma.expense.count({ where: { orgId: user.orgId } }),
      ]);
      if (transactions + invoices + expenses > 0) {
        return NextResponse.json({ error: 'Billing currency cannot change after financial data exists.' }, { status: 409 });
      }
    }

    await prisma.$transaction(async (tx) => {
      if (update.organization) {
        await tx.organization.update({
          where: { id: user.orgId },
          data: update.organization as Prisma.OrganizationUpdateInput,
        });
      }

      if (update.user?.username !== undefined) {
        await tx.user.update({ where: { id: user.id }, data: { username: update.user.username } });
      }

      if (update.user?.preferences) {
        await tx.userPreference.upsert({
          where: { userId: user.id },
          create: { userId: user.id, ...update.user.preferences } as Prisma.UserPreferenceUncheckedCreateInput,
          update: update.user.preferences as Prisma.UserPreferenceUpdateInput,
        });
      }

      if (update.onboarding) {
        const { completed, ...state } = update.onboarding;
        const completion = completed === undefined
          ? {}
          : completed
            ? { needsOnboarding: false, completedAt: new Date() }
            : { needsOnboarding: true, completedAt: null };
        await tx.organizationOnboardingState.upsert({
          where: { orgId: user.orgId },
          create: { orgId: user.orgId, ...state, ...completion } as Prisma.OrganizationOnboardingStateUncheckedCreateInput,
          update: { ...state, ...completion } as Prisma.OrganizationOnboardingStateUpdateInput,
        });
      }
    });

    const response = NextResponse.json({ success: true });
    if (update.user?.preferences?.theme) {
      response.cookies.set('crystal_theme', update.user.preferences.theme, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
      });
    }
    return response;
  } catch (error) {
    if (request.signal.aborted) {
      // The browser disconnected before it could receive a response. This is
      // expected for a navigation-interrupted preference update.
      return new NextResponse(null, { status: 499 });
    }
    console.error('Failed to update workspace state:', error);
    return NextResponse.json({ error: 'Unable to update workspace' }, { status: 500 });
  }
}
