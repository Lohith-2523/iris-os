import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getRequestUser, isOrganizationAdmin } from '@/lib/org';

const schema = z.object({
  google: z.string().optional(),
  meta: z.string().optional(),
  financial: z.string().optional(),
  leads: z.string().optional(),
  skippedAll: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Oops! Please sign in to continue.' }, { status: 401 });
    if (!isOrganizationAdmin(user)) return NextResponse.json({ error: 'Oops! You do not have enough permissions.' }, { status: 403 });

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'Invalid onboarding state' }, { status: 400 });

    const { skippedAll, ...connections } = parsed.data;
    await prisma.organizationOnboardingState.upsert({
      where: { orgId: user.orgId },
      create: {
        orgId: user.orgId,
        needsOnboarding: false,
        checklist: { ...connections, skippedAll },
        completedAt: new Date(),
      },
      update: {
        needsOnboarding: false,
        checklist: { ...connections, skippedAll },
        completedAt: new Date(),
      },
    });

    // Skipping an onboarding step changes only progress state. It never deletes
    // organization data that may already have been imported or created.
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error completing onboarding:', error);
    return NextResponse.json({ error: 'Oops! Something went wrong. Please try again.' }, { status: 500 });
  }
}
