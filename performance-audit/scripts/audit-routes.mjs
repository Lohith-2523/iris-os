import { chromium, devices } from '@playwright/test';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const baseURL = process.env.PERF_BASE_URL || 'http://127.0.0.1:3000';
const root = process.cwd();
const auditDir = path.join(root, 'performance-audit');
const outputDir = path.join(auditDir, 'reports', 'playwright');
const networkDir = path.join(auditDir, 'reports', 'network');
const screenshotDir = path.join(auditDir, 'reports', 'screenshots');
const inventory = JSON.parse(await fs.readFile(path.join(auditDir, 'route-inventory.json'), 'utf8'));
const publicRoutes = inventory.filter((item) => item.access === 'public').map((item) => item.route);
const protectedRoutes = inventory.filter((item) => item.access !== 'public').map((item) => item.route);

await Promise.all([outputDir, networkDir, screenshotDir].map((dir) => fs.mkdir(dir, { recursive: true })));

const browser = await chromium.launch({ headless: true });

async function waitForQuiet(page, startedAt, timeoutMs = 15000) {
  let lastCount = -1;
  let stableSince = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const count = await page.evaluate(() => performance.getEntriesByType('resource').length).catch(() => 0);
    if (count !== lastCount) {
      lastCount = count;
      stableSince = Date.now();
    }
    if (Date.now() - stableSince >= 750) return Date.now() - startedAt;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return Date.now() - startedAt;
}

async function measureRoute(context, route, profile, accessExpected) {
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  if (profile === 'mobile-fast4g') {
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 150,
      downloadThroughput: 1_600_000 / 8,
      uploadThroughput: 750_000 / 8,
      connectionType: 'cellular4g',
    });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  }
  const responses = [];
  const failures = [];
  const consoleErrors = [];
  const startedAt = Date.now();
  page.on('response', (response) => {
    const request = response.request();
    const timing = request.timing();
    responses.push({
      url: response.url().replace(baseURL, ''),
      method: request.method(),
      type: request.resourceType(),
      status: response.status(),
      durationMs: timing.responseEnd >= 0 ? Math.round(timing.responseEnd) : null,
    });
  });
  page.on('requestfailed', (request) => failures.push({ url: request.url().replace(baseURL, ''), error: request.failure()?.errorText || 'unknown' }));
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text().slice(0, 500)); });
  await page.addInitScript(() => {
    window.__IRIS_PERF__ = { lcp: 0, longTasks: [] };
    try {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const latest = entries[entries.length - 1];
        if (latest) window.__IRIS_PERF__.lcp = latest.startTime;
      }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver((list) => {
        window.__IRIS_PERF__.longTasks.push(...list.getEntries().map((entry) => ({ startTime: entry.startTime, duration: entry.duration })));
      }).observe({ type: 'longtask', buffered: true });
    } catch {}
  });

  let navigationError = null;
  let response;
  try {
    response = await page.goto(`${baseURL}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  } catch (error) {
    navigationError = error instanceof Error ? error.message : String(error);
  }
  const domContentReadyMs = Date.now() - startedAt;
  const featureReadyMs = await waitForQuiet(page, startedAt);
  const metrics = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const resources = performance.getEntriesByType('resource');
    const paints = performance.getEntriesByType('paint');
    const state = window.__IRIS_PERF__ || { lcp: 0, longTasks: [] };
    return {
      ttfbMs: nav ? nav.responseStart : null,
      domContentLoadedMs: nav ? nav.domContentLoadedEventEnd : null,
      loadEventMs: nav ? nav.loadEventEnd : null,
      fcpMs: paints.find((entry) => entry.name === 'first-contentful-paint')?.startTime ?? null,
      lcpMs: state.lcp || null,
      cls: performance.getEntriesByType('layout-shift').filter((entry) => !entry.hadRecentInput).reduce((sum, entry) => sum + entry.value, 0),
      transferBytes: resources.reduce((sum, entry) => sum + (entry.transferSize || 0), 0),
      encodedBytes: resources.reduce((sum, entry) => sum + (entry.encodedBodySize || 0), 0),
      requestCount: resources.length + 1,
      longTaskCount: state.longTasks.length,
      longTaskTotalMs: state.longTasks.reduce((sum, entry) => sum + entry.duration, 0),
      maxLongTaskMs: state.longTasks.reduce((max, entry) => Math.max(max, entry.duration), 0),
      topResources: resources.map((entry) => ({
        name: entry.name.replace(location.origin, ''),
        type: entry.initiatorType,
        durationMs: Math.round(entry.duration),
        transferBytes: entry.transferSize || 0,
        encodedBytes: entry.encodedBodySize || 0,
      })).sort((a, b) => b.transferBytes - a.transferBytes).slice(0, 15),
    };
  }).catch(() => ({}));
  const finalURL = page.url();
  const title = await page.title().catch(() => '');
  const heading = await page.locator('h1, h2, h3').first().textContent({ timeout: 1000 }).catch(() => null);
  const slowRequests = responses.filter((item) => item.durationMs !== null && item.durationMs > 800).sort((a, b) => b.durationMs - a.durationMs);
  const result = {
    route, profile, accessExpected, finalURL: finalURL.replace(baseURL, ''), status: response?.status() ?? null,
    title, heading: heading?.trim() || null, domContentReadyMs, featureReadyMs, navigationError,
    redirectedToLogin: finalURL.includes('/login') && route !== '/login', metrics, slowRequests, failures, consoleErrors,
  };
  if (featureReadyMs > 2000 || navigationError || failures.length) {
    const name = `${profile}-${route === '/' ? 'root' : route.slice(1).replaceAll('/', '-')}.png`;
    await page.screenshot({ path: path.join(screenshotDir, name), fullPage: true }).catch(() => {});
  }
  await page.close();
  return result;
}

async function contextFor(profile) {
  const isMobile = profile === 'mobile-fast4g';
  const context = await browser.newContext(isMobile ? { ...devices['Pixel 7'] } : { ...devices['Desktop Chrome'] });
  return context;
}

const results = [];
for (const profile of ['desktop', 'mobile-fast4g']) {
  for (const route of publicRoutes) {
    const context = await contextFor(profile);
    process.stdout.write(`${profile} ${route}\n`);
    results.push(await measureRoute(context, route, profile, 'public'));
    await context.close();
  }
}

let authStatus = { attempted: false, authenticated: false, reason: 'PERF_TEST_EMAIL and PERF_TEST_PASSWORD were not supplied.' };
if (process.env.PERF_TEST_EMAIL && process.env.PERF_TEST_PASSWORD) {
  const context = await contextFor('desktop');
  const page = await context.newPage();
  authStatus = { attempted: true, authenticated: false, reason: '' };
  const startedAt = Date.now();
  await page.goto(`${baseURL}/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="text"]').fill(process.env.PERF_TEST_EMAIL);
  await page.locator('input[type="password"]').fill(process.env.PERF_TEST_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(5000);
  authStatus.loginAttemptMs = Date.now() - startedAt;
  authStatus.authenticated = !page.url().includes('/login');
  authStatus.reason = authStatus.authenticated
    ? 'Confirmed test session established.'
    : (await page.locator('[class*="rose"], [role="alert"]').first().textContent().catch(() => null)) || 'Login remained on /login.';
  if (authStatus.authenticated) {
    for (const route of protectedRoutes) {
      process.stdout.write(`authenticated ${route}\n`);
      results.push(await measureRoute(context, route, 'desktop-authenticated', 'authenticated'));
    }
  } else {
    for (const route of protectedRoutes) {
      results.push(await measureRoute(context, route, 'desktop-auth-boundary', 'authenticated'));
    }
  }
  await context.close();
}

await browser.close();
const report = { generatedAt: new Date().toISOString(), baseURL, thresholdMs: 2000, authStatus, results };
await fs.writeFile(path.join(outputDir, 'route-performance.json'), `${JSON.stringify(report, null, 2)}\n`);
await fs.writeFile(path.join(networkDir, 'slow-requests.json'), `${JSON.stringify(results.flatMap((result) => result.slowRequests.map((request) => ({ route: result.route, profile: result.profile, ...request }))), null, 2)}\n`);
console.log(`Measured ${results.length} route/profile combinations.`);
