import { promises as fs } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const budget = JSON.parse(await fs.readFile(path.join(root, 'performance-audit', 'performance-budget.json'), 'utf8'));
const audit = JSON.parse(await fs.readFile(path.join(root, 'performance-audit', 'reports', 'playwright', 'route-performance.json'), 'utf8'));
const failures = audit.results.filter((item) => !item.redirectedToLogin && item.featureReadyMs > budget.loading.featureLoadFailMs);
console.log(`${failures.length} measured route/profile combinations exceeded ${budget.loading.featureLoadFailMs} ms.`);
for (const item of failures) console.log(`${item.profile}\t${item.route}\t${item.featureReadyMs}ms`);
if (process.env.CI && failures.length) process.exitCode = 1;
