import { redirect } from 'next/navigation';
import MessagesClient from './messages-client';
import { getMessagingInbox } from '@/server/domains/messaging-read-service';
import { canRenderRequestRoute, getRequestSecurityContext } from '@/server/security/request-security-context';

export default async function MessagesPage() {
  const ctx = await getRequestSecurityContext();
  if (!ctx) redirect('/login');
  if (!canRenderRequestRoute(ctx, '/messages')) return null;

  const inbox = await getMessagingInbox({
    userId: ctx.userId,
    orgId: ctx.orgId,
    role: ctx.role,
    limits: ctx.entitlements.messagingLimits,
  });
  return <MessagesClient initialInbox={inbox} />;
}
