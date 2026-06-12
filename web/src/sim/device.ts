import { Rng } from "./rng";

// Port of internal/simdevice. The simulated peripheral answers after a seeded,
// deterministic latency drawn from [minLatency, maxLatency]. Real bench devices
// replied in this window; the old 500 ms comms timeout sat below the upper
// bound, which is what caused the spurious failures in Story 3.
export const DEFAULT_MIN_LATENCY_MS = 600;
export const DEFAULT_MAX_LATENCY_MS = 850;

export interface DeviceConfig {
  name?: string;
  seed?: number;
  minLatencyMs?: number;
  maxLatencyMs?: number;
}

export class Device {
  readonly name: string;
  private rng: Rng;
  private min: number;
  private max: number;

  constructor(cfg: DeviceConfig = {}) {
    let min = cfg.minLatencyMs ?? DEFAULT_MIN_LATENCY_MS;
    if (min <= 0) min = DEFAULT_MIN_LATENCY_MS;
    let max = cfg.maxLatencyMs ?? DEFAULT_MAX_LATENCY_MS;
    if (max < min) max = Math.max(DEFAULT_MAX_LATENCY_MS, min);
    this.min = min;
    this.max = max;
    this.name = cfg.name && cfg.name.length > 0 ? cfg.name : "sim_device";
    this.rng = new Rng(cfg.seed ?? 0);
  }

  // nextLatency draws the next deterministic latency in [min, max] ms, mirroring
  // simdevice.Device.nextLatency (min + rng.Int63n(span+1)).
  nextLatency(): number {
    const span = this.max - this.min;
    if (span <= 0) return this.min;
    return this.min + this.rng.intn(span);
  }
}
