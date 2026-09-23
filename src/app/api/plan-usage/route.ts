import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getRequestSecurityContext } from '@/server/security/request-security-context';

export async function GET() {
  const ctx = await getRequestSecurityContext();
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
  const nextMonth = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1));
  const [clients, projects, activeLeads, teamMembers, coreTeamMembers, transfer, monthlyInvoices] = await Promise.all([
    prisma.client.count({ where: { orgId: ctx.orgId } }),
    prisma.project.count({ where: { orgId: ctx.orgId } }),
    prisma.agencyLead.count({ where: { orgId: ctx.orgId, status: { notIn: ['lost', 'closed'], mode: 'insensitive' } } }),
    prisma.user.count({ where: { orgId: ctx.orgId, role: { in: ['member', 'sub_admin'] }, accessRevokedAt: null } }),
    prisma.user.count({ where: { orgId: ctx.orgId, role: 'sub_admin', accessRevokedAt: null } }),
    prisma.encryptedAttachment.aggregate({ where: { orgId: ctx.orgId }, _sum: { byteSize: true } }),
    prisma.invoice.count({ where: { orgId: ctx.orgId, issuedDate: { gte: monthStart, lt: nextMonth } } }),
  ]);

  return NextResponse.json({
    clients,
    projects,
    activeLeads,
    teamMembers,
    coreTeamMembers,
    dataTransferBytes: transfer._sum.byteSize ?? 0,
    monthlyInvoices,
  });
}
