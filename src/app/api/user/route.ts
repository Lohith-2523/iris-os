import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getRequestUser } from '@/lib/org';
import { validateProfileAvatarDataUrl } from '@/lib/profile-avatar';

const updateProfileSchema = z.object({
  avatarDataUrl: z.string().nullable(),
}).strict();

export async function GET() {
  try {
    const user = await getRequestUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const clientMetadata = user.client?.metadata && typeof user.client.metadata === 'object' && !Array.isArray(user.client.metadata)
      ? user.client.metadata as Record<string, unknown>
      : {};
    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      username: user.username,
      role: user.role,
      accessPermissions: user.accessPermissions,
      hasMetaAccount: Boolean(user.client?.adAccountId),
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      orgId: user.orgId,
      clientId: user.clientId,
      client: user.client ? {
        id: user.client.id,
        name: user.client.name,
        logoDataUrl: user.client.logoDataUrl,
        workspaceBannerDataUrl: typeof clientMetadata.workspaceBannerDataUrl === 'string' ? clientMetadata.workspaceBannerDataUrl : null,
      } : null,
      organization: {
        id: user.organization.id,
        name: user.organization.name,
        plan: user.organization.plan,
        currency: user.organization.currency,
        needsOnboarding: user.organization.onboardingState?.needsOnboarding ?? true,
      },
    });
  } catch (error) {
    console.error('Error fetching current user:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getRequestUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const parsed = updateProfileSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid profile update.' }, { status: 400 });
    }

    const avatarResult = validateProfileAvatarDataUrl(parsed.data.avatarDataUrl);
    if ('error' in avatarResult) {
      return NextResponse.json({ error: avatarResult.error }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { avatarUrl: avatarResult.value },
      select: { avatarUrl: true },
    });

    return NextResponse.json({ avatarUrl: updatedUser.avatarUrl });
  } catch (error) {
    console.error('Error updating current user profile:', error);
    return NextResponse.json({ error: 'Unable to update profile picture.' }, { status: 500 });
  }
}
