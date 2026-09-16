import { renderAdminWorkspace } from '@/admin/workspace';

export const dynamic = 'force-dynamic';
export default async function AdminSectionPage({ params }: { params: Promise<{ section: string }> }) {
  return renderAdminWorkspace((await params).section);
}
