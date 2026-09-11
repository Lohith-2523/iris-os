'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  defaultProfileAvatarTemplate,
  isProfileAvatarTemplate,
  profileAvatarTemplateUrl,
} from '@/lib/profile-avatar-templates';

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

  return (
    // DiceBear's Notionists style is the standard CC0 Notion-style avatar set.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={profileAvatarTemplateUrl(template)}
      alt={`${name} profile illustration`}
      className={cn('h-full w-full bg-zinc-100 object-cover', imageClassName, className)}
    />
  );
}
