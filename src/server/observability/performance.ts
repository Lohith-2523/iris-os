import 'server-only';

type MetricState = { samples: number[]; count: number; totalMs: number };
type PerformanceGlobal = typeof globalThis & { irisPerformanceMetrics?: Map<string, MetricState> };

const globalPerformance = globalThis as PerformanceGlobal;
const metrics = globalPerformance.irisPerformanceMetrics ?? new Map<string, MetricState>();
globalPerformance.irisPerformanceMetrics = metrics;

const MAX_SAMPLES = 500;

function percentile(sorted: number[], quantile: number) {
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * quantile) - 1)];
}

export function recordPerformanceSample(name: string, durationMs: number) {
  const current = metrics.get(name) ?? { samples: [], count: 0, totalMs: 0 };
  current.count += 1;
  current.totalMs += durationMs;
  current.samples.push(durationMs);
  if (current.samples.length > MAX_SAMPLES) current.samples.shift();
  metrics.set(name, current);

  if (process.env.IRIS_PERFORMANCE_LOGS === '1') {
    console.info(JSON.stringify({ type: 'iris.performance', name, durationMs: Number(durationMs.toFixed(2)) }));
  }
}

export async function measureServerOperation<T>(name: string, operation: () => Promise<T>): Promise<T> {
  const startedAt = performance.now();
  try {
    return await operation();
  } finally {
    recordPerformanceSample(name, performance.now() - startedAt);
  }
}

export function snapshotPerformanceMetrics() {
  return [...metrics.entries()].map(([name, state]) => {
    const sorted = [...state.samples].sort((left, right) => left - right);
    return {
      name,
      count: state.count,
      averageMs: state.count ? state.totalMs / state.count : 0,
      p50Ms: percentile(sorted, 0.5),
      p75Ms: percentile(sorted, 0.75),
      p95Ms: percentile(sorted, 0.95),
      p99Ms: percentile(sorted, 0.99),
    };
  });
}
