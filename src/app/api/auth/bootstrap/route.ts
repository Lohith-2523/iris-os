import { NextResponse } from 'next/server';
import { getOrCreateRequestUser, WorkspaceIdentityConflictError } from '@/lib/org';

export async function POST() {
  try {
    const user = await getOrCreateRequestUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      user: { id: user.id, name: user.name, username: user.username, role: user.role },
      organization: {
        id: user.organization.id,
        name: user.organization.name,
        needsOnboarding: user.organization.onboardingState?.needsOnboarding ?? true,
      },
    });
  } catch (error) {
    if (error instanceof WorkspaceIdentityConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error('Failed to bootstrap authenticated workspace:', error);
    return NextResponse.json({ error: 'Unable to initialize workspace' }, { status: 500 });
  }
}
