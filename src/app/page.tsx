import { redirect } from 'next/navigation';

// Root page automatically redirects to login
export default function RootPage() {
  redirect('/login');
}
