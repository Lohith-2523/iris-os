'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import {
  PageSkeleton,
  WorkspaceBootstrapLoader,
  pageSkeletonVariantForPath,
} from '@/components/ui/page-skeletons';

const WORKSPACE_BOOTSTRAP_PHASE_MS = 600;

export default function WorkspaceRouteLoading() {
  const pathname = usePathname();
  const [isBootstrapping, setIsBootstrapping] = React.useState(true);

  React.useEffect(() => {
    const timer = window.setTimeout(() => setIsBootstrapping(false), WORKSPACE_BOOTSTRAP_PHASE_MS);
    return () => window.clearTimeout(timer);
  }, []);

  if (isBootstrapping) return <WorkspaceBootstrapLoader />;

  return (
    <div className="min-h-full w-full p-4 sm:p-6 lg:p-8">
      <PageSkeleton variant={pageSkeletonVariantForPath(pathname)} />
    </div>
  );
}
