import type { MetadataRoute } from 'next';
import { ALLOWED_CRAWLERS, PUBLIC_CRAWLER_PATHS } from '@/lib/crawler-policy';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', disallow: '/' },
      {
        userAgent: ALLOWED_CRAWLERS,
        allow: [...PUBLIC_CRAWLER_PATHS, '/_next/static/', '/_next/image'],
        disallow: '/',
      },
    ],
  };
}
