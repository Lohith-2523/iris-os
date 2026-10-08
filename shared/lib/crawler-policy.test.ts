import { describe, expect, it } from 'vitest';
import robots from '@/app/robots';
import { ALLOWED_CRAWLERS, PUBLIC_CRAWLER_PATHS } from './crawler-policy';

describe('public crawler scope', () => {
  const allowed = (path: string) => PUBLIC_CRAWLER_PATHS.some(rule => new RegExp(`^${rule}`).test(path));
  it('allows only exact marketing pages', () => {
    for (const path of ['/', '/privacy', '/terms', '/cancellation-refund-policy', '/pricing', '/llms.txt']) expect(allowed(path)).toBe(true);
    for (const path of ['/api/user', '/dashboard', '/invite?token=secret', '/sign-document/secret', '/signup', '/privacy/internal', '/?token=secret']) expect(allowed(path)).toBe(false);
  });
  it('blocks unlisted bots and applies a deny default to AI crawlers too', () => {
    expect(robots().rules).toEqual([
      { userAgent: '*', disallow: '/' },
      expect.objectContaining({ userAgent: ALLOWED_CRAWLERS, disallow: '/' }),
    ]);
  });
});
