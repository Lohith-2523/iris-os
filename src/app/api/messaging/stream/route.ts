import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getMessagingUser } from '@/lib/messaging/server';
import { subscribeToMessagingChanges } from '@/lib/messaging/realtime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const STREAM_LIFETIME_MS = 55_000;
const KEEPALIVE_MS = 15_000;

export async function GET(request: NextRequest) {
  const authorization = await getMessagingUser(request);
  if ('error' in authorization) return NextResponse.json({ error: authorization.error }, { status: authorization.status });
  const conversationId = request.nextUrl.searchParams.get('conversationId') || '';
  const conversation = await prisma.messagingConversation.findFirst({
    where: {
      id: conversationId,
      orgId: authorization.user.orgId,
      members: { some: { userId: authorization.user.id } },
    },
    select: { id: true },
  });
  if (!conversation) return NextResponse.json({ error: 'Conversation not found.' }, { status: 404 });

  const encoder = new TextEncoder();
  let cancelled = false;
  let unsubscribe = () => {};
  request.signal.addEventListener('abort', () => {
    cancelled = true;
    unsubscribe();
  }, { once: true });

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode('retry: 1000\nevent: ready\ndata: {}\n\n'));
      unsubscribe = subscribeToMessagingChanges(conversationId, () => {
        if (!cancelled) controller.enqueue(encoder.encode('event: change\ndata: {}\n\n'));
      });
      void (async () => {
        const startedAt = Date.now();
        try {
          while (!cancelled && Date.now() - startedAt < STREAM_LIFETIME_MS) {
            await new Promise((resolve) => setTimeout(resolve, KEEPALIVE_MS));
            if (cancelled) break;
            controller.enqueue(encoder.encode(': keepalive\n\n'));
          }
        } catch {
          // EventSource reconnects automatically; do not expose database details.
        } finally {
          unsubscribe();
          if (!cancelled) controller.close();
        }
      })();
    },
    cancel() {
      cancelled = true;
      unsubscribe();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'private, no-cache, no-store, no-transform, max-age=0',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
