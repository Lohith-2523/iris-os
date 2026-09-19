import 'server-only';

import { prisma } from '@/lib/db';
import { SUPERADMIN_OWNER_EMAIL } from '@/admin/policy';
import { ensureLegacyManagedCoupons } from '@/server/admin/managed-coupons';
import { buildAdminCreditAnalytics } from '@/lib/admin-credit-analytics';

export async function getAdminDashboardData() {
  await ensureLegacyManagedCoupons();
  const now = new Date();
  const creditPeriodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const creditPeriodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, email: true, avatarUrl: true, role: true, createdAt: true, offboardedAt: true, accessRevokedAt: true, orgId: true, organization: { select: { name: true, plan: true } } },
  });
  const [
    totalUsers,
    activeUsers,
    activities,
    storage,
    revenue,
    planRevenue,
    payments,
    support,
    incidents,
    coupons,
    couponUses,
    grants,
    creditUsage,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { offboardedAt: null, accessRevokedAt: null } }),
    prisma.userActivity.findMany({ where: { userId: { in: users.map((user) => user.id) } } }),
    prisma.encryptedAttachment.groupBy({ by: ['orgId'], _sum: { byteSize: true }, _count: true }),
    prisma.platformPayment.groupBy({ by: ['currency'], _sum: { totalAmount: true, refundedAmount: true }, _count: true }),
    prisma.platformPayment.groupBy({ by: ['currency', 'plan'], _sum: { totalAmount: true, refundedAmount: true }, _count: true }),
    prisma.platformPayment.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }),
    prisma.helpRequest.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }),
    prisma.backendIncident.findMany({ orderBy: { lastSeenAt: 'desc' }, take: 200 }),
    prisma.managedCoupon.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }),
    prisma.planCouponRedemption.groupBy({ by: ['couponId'], _count: true }),
    prisma.adminAccess.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }),
    prisma.atlasCreditUsageEvent.groupBy({
      by: ['userId', 'provider'],
      where: { createdAt: { gte: creditPeriodStart, lt: creditPeriodEnd } },
      _sum: { inputCredits: true, outputCredits: true, totalCredits: true },
      _count: { _all: true },
    }),
  ]);

  const activityByUser = new Map(activities.map((entry) => [entry.userId, entry]));
  const storageByOrg = new Map(storage.map((entry) => [entry.orgId, entry]));
  const usesByCoupon = new Map(couponUses.map((entry) => [entry.couponId, entry._count]));
  const customerAdminCount = users.filter((user) => user.role.toLowerCase() === 'admin').length;
  const creditAnalytics = buildAdminCreditAnalytics(users, creditUsage.map((row) => ({
    userId: row.userId,
    provider: row.provider,
    inputCredits: row._sum.inputCredits ?? 0,
    outputCredits: row._sum.outputCredits ?? 0,
    totalCredits: row._sum.totalCredits ?? 0,
    requests: row._count._all,
  })));

  return {
    generatedAt: new Date().toISOString(),
    metrics: { totalUsers, activeUsers, totalAdmins: grants.filter((grant) => !grant.revokedAt).length + 1, customerAdminCount },
    creditAnalytics: {
      periodStart: creditPeriodStart.toISOString(),
      resetsAt: creditPeriodEnd.toISOString(),
      ...creditAnalytics,
    },
    users: users.map((user) => ({
      ...user,
      createdAt: user.createdAt.toISOString(),
      offboardedAt: user.offboardedAt?.toISOString() ?? null,
      accessRevokedAt: user.accessRevokedAt?.toISOString() ?? null,
      isActiveAccount: !user.offboardedAt && !user.accessRevokedAt,
      lastActiveAt: activityByUser.get(user.id)?.lastActiveAt.toISOString() ?? null,
      traffic: activityByUser.get(user.id)?.requests ?? 0,
      storageBytes: storageByOrg.get(user.orgId)?._sum.byteSize ?? 0,
      storedFiles: storageByOrg.get(user.orgId)?._count ?? 0,
    })),
    revenue: revenue.map((row) => ({ currency: row.currency, gross: row._sum.totalAmount ?? 0, refunded: row._sum.refundedAmount ?? 0, payments: row._count })),
    planRevenue: planRevenue.map((row) => ({ currency: row.currency, plan: row.plan, gross: row._sum.totalAmount ?? 0, refunded: row._sum.refundedAmount ?? 0, payments: row._count })),
    payments: payments.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
    support: support.map((row) => ({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), sheetSyncedAt: row.sheetSyncedAt?.toISOString() ?? null, emailSentAt: row.emailSentAt?.toISOString() ?? null })),
    incidents: incidents.map((row) => ({ ...row, firstSeenAt: row.firstSeenAt.toISOString(), lastSeenAt: row.lastSeenAt.toISOString() })),
    coupons: coupons.map((row) => ({ ...row, startsAt: row.startsAt.toISOString(), endsAt: row.endsAt?.toISOString() ?? null, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), uses: usesByCoupon.get(row.id) ?? 0 })),
    admins: [
      { email: SUPERADMIN_OWNER_EMAIL, role: 'OWNER', status: 'ACTIVE', expiresAt: null, createdAt: null },
      ...grants.map((grant) => ({ email: grant.email, role: grant.role, status: grant.revokedAt ? 'REVOKED' : grant.acceptedAt ? 'ACTIVE' : grant.expiresAt > new Date() ? 'INVITED' : 'EXPIRED', expiresAt: grant.expiresAt.toISOString(), createdAt: grant.createdAt.toISOString() })),
    ],
  };
}

export type AdminDashboardData = Awaited<ReturnType<typeof getAdminDashboardData>>;
