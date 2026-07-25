import { NextResponse } from 'next/server';
import { getAssignableMetaAdAccounts } from '@/lib/meta-ad-accounts';
import { getRequestUser, isOrganizationAdmin } from '@/lib/org';

export async function GET() {
  try {
    const user = await getRequestUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isOrganizationAdmin(user)) {
      return NextResponse.json({ error: 'Administrative access required.' }, { status: 403 });
    }

    return NextResponse.json(await getAssignableMetaAdAccounts(user.orgId));
  } catch (error) {
    console.error('Error loading assignable Meta ad accounts:', error);
    return NextResponse.json(
      { error: 'Unable to load Meta ad accounts.' },
      { status: 500 },
    );
  }
}
