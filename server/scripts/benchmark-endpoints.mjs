import { summarizeLatency } from '../src/utils/performance.js';

const BASE_URL = process.env.BENCH_BASE_URL || 'http://localhost:3001/api/v1';
const ITERATIONS = Math.max(5, Number.parseInt(process.env.BENCH_ITERATIONS || '20', 10));

const endpoints = [
  { name: 'feed', path: '/feed?limit=24' },
  { name: 'search', path: '/search?q=tech&limit=20' },
  { name: 'trending', path: '/trending?limit=10&windowHours=48' },
  { name: 'posts-trending', path: '/posts/trending' },
];

async function measure(path) {
  const durations = [];

  for (let i = 0; i < ITERATIONS; i += 1) {
    const start = process.hrtime.bigint();
    const res = await fetch(`${BASE_URL}${path}`);
    await res.text();
    const end = process.hrtime.bigint();
    if (!res.ok) {
      throw new Error(`Benchmark request failed for ${path} with ${res.status}`);
    }
    durations.push(Number(end - start) / 1_000_000);
  }

  return summarizeLatency(durations);
}

async function run() {
  console.log(`Benchmark base URL: ${BASE_URL}`);
  console.log(`Iterations per endpoint: ${ITERATIONS}`);

  for (const endpoint of endpoints) {
    const stats = await measure(endpoint.path);
    console.log(`\n${endpoint.name}`);
    console.log(`  count: ${stats.count}`);
    console.log(`  min:   ${stats.min.toFixed(2)}ms`);
    console.log(`  avg:   ${stats.avg.toFixed(2)}ms`);
    console.log(`  p50:   ${stats.p50.toFixed(2)}ms`);
    console.log(`  p95:   ${stats.p95.toFixed(2)}ms`);
    console.log(`  max:   ${stats.max.toFixed(2)}ms`);
  }
}

run().catch((err) => {
  console.error('Benchmark failed:', err.message);
  process.exit(1);
});