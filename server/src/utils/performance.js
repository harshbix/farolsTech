import logger from './logger.js';

export function nowMs() {
  return Number(process.hrtime.bigint() / 1000000n);
}

export function timeOperation(name, fn, meta = {}) {
  const started = nowMs();
  const result = fn();
  const durationMs = nowMs() - started;
  logger.info(`[perf] ${name} ${durationMs}ms ${JSON.stringify(meta)}`);
  return { result, durationMs };
}

export function logEndpointTiming(endpointName, startedAtMs, meta = {}) {
  const durationMs = nowMs() - startedAtMs;
  logger.info(`[perf] endpoint=${endpointName} durationMs=${durationMs} meta=${JSON.stringify(meta)}`);
  return durationMs;
}

export function percentile(values, p) {
  if (!Array.isArray(values) || values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

export function summarizeLatency(values) {
  if (!values.length) return { count: 0, min: 0, max: 0, p50: 0, p95: 0, avg: 0 };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const sum = values.reduce((acc, v) => acc + v, 0);
  return {
    count: values.length,
    min,
    max,
    p50: percentile(values, 50),
    p95: percentile(values, 95),
    avg: Math.round((sum / values.length) * 100) / 100,
  };
}