import 'server-only';

import type { NextRequest } from 'next/server';
import { getRequestUser } from '@/lib/org';
import { entitlementsFor } from '@/lib/plan-entitlements';
export { isAllowedDirectPair } from '@/lib/messaging/roles';

export async function getMessagingUser(request?: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return { error: 'Oops! Please sign in to continue.', status: 401 } as const;
  return { user, entitlements: entitlementsFor(user.organization.plan) } as const;
}

export function directParticipantKey(firstUserId: string, secondUserId: string) {
  return [firstUserId, secondUserId].sort().join(':');
}

export function messagingNoStoreHeaders() {
  return {
    'Cache-Control': 'private, no-store, max-age=0',
    'X-Content-Type-Options': 'nosniff',
  };
}
