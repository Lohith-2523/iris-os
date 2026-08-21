import type { Metadata } from 'next';
import { IrisLanding } from '@/components/landing/iris-landing';

export const metadata: Metadata = {
  title: 'Iris OS — The AI Operating System for Modern Agencies',
  description: 'Run clients, projects, tasks, finances, reporting and agency operations from one connected workspace, with Atlas AI built into the operating system.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Iris OS — The AI Operating System for Modern Agencies',
    description: 'Run your agency from one connected workspace, with Atlas AI built into the operating system.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Iris OS — The AI Operating System for Modern Agencies',
    description: 'The operating layer connecting your entire agency.',
  },
};

export default function LandingPage() {
  return <IrisLanding />;
}
