import type { MetadataRoute } from 'next';

const SITE_URL = (process.env.APP_URL || 'https://irisos.app').trim().replace(/\/+$/, '');

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/pricing`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/contact`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/privacy`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/terms`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/cancellation-refund-policy`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/data-processing-agreement`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/ai-usage-policy`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/subprocessors`, changeFrequency: 'monthly', priority: 0.5 },
  ];
}
