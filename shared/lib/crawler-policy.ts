// Exact page matches: allowing "/" without "$" would also allow private routes.
// Public assets listed here support search results, previews, and app discovery.
export const PUBLIC_CRAWLER_PATHS = [
  '/$',
  '/privacy$',
  '/terms$',
  '/cancellation-refund-policy$',
  '/data-processing-agreement$',
  '/ai-usage-policy$',
  '/subprocessors$',
  '/pricing$',
  '/contact$',
  '/llms.txt$',
  '/robots.txt$',
  '/sitemap.xml$',
  '/manifest.webmanifest$',
  '/favicon.ico$',
  '/icons/iris-180.png$',
  '/icons/iris-192.png$',
  '/icons/iris-512.png$',
  '/iris-logo-black-transparent.png$',
  '/meta_dark.png$',
];
