import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/org';
import { prisma } from '@/lib/db';

export async function POST() {
  const user = await getRequestUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await prisma.userActivity.upsert({
    where: { userId: user.id },
    create: { userId: user.id, requests: 1 },
    update: { lastActiveAt: new Date(), requests: { increment: 1 } },
  });
  return new NextResponse(null, { status: 204 });
}
