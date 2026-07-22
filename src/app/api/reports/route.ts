import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getRequestUser } from '@/lib/org';

const createSchema = z.object({
  title: z.string().trim().min(2).max(200),
  type: z.enum(['FINANCIAL', 'MARKETING', 'FINANCE', 'CLIENT', 'OPERATIONS', 'CREATIVE']),
  content: z.string().max(200_000),
});

export async function GET() {
  const user = await getRequestUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const reports = await prisma.report.findMany({
    where: { orgId: user.orgId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, title: true, type: true, status: true, summary: true, createdAt: true },
  });
  return NextResponse.json(reports.map((report) => ({
    ...report,
    content: report.summary,
    date: report.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  })));
}

export async function POST(request: Request) {
  const user = await getRequestUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid report' }, { status: 400 });
  const report = await prisma.report.create({
    data: {
      title: parsed.data.title,
      type: parsed.data.type,
      status: 'READY',
      summary: parsed.data.content,
      createdById: user.id,
      orgId: user.orgId,
    },
  });
  return NextResponse.json(report, { status: 201 });
}
