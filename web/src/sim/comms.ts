import { Device } from "./device";

// Port of internal/comms. A Client issues a request under a per-attempt timeout
// and retries up to a configured count. In virtual time a query either returns
// after its drawn latency, or, if that latency exceeds the timeout, the attempt
// fails (the context deadline fires mid-wait, like ErrVirtualDeadline in Go).
//
// Story 3: the old policy used a 500 ms timeout with no retries, so every reply
// (600 to 850 ms) arrived too late and 0% of queries succeeded. The fix raised
// the timeout to 2000 ms and added retries, tolerating one slow reply while
// three consecutive misses still surface quickly.
export interface CommsConfig {
  timeoutMs: number;
  retries: number;
}

export interface Attempt {
  latencyMs: number;
  ok: boolean;
}

export interface CallResult {
  attempts: Attempt[];
  latencyMs: number;
  ok: boolean;
}

export interface Stats {
  queries: number;
  successes: number;
  minMs: number;
  medianMs: number;
  p95Ms: number;
  maxMs: number;
}

export function successRate(s: Stats): number {
  return s.queries === 0 ? 0 : s.successes / s.queries;
}

export class Client {
  private dev: Device;
  private timeoutMs: number;
  private retries: number;

  constructor(dev: Device, cfg: CommsConfig) {
    this.dev = dev;
    this.timeoutMs = cfg.timeoutMs > 0 ? cfg.timeoutMs : 2000;
    this.retries = cfg.retries < 0 ? 0 : cfg.retries;
  }

  // call issues one logical request, retrying on timeout up to the retry count.
  // It returns as soon as an attempt lands within the timeout.
  call(): CallResult {
    const res: CallResult = { attempts: [], latencyMs: 0, ok: false };
    const tries = this.retries + 1;
    for (let i = 0; i < tries; i++) {
      const latency = this.dev.nextLatency();
      const ok = latency <= this.timeoutMs;
      // On timeout the device records the elapsed time up to the deadline.
      const recorded = ok ? latency : this.timeoutMs;
      res.attempts.push({ latencyMs: recorded, ok });
      if (ok) {
        res.ok = true;
        res.latencyMs = latency;
        return res;
      }
    }
    return res;
  }

  // measure runs n calls and reports latency statistics over the successful
  // attempts plus the overall success rate. Pure measurement, no evaluation.
  measure(n: number): Stats {
    const st: Stats = {
      queries: n,
      successes: 0,
      minMs: 0,
      medianMs: 0,
      p95Ms: 0,
      maxMs: 0,
    };
    const latencies: number[] = [];
    for (let i = 0; i < n; i++) {
      const r = this.call();
      if (r.ok) {
        st.successes++;
        latencies.push(r.latencyMs);
      }
    }
    if (latencies.length === 0) return st;
    latencies.sort((a, b) => a - b);
    st.minMs = latencies[0];
    st.maxMs = latencies[latencies.length - 1];
    st.medianMs = percentile(latencies, 0.5);
    st.p95Ms = percentile(latencies, 0.95);
    return st;
  }
}

// percentile returns the p-quantile (0..1) of a sorted array using the
// nearest-rank method, matching comms.percentile in the Go toolkit.
export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (p <= 0) return sorted[0];
  if (p >= 1) return sorted[sorted.length - 1];
  let rank = Math.floor(p * sorted.length + 0.5);
  if (rank < 1) rank = 1;
  if (rank > sorted.length) rank = sorted.length;
  return sorted[rank - 1];
}
