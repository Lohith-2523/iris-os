import { spawnSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const baseURL = process.env.PERF_BASE_URL || 'http://127.0.0.1:3000';
const inventory = JSON.parse(await fs.readFile(path.join(root, 'performance-audit', 'route-inventory.json'), 'utf8'));
const routes = inventory.filter((item) => item.access === 'public').map((item) => item.route);
const outDir = path.join(root, 'performance-audit', 'reports', 'lighthouse');
await fs.mkdir(outDir, { recursive: true });

for (const profile of ['mobile', 'desktop']) {
  for (const route of routes) {
    const slug = route === '/' ? 'root' : route.slice(1).replaceAll('/', '-');
    const outputBase = path.join(outDir, `${slug}-${profile}`);
    const jsonReport = `${outputBase}.report.json`;
    process.stdout.write(`${profile} ${route}\n`);
    const args = [
      path.join(root, 'node_modules', 'lighthouse', 'cli', 'index.js'),
      `${baseURL}${route}`, '--quiet',
      '--chrome-flags=--headless --no-sandbox',
      '--output=json', '--output=html', `--output-path=${outputBase}`,
    ];
    if (profile === 'desktop') args.push('--preset=desktop');
    const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', shell: false });
    try {
      await fs.access(jsonReport);
    } catch {
      throw new Error(`Lighthouse failed for ${profile} ${route}: ${result.error?.message || result.stderr || result.stdout || 'unknown error'}`);
    }
  }
}

console.log(`Generated ${routes.length * 2} Lighthouse JSON/HTML report pairs.`);
