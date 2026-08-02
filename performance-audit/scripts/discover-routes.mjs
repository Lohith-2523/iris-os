import { promises as fs } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const appDir = path.join(root, 'src', 'app');
const outDir = path.join(root, 'performance-audit');
const publicRoutes = new Set([
  '/', '/home', '/pricing', '/terms', '/privacy', '/signup', '/onboarding/member',
  '/invite', '/login', '/coming-soon', '/waitlist',
]);

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  }));
  return nested.flat();
}

function routeFromPage(file) {
  const relative = path.relative(appDir, path.dirname(file)).replaceAll('\\', '/');
  const segments = relative.split('/').filter(Boolean).filter((segment) => !/^\(.+\)$/.test(segment));
  return `/${segments.join('/')}`.replace(/\/$/, '') || '/';
}

function apiSources(source) {
  return [...source.matchAll(/(?:workspaceFetch|fetch)\(\s*['"`]([^'"`]+)['"`]/g)]
    .map((match) => match[1])
    .filter((value, index, all) => all.indexOf(value) === index);
}

const files = await walk(appDir);
const pages = files.filter((file) => /[\\/]page\.(tsx|ts|jsx|js)$/.test(file));
const inventory = [];

for (const file of pages.sort()) {
  const source = await fs.readFile(file, 'utf8');
  const route = routeFromPage(file);
  const sources = apiSources(source);
  const isClient = /^\s*['"]use client['"]/.test(source);
  const isDynamic = route === '/client-leads';
  const access = publicRoutes.has(route)
    ? 'public'
    : route === '/onboarding'
      ? 'authenticated'
      : 'authenticated / role-based';
  const largeSignals = /recharts|Table|DataTable|pdf-lib|xlsx|exceljs|openpgp/.test(source);
  inventory.push({
    route,
    source: path.relative(root, file).replaceAll('\\', '/'),
    access,
    rendering: isDynamic ? 'SSR / mixed' : isClient ? 'static shell + client-rendered feature' : 'static / server-rendered',
    dataSources: sources.length ? sources : ['none detected in page module'],
    expectedDataSize: largeSignals ? 'medium-to-large' : sources.length ? 'medium' : 'small',
    criticality: ['/login', '/dashboard', '/client-dashboard', '/finance', '/projects', '/tasks'].includes(route) ? 'critical' : access === 'public' ? 'medium' : 'high',
    testState: publicRoutes.has(route) ? 'anonymous' : 'confirmed seeded account with representative workspace',
    notes: isClient ? 'Client Component route; inspect hydration, effects, and request fan-out.' : 'Server Component route.',
  });
}

await fs.mkdir(outDir, { recursive: true });
await fs.writeFile(path.join(outDir, 'route-inventory.json'), `${JSON.stringify(inventory, null, 2)}\n`);

const rows = inventory.map((item) => `| ${item.route} | ${item.access} | ${item.rendering} | ${item.dataSources.join('<br>')} | ${item.expectedDataSize} | ${item.criticality} | ${item.testState} | ${item.notes} |`);
const markdown = `# IrisOS route inventory\n\nGenerated from \`src/app/**/page.*\` on ${new Date().toISOString()}. API-only handlers are catalogued separately by the runtime audit.\n\n| Route | Access | Rendering | Data sources | Expected data size | Criticality | Test state | Notes |\n|---|---|---|---|---|---|---|---|\n${rows.join('\n')}\n`;
await fs.writeFile(path.join(outDir, 'route-inventory.md'), markdown);
console.log(`Discovered ${inventory.length} page routes.`);
