import { NextResponse } from 'next/server';
import { EmailVerificationRequiredError } from '@/lib/email-verification';
import { getOrCreateRequestUser, WorkspaceIdentityConflictError } from '@/lib/org';
import {
  isTransientDatabaseConnectionError,
  withDatabaseConnectionRetry,
} from '@/lib/database-resilience';

export async function POST() {
  try {
    const user = await withDatabaseConnectionRetry(
      () => getOrCreateRequestUser(),
      {
        onRetry: (_error, nextAttempt) => {
          console.warn(`Workspace bootstrap is waiting for a database connection (attempt ${nextAttempt}).`);
        },
      },
    );
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
    if (error instanceof EmailVerificationRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof WorkspaceIdentityConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (isTransientDatabaseConnectionError(error)) {
      return NextResponse.json(
        { error: 'Workspace is temporarily busy. Please retry.' },
        { status: 503, headers: { 'Retry-After': '2' } },
      );
    }
    console.error('Failed to bootstrap authenticated workspace:', error);
    return NextResponse.json({ error: 'Unable to initialize workspace' }, { status: 500 });
  }
}
