import { describe, expect, it } from 'vitest';
import robots from '@/app/robots';
import { PUBLIC_CRAWLER_PATHS } from './crawler-policy';

describe('public crawler scope', () => {
  const allowed = (path: string) => PUBLIC_CRAWLER_PATHS.some(rule => new RegExp(`^${rule}`).test(path));
  it('allows only exact marketing pages', () => {
    for (const path of ['/', '/privacy', '/terms', '/cancellation-refund-policy', '/data-processing-agreement', '/ai-usage-policy', '/subprocessors', '/pricing', '/contact', '/llms.txt', '/sitemap.xml', '/favicon.ico', '/icons/iris-192.png']) expect(allowed(path)).toBe(true);
    for (const path of ['/api/user', '/dashboard', '/invite?token=secret', '/sign-document/secret', '/signup', '/privacy/internal', '/?token=secret']) expect(allowed(path)).toBe(false);
  });
  it('allows every crawler to exact public pages while denying private routes', () => {
    expect(robots()).toMatchObject({
      rules: {
        userAgent: '*',
        allow: expect.arrayContaining(PUBLIC_CRAWLER_PATHS),
        disallow: '/',
      },
      sitemap: 'https://irisos.app/sitemap.xml',
      host: 'https://irisos.app',
    });
  });
});
