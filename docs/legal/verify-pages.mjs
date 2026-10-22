// Read-only check against a locally running production build. No customer data.
// Run: node docs/legal/verify-pages.mjs [base URL]
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const base = process.argv[2] || 'http://127.0.0.1:3210';
if (!['127.0.0.1', 'localhost'].includes(new URL(base).hostname)) throw new Error('Use a local build for this check.');
const paths = ['/privacy', '/terms', '/cancellation-refund-policy', '/data-processing-agreement', '/ai-usage-policy', '/subprocessors'];
const browser = await chromium.launch({ headless: true });
const results = [];
await mkdir('docs/legal/verification', { recursive: true });
try {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport });
    // Prevent third-party telemetry and API calls; the policies must stand alone.
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      return url.origin !== new URL(base).origin || url.pathname.startsWith('/api/')
        ? route.abort() : route.continue();
    });
    const page = await context.newPage();
    for (const path of paths) {
      const response = await page.goto(base + path, { waitUntil: 'networkidle' });
      if (response?.status() !== 200 || new URL(page.url()).pathname !== path) throw new Error(`Route failed: ${path}`);
      const report = await page.evaluate(() => {
        const sections = [...document.querySelectorAll('nav[aria-label="Policy contents"] a')];
        return {
          title: document.querySelector('h1')?.textContent,
          canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href'),
          hasStatusCallout: Boolean(document.querySelector('[role="note"]')),
          noindex: document.querySelector('meta[name="robots"]')?.getAttribute('content')?.includes('noindex') || false,
          overflow: document.documentElement.scrollWidth > innerWidth,
          brokenAnchors: sections.filter(a => !document.getElementById(a.hash.slice(1))).map(a => a.hash),
          legalLinks: [...document.querySelectorAll('nav[aria-label="Legal documents"] a')].map(a => a.pathname),
        };
      });
      if (report.hasStatusCallout || report.noindex || report.overflow || report.brokenAnchors.length || report.legalLinks.length !== 6) throw new Error(JSON.stringify({ path, viewport, report }));
      results.push({ path, width: viewport.width, status: response.status(), ...report });
      if (path === '/privacy') {
        await page.screenshot({ path: `docs/legal/verification/privacy-${viewport.width}.png` });
        await page.locator('article > section').first().scrollIntoViewIfNeeded();
        await page.screenshot({ path: `docs/legal/verification/content-${viewport.width}.png` });
      }
    }
    await context.close();
  }
  await writeFile('docs/legal/verification/routes.json', JSON.stringify(results, null, 2) + '\n');
  console.log(`Passed ${results.length} signed-out desktop/mobile route checks.`);
} finally {
  await browser.close();
}
