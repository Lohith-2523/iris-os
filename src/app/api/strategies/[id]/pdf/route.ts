import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getRequestUser, isOrganizationAdmin } from '@/lib/org';
import { generateStrategyPdf } from '@/lib/strategies/pdf';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getRequestUser(request);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isOrganizationAdmin(user)) return Response.json({ error: 'Forbidden' }, { status: 403 });
    const { id } = await params;
    const strategy = await prisma.strategy.findFirst({
      where: { id, orgId: user.orgId },
      include: {
        organization: { select: { name: true } },
        createdBy: { select: { name: true } },
      },
    });
    if (!strategy) return Response.json({ error: 'Strategy not found' }, { status: 404 });

    const pdf = await generateStrategyPdf({
      title: strategy.title,
      type: strategy.type,
      goal: strategy.goal,
      timeline: strategy.timeline,
      content: strategy.content,
      organizationName: strategy.organization.name,
      createdBy: strategy.createdBy.name,
      createdAt: strategy.createdAt,
    });
    const filename = `${strategy.title.replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80) || 'strategy'}.pdf`;
    return new Response(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdf.length),
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Unable to generate strategy PDF:', error);
    return Response.json({ error: 'Unable to generate strategy PDF.' }, { status: 500 });
  }
}
