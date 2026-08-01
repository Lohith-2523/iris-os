import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { prisma } from '@/lib/db';
import { getRequestUser } from '@/lib/org';

type RevisionRow = {
  source: string;
  rowCount: bigint | number | string;
  latestChange: Date | string | null;
};

export async function GET(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rows = await prisma.$queryRaw<RevisionRow[]>`
    SELECT 'organization' AS source, COUNT(*) AS "rowCount", MAX("updatedAt") AS "latestChange"
      FROM "Organization" WHERE id = ${user.orgId}
    UNION ALL
    SELECT 'users', COUNT(*), MAX("updatedAt") FROM "User" WHERE "orgId" = ${user.orgId}
    UNION ALL
    SELECT 'clients', COUNT(*), MAX("updatedAt") FROM "Client" WHERE "orgId" = ${user.orgId}
    UNION ALL
    SELECT 'projects', COUNT(*), MAX("updatedAt") FROM "Project" WHERE "orgId" = ${user.orgId}
    UNION ALL
    SELECT 'invoices', COUNT(*), MAX("updatedAt") FROM "Invoice" WHERE "orgId" = ${user.orgId}
    UNION ALL
    SELECT 'strategies', COUNT(*), MAX("updatedAt") FROM "Strategy" WHERE "orgId" = ${user.orgId}
    UNION ALL
    SELECT 'expenses', COUNT(*), MAX("updatedAt") FROM "Expense" WHERE "orgId" = ${user.orgId}
    UNION ALL
    SELECT 'reports', COUNT(*), MAX("updatedAt") FROM "Report" WHERE "orgId" = ${user.orgId}
    UNION ALL
    SELECT 'integrations', COUNT(*), MAX("updatedAt") FROM "IntegrationConnection" WHERE "orgId" = ${user.orgId}
    UNION ALL
    SELECT 'metaPages', COUNT(*), MAX("updatedAt") FROM "MetaPageConnection" WHERE "orgId" = ${user.orgId}
    UNION ALL
    SELECT 'googleCalendars', COUNT(*), MAX("updatedAt") FROM "GoogleCalendarConnection" WHERE "orgId" = ${user.orgId}
    UNION ALL
    SELECT 'metaCampaigns', COUNT(*), MAX("updatedAt") FROM "MetaCampaign" WHERE "orgId" = ${user.orgId}
    UNION ALL
    SELECT 'metaAds', COUNT(*), MAX("updatedAt") FROM "MetaAd" WHERE "orgId" = ${user.orgId}
    UNION ALL
    SELECT 'metaLeads', COUNT(*), MAX("updatedAt") FROM "MetaLead" WHERE "orgId" = ${user.orgId}
    UNION ALL
    SELECT 'agencyLeads', COUNT(*), MAX("updatedAt") FROM "AgencyLead" WHERE "orgId" = ${user.orgId}
    UNION ALL
    SELECT 'agencyMetaAccounts', COUNT(*), MAX("updatedAt") FROM "AgencyMetaAdAccount" WHERE "orgId" = ${user.orgId}
    UNION ALL
    SELECT 'transactions', COUNT(*), MAX("updatedAt") FROM "Transaction" WHERE "orgId" = ${user.orgId}
    UNION ALL
    SELECT 'tasks', COUNT(*), MAX(task."updatedAt")
      FROM "ClientTask" task
      INNER JOIN "Client" client ON client.id = task."clientId"
      WHERE client."orgId" = ${user.orgId}
    UNION ALL
    SELECT 'calendar', COUNT(*), MAX("updatedAt") FROM "CalendarEvent" WHERE "orgId" = ${user.orgId}
    UNION ALL
    SELECT 'subscriptions', COUNT(*), MAX("updatedAt") FROM "RecurringSubscription" WHERE "orgId" = ${user.orgId}
    UNION ALL
    SELECT 'retainers', COUNT(*), MAX("updatedAt") FROM "Project" WHERE "orgId" = ${user.orgId} AND "paymentAmount" IS NOT NULL
  `;

  const signature = rows
    .map((row) => [
      row.source,
      String(row.rowCount),
      row.latestChange instanceof Date ? row.latestChange.toISOString() : String(row.latestChange || ''),
    ].join(':'))
    .join('|');
  const revision = createHash('sha256').update(signature).digest('base64url');

  return NextResponse.json(
    { revision },
    {
      headers: {
        'Cache-Control': 'private, no-store, max-age=0',
      },
    },
  );
}
