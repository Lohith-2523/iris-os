import { redirect } from 'next/navigation';
import { getSuperadmin } from '@/server/admin/auth';
import { getAdminDashboardData } from '@/server/admin/dashboard';
import { AdminWorkspace, type AdminSection } from './admin-workspace';

const validSections = new Set<AdminSection>(['overview', 'users', 'revenue', 'support', 'incidents', 'coupons', 'access', 'settings']);

export async function renderAdminWorkspace(section: string = 'overview') {
  const admin = await getSuperadmin();
  if (!admin) redirect('/admin/login?auth_error=access_denied');
  const selected = validSections.has(section as AdminSection) ? section as AdminSection : 'overview';
  const data = await getAdminDashboardData();
  return <AdminWorkspace section={selected} data={data} admin={admin} />;
}
