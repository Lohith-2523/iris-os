'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  defaultProfileAvatarTemplate,
  isProfileAvatarTemplate,
  PROFILE_AVATAR_TEMPLATES,
  type ProfileAvatarTemplateId,
} from '@/lib/profile-avatar-templates';

const portraitDetails: Record<ProfileAvatarTemplateId, React.ReactNode> = {
  'iris-avatar:ink': <><path d="M22 35c1-15 7-23 20-24 13 1 20 10 20 25-7-4-10-10-12-17-6 9-15 14-28 16Z" fill="#252525"/><path d="M29 38c2 17 7 26 18 26 10 0 16-9 17-25"/><path d="M36 43h1m15 0h1M41 53c3 2 7 2 10 0"/></>,
  'iris-avatar:crop': <><path d="M24 30c4-14 13-20 25-18 10 2 16 10 16 24-9-2-17-8-22-16-4 7-10 10-19 10Z" fill="#333"/><path d="M28 35c0 18 7 29 19 29 11 0 18-10 18-28"/><path d="M36 42h1m18 0h1M41 53c4 2 8 2 11-1"/></>,
  'iris-avatar:waves': <><path d="M20 38c0-18 9-28 25-28 14 0 22 10 22 27-5-4-9-10-11-18-6 9-17 16-36 19Z" fill="#2b2b2b"/><path d="M27 37c1 18 7 27 19 27s18-10 19-27"/><path d="M35 43h1m18 0h1M40 53c4 3 9 3 13 0"/><path d="M21 24c5-7 11-10 18-11m5-2c9 0 16 5 20 12" stroke="#f5f3ef"/></>,
  'iris-avatar:bob': <><path d="M19 39c0-19 9-29 27-29 17 0 25 11 24 32l-7 7-3-27c-8 8-19 12-34 12l-2 16-6-7Z" fill="#262626"/><path d="M27 35c1 18 7 29 19 29 11 0 17-10 18-28"/><path d="M35 43h1m19 0h1M41 53c3 2 8 2 11 0"/></>,
  'iris-avatar:curls': <><path d="M20 34c-3-7 1-13 7-13-1-8 10-13 16-8 5-7 17-2 16 5 8-1 12 8 7 14 5 6 0 14-5 14l-4-22c-8 7-20 10-35 8l-4 22c-8-2-10-10-5-16Z" fill="#303030"/><path d="M28 35c1 18 7 29 19 29 11 0 17-10 18-29"/><path d="M36 43h1m18 0h1M41 53c3 2 8 2 11 0"/></>,
  'iris-avatar:buzz': <><path d="M26 29c3-12 10-18 21-18 12 0 19 7 21 20-13-6-27-7-42-2Z" fill="#353535"/><path d="M27 32c0 20 7 32 20 32s20-12 20-32"/><path d="M35 42h1m20 0h1M41 53c4 3 9 3 13 0"/><path d="M28 29c12-5 25-5 38 1" stroke="#f5f3ef"/></>,
};

export function ProfileAvatar({
  src,
  name,
  seed,
  className,
  imageClassName,
}: {
  src?: string | null;
  name: string;
  seed?: string;
  className?: string;
  imageClassName?: string;
}) {
  const [imageFailed, setImageFailed] = React.useState(false);

  React.useEffect(() => {
    setImageFailed(false);
  }, [src]);

  if (src && !isProfileAvatarTemplate(src) && !imageFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={`${name} profile`} onError={() => setImageFailed(true)} className={cn('h-full w-full object-cover', imageClassName, className)} />
    );
  }

  const template = isProfileAvatarTemplate(src) ? src : defaultProfileAvatarTemplate(seed || name);
  const templateIndex = PROFILE_AVATAR_TEMPLATES.findIndex((item) => item.id === template);
  const backgrounds = ['#e7ddd0', '#d8e1dc', '#ddd9e8', '#ead9d5', '#d9e2ea', '#e5dfce'];

  return (
    <span className={cn('inline-grid h-full w-full overflow-hidden bg-zinc-200', className)} role="img" aria-label={`${name} profile illustration`}>
      <svg viewBox="0 0 92 92" className="h-full w-full" aria-hidden="true">
        <rect width="92" height="92" fill={backgrounds[templateIndex]} />
        <path d="M12 92c2-17 14-27 34-27s32 10 34 27" fill="#f8f6f1" stroke="#171717" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <g fill="none" stroke="#171717" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          {portraitDetails[template]}
          <path d="M38 64v8m17-8v8" />
        </g>
      </svg>
    </span>
  );
}
