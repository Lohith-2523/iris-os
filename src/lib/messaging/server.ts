import 'server-only';

import type { NextRequest } from 'next/server';
import { getRequestUser } from '@/lib/org';
import { entitlementsFor } from '@/lib/plan-entitlements';
export { isAllowedDirectPair } from '@/lib/messaging/roles';

export async function getMessagingUser(request?: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return { error: 'Unauthorized', status: 401 } as const;
  if (!entitlementsFor(user.organization.plan).messaging) {
    return { error: 'Secure messaging is available on the Pro and Advanced plans.', status: 403 } as const;
  }
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
