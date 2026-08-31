import 'server-only';

import { cache } from 'react';
import { entitlementsFor, normalizePlan } from '@/lib/plan-entitlements';
import { getRequestUser } from '@/lib/org';
import { canRenderWorkspaceRoute } from '@/lib/workspace-route-authorization';
import { measureServerOperation } from '@/server/observability/performance';

export const getRequestSecurityContext = cache(async () => {
  return measureServerOperation('security.request-context', async () => {
    const user = await getRequestUser();
    if (!user) return null;

    const plan = normalizePlan(user.organization.plan);
    return {
      authUserId: user.authUserId!,
      userId: user.id,
      orgId: user.orgId,
      role: user.role,
      clientId: user.clientId,
      user,
      organization: user.organization,
      preferences: user.preferences,
      onboardingState: user.organization.onboardingState,
      plan,
      entitlements: entitlementsFor(plan),
    } as const;
  });
});

export type RequestSecurityContext = NonNullable<Awaited<ReturnType<typeof getRequestSecurityContext>>>;

export function canRenderRequestRoute(ctx: RequestSecurityContext, pathname: string) {
  return canRenderWorkspaceRoute({
    role: ctx.role,
    plan: ctx.plan,
    accessPermissions: ctx.user.accessPermissions as string[] | null,
  }, pathname);
}
