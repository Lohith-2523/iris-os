'use client';

import { usePathname } from 'next/navigation';
import { PageSkeleton, pageSkeletonVariantForPath } from '@/components/ui/page-skeletons';

export default function WorkspaceRouteLoading() {
  const pathname = usePathname();
  return (
    <div className="min-h-full w-full p-4 sm:p-6 lg:p-8">
      <PageSkeleton variant={pageSkeletonVariantForPath(pathname)} />
    </div>
  );
}
