import type { MetadataRoute } from 'next';
import { PUBLIC_CRAWLER_PATHS } from '@/lib/crawler-policy';

const SITE_URL = (process.env.APP_URL || 'https://irisos.app').trim().replace(/\/+$/, '');

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: [...PUBLIC_CRAWLER_PATHS, '/_next/static/', '/_next/image'],
      disallow: '/',
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
