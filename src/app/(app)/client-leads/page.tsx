import { redirect } from 'next/navigation';
import { getRequestUser } from '@/lib/org';

export default async function ClientLeadsPage() {
  const user = await getRequestUser();
  if (!user) redirect('/login');
  if (user.role.toLowerCase() !== 'client') redirect('/dashboard');
  redirect('/client-dashboard');
}
