// Console self-check that reproduces the key numbers from the Go toolkit's
// comms-bench and tickets commands. Imported once at startup so the figures are
// visible in the browser console, and runnable standalone via `npm run
// selfcheck`. It asserts nothing fatal; it logs so the model can be eyeballed.
import { Client } from "./comms";
import { Device, DEFAULT_MIN_LATENCY_MS, DEFAULT_MAX_LATENCY_MS } from "./device";
import { successRate } from "./comms";
import {
  seed,
  histogram,
  summarize,
  ROOT_CAUSES,
  categories,
} from "./tickets";

function measure(timeoutMs: number, retries: number, n: number, seedVal: number) {
  const dev = new Device({ name: "physio_monitor", seed: seedVal });
  const client = new Client(dev, { timeoutMs, retries });
  return client.measure(n);
}

export function runSelfCheck(): void {
  const N = 200;
  const SEED = 1;

  const before = measure(500, 0, N, SEED);
  const after = measure(2000, 2, N, SEED);

  const lines: string[] = [];
  lines.push(
    `comms-bench over ${N} queries (device replies in ${DEFAULT_MIN_LATENCY_MS} to ${DEFAULT_MAX_LATENCY_MS} ms)`,
  );
  lines.push(
    `  measured (2000ms policy): min ${after.minMs} | median ${after.medianMs} | p95 ${after.p95Ms} | max ${after.maxMs} ms`,
  );
  lines.push(
    `  before  500ms timeout, 0 retries:  ${(successRate(before) * 100).toFixed(1)}% (${before.successes}/${before.queries})`,
  );
  lines.push(
    `  after  2000ms timeout, 2 retries:  ${(successRate(after) * 100).toFixed(1)}% (${after.successes}/${after.queries})`,
  );

  const ts = seed();
  const h = histogram(ts);
  lines.push(`tickets root-cause histogram over ${ts.length} tickets:`);
  for (const c of categories()) lines.push(`  ${c.padEnd(14)} ${h[c]}`);

  const sum = summarize(ts, ROOT_CAUSES);
  lines.push(
    `  before: ${sum.beforePerWeek.toFixed(1)} / week (~${Math.round(sum.beforePerMonth)} / month)`,
  );
  lines.push(
    `  after:  ${sum.afterPerWeek.toFixed(1)} / week (~${Math.round(sum.afterPerMonth)} / month)`,
  );

  // eslint-disable-next-line no-console
  console.log(
    "%cbench-reliability self-check",
    "color:#ff9b3d;font-weight:bold",
    "\n" + lines.join("\n"),
  );
}

// When run directly under tsx (not in the browser), execute immediately.
const g = globalThis as { process?: { versions?: { node?: string } } };
if (g.process?.versions?.node) runSelfCheck();
