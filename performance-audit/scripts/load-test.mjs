import { promises as fs } from 'node:fs';
import path from 'node:path';

const baseURL = process.env.PERF_BASE_URL || 'http://127.0.0.1:3000';
const routes = ['/', '/home', '/pricing', '/login'];
const stages = [1, 5, 10, 25];
const samplesPerStage = 40;
const results = [];

function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] || 0;
}

for (const concurrency of stages) {
  const durations = [];
  let failures = 0;
  let cursor = 0;
  const started = performance.now();
  async function worker() {
    while (cursor < samplesPerStage) {
      const index = cursor++;
      const route = routes[index % routes.length];
      const requestStarted = performance.now();
      try {
        const response = await fetch(`${baseURL}${route}`, { redirect: 'manual' });
        await response.arrayBuffer();
        durations.push(performance.now() - requestStarted);
        if (response.status >= 500) failures += 1;
      } catch {
        durations.push(performance.now() - requestStarted);
        failures += 1;
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  const wallMs = performance.now() - started;
  results.push({
    concurrency, requests: samplesPerStage, wallMs: Math.round(wallMs),
    requestsPerSecond: Number((samplesPerStage / (wallMs / 1000)).toFixed(2)),
    p50Ms: Math.round(percentile(durations, 0.5)), p90Ms: Math.round(percentile(durations, 0.9)),
    p95Ms: Math.round(percentile(durations, 0.95)), p99Ms: Math.round(percentile(durations, 0.99)),
    failures, failureRate: failures / samplesPerStage,
  });
}

const target = path.join(process.cwd(), 'performance-audit', 'reports', 'load');
await fs.mkdir(target, { recursive: true });
await fs.writeFile(path.join(target, 'local-public-load.json'), `${JSON.stringify({ generatedAt: new Date().toISOString(), baseURL, routes, results }, null, 2)}\n`);
console.table(results);
