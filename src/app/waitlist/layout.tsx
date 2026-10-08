import { redirect } from 'next/navigation';

export default function RetiredWaitlistLayout({ children }: { children: React.ReactNode }) {
  void children;
  redirect('/signup');
}
