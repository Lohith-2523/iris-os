import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getRequestUser, isOrganizationAdmin } from '@/lib/org';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { purgeOrganizationData } from '@/server/domains/account-deletion-service';

const deleteAccountSchema = z.object({
  confirmation: z.string().min(1).max(300),
}).strict();

async function hardDeleteAuthUser(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  authUserId: string,
) {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { error } = await supabase.auth.admin.deleteUser(authUserId);
    if (!error) return;
    lastError = error;
  }

  throw lastError || new Error('Unable to delete authentication identity.');
}

export async function DELETE(request: Request) {
  let deletionStage = 'authorizing the request';

  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isOrganizationAdmin(user)) {
      return NextResponse.json({ error: 'Only an organization administrator can delete the entire account.' }, { status: 403 });
    }
    if (!user.authUserId) {
      return NextResponse.json({ error: 'The current authentication identity is not linked to this account.' }, { status: 409 });
    }

    const parsed = deleteAccountSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Account deletion confirmation is invalid.' }, { status: 400 });
    }
    if (parsed.data.confirmation !== `DELETE ${user.organization.name}`) {
      return NextResponse.json({ error: 'Account deletion confirmation does not match the organization name.' }, { status: 400 });
    }

    const orgId = user.orgId;
    const accountUsers = await prisma.user.findMany({
      where: { orgId },
      select: { authUserId: true, email: true },
    });
    const authUserIds = [...new Set(
      accountUsers
        .map((accountUser) => accountUser.authUserId)
        .filter((authUserId): authUserId is string => Boolean(authUserId)),
    )];
    if (!authUserIds.includes(user.authUserId)) authUserIds.push(user.authUserId);
    const accountEmails = [...new Set(accountUsers.map((accountUser) => accountUser.email.trim().toLowerCase()))];
    deletionStage = 'initializing authentication deletion';
    const supabaseAdmin = createSupabaseAdminClient();

    deletionStage = 'deleting application data';
    await prisma.$transaction(async (tx) => {
      await purgeOrganizationData(tx, orgId, (stage) => { deletionStage = stage; });
      deletionStage = 'deleting account email records';
      await tx.waitlistEntry.deleteMany({
        where: { email: { in: accountEmails, mode: 'insensitive' } },
      });
      deletionStage = 'deleting the account container';
      await tx.organization.delete({ where: { id: orgId } });
    }, {
      maxWait: 10_000,
      timeout: 60_000,
    });

    deletionStage = 'deleting authentication identities';
    const currentAuthUserId = user.authUserId;
    const orderedAuthUserIds = authUserIds.sort((left, right) => (
      left === currentAuthUserId ? 1 : right === currentAuthUserId ? -1 : 0
    ));
    for (const authUserId of orderedAuthUserIds) {
      await hardDeleteAuthUser(supabaseAdmin, authUserId);
    }

    return NextResponse.json({
      success: true,
      message: 'The account, authentication identities, and all application data were permanently deleted.',
    });
  } catch (error) {
    console.error(`Error deleting entire account while ${deletionStage}:`, error);
    return NextResponse.json({
      error: `Unable to complete account deletion while ${deletionStage}.`,
    }, { status: 500 });
  }
}
