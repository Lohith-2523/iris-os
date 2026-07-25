import { redirect } from 'next/navigation';
import { ClientLeadsWorkspace } from '@/components/clients/client-leads-workspace';
import { getRequestUser } from '@/lib/org';

export default async function ClientLeadsPage() {
  const user = await getRequestUser();
  if (!user) redirect('/login');
  if (user.role.toLowerCase() !== 'client') redirect('/dashboard');
  if (!user.client?.adAccountId) redirect('/client-dashboard');

  return (
    <ClientLeadsWorkspace
      clientName={user.client.name}
      adAccountId={user.client.adAccountId}
    />
  );
}
