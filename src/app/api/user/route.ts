import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/org';

export async function GET() {
  try {
    const user = await getRequestUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
