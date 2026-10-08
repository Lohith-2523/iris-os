// Exact page matches: allowing "/" would also allow every private route.
export const PUBLIC_CRAWLER_PATHS = ['/$', '/privacy$', '/terms$', '/cancellation-refund-policy$', '/pricing$', '/home$', '/llms.txt$', '/robots.txt$'];
export const ALLOWED_CRAWLERS = [
  'GPTBot', 'OAI-SearchBot', 'ChatGPT-User',
  'ClaudeBot', 'Claude-SearchBot', 'Claude-User',
  'Googlebot', 'Google-Extended', 'Bingbot',
  'PerplexityBot', 'Perplexity-User',
];
