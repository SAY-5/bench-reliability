import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Section } from "./Section";
import { Device, DEFAULT_MIN_LATENCY_MS, DEFAULT_MAX_LATENCY_MS } from "../sim/device";
import { usePrefersReducedMotion } from "./useReducedMotion";
import "./TimeoutFix.css";

const N = 200;
const SEED = 1;
const SLIDER_MIN = 300;
const SLIDER_MAX = 2200;
const AXIS_MIN = 300;
const AXIS_MAX = 950;
const BIN_COUNT = 52;

// The 200 deterministic response times, drawn once from the same seeded model
// the Go toolkit uses. Independent of timeout, so dragging the slider only
// re-reads them, never regenerates.
function useLatencies(): number[] {
  return useMemo(() => {
    const dev = new Device({ name: "physio_monitor", seed: SEED });
    return Array.from({ length: N }, () => dev.nextLatency());
  }, []);
}

interface Bins {
  bins: number[];
  max: number;
}

function buildBins(latencies: number[]): Bins {
  const bins = new Array(BIN_COUNT).fill(0);
  const span = AXIS_MAX - AXIS_MIN;
  for (const l of latencies) {
    let idx = Math.floor(((l - AXIS_MIN) / span) * BIN_COUNT);
    if (idx < 0) idx = 0;
    if (idx >= BIN_COUNT) idx = BIN_COUNT - 1;
    bins[idx]++;
  }
  return { bins, max: Math.max(...bins) };
}

// successRateFor computes the fraction of the N calls that succeed under a given
// timeout and retry policy. A call succeeds if any of its (retries+1) attempts
// lands within the timeout. Attempts consume latencies in sequence from the same
// seeded device, matching the Go client's Call loop, so retry draws stay
// deterministic.
function successRateFor(timeoutMs: number, retries: number): number {
  const dev = new Device({ name: "physio_monitor", seed: SEED });
  let successes = 0;
  const tries = retries + 1;
  for (let i = 0; i < N; i++) {
    let ok = false;
    for (let t = 0; t < tries; t++) {
      if (dev.nextLatency() <= timeoutMs) {
        ok = true; // Call returns on the first attempt within the timeout.
        break;
      }
    }
    if (ok) successes++;
  }
  return successes / N;
}

function xToAxisPct(ms: number): number {
  const p = (ms - AXIS_MIN) / (AXIS_MAX - AXIS_MIN);
  return Math.max(0, Math.min(1, p)) * 100;
}

export function TimeoutFix() {
  const reduced = usePrefersReducedMotion();
  const latencies = useLatencies();
  const [timeout, setTimeoutMs] = useState(500);
  const [retry, setRetry] = useState(true);

  const { bins, max } = useMemo(() => buildBins(latencies), [latencies]);
  const retries = retry ? 2 : 0;
  const rate = useMemo(
    () => successRateFor(timeout, retries),
    [timeout, retries],
  );

  const timeoutPct = xToAxisPct(timeout);
  const binEdgeForTimeout = ((timeout - AXIS_MIN) / (AXIS_MAX - AXIS_MIN)) * BIN_COUNT;

  const ratePct = rate * 100;
  const rateColor =
    rate >= 0.99 ? "var(--good)" : rate <= 0.05 ? "var(--bad)" : "var(--signal-bright)";

  const verdict =
    timeout < DEFAULT_MIN_LATENCY_MS
      ? {
          tag: "gives up too early",
          tagColor: "var(--bad)",
          text: `The timeout sits left of the response window. Every reply arrives after the client has already given up, so ${retry ? "even with retries " : ""}almost nothing gets through. This is the original 500 ms failure.`,
        }
      : timeout < DEFAULT_MAX_LATENCY_MS
        ? {
            tag: "partial",
            tagColor: "var(--signal)",
            text: `The line now cuts through the response window: the fast replies land, the slow ones still miss.${retry ? " Retries recover some of the slow ones." : " Without retries, one slow reply is a lost query."}`,
          }
        : {
            tag: "reliable",
            tagColor: "var(--good)",
            text: `The timeout clears the whole 600 to 850 ms window, so every reply arrives in time. ${retry ? "Retries add headroom while three consecutive misses still surface fast." : "The fix uses 2000 ms with retries so one slow reply is tolerated."}`,
          };

  return (
    <Section
      id="timeout"
      index="01"
      kicker="root cause / the comms timeout was too short"
      title="The timeout fix"
      blurb="Devices reply in 600 to 850 ms, but the client waited only 500 ms. Drag the timeout line and watch the success rate over 200 queries climb from nothing to everything."
    >
      <div className="tf-wrap">
        <div className="tf-panel glass">
          <div className="tf-chart" role="img" aria-label={`Histogram of ${N} simulated response times between ${DEFAULT_MIN_LATENCY_MS} and ${DEFAULT_MAX_LATENCY_MS} milliseconds, with a timeout line at ${timeout} milliseconds`}>
            <div
              className="tf-window"
              aria-hidden="true"
              style={{
                left: `${xToAxisPct(DEFAULT_MIN_LATENCY_MS)}%`,
                width: `${xToAxisPct(DEFAULT_MAX_LATENCY_MS) - xToAxisPct(DEFAULT_MIN_LATENCY_MS)}%`,
              }}
            />
            {bins.map((count, i) => {
              const h = max > 0 ? (count / max) * 100 : 0;
              const fails = i >= binEdgeForTimeout;
              return (
                <motion.div
                  key={i}
                  className={`tf-bin${fails ? " fail" : ""}`}
                  style={{ height: `${h}%` }}
                  initial={reduced ? false : { scaleY: 0 }}
                  whileInView={reduced ? undefined : { scaleY: 1 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.5,
                    delay: reduced ? 0 : Math.min(i * 0.012, 0.6),
                    ease: [0.16, 1, 0.3, 1],
                  }}
                />
              );
            })}
            <div
              className="tf-timeoutline"
              aria-hidden="true"
              data-label={`timeout ${timeout} ms`}
              style={{ left: `${timeoutPct}%` }}
            />
          </div>
          <div className="tf-axis" aria-hidden="true">
            <span>{AXIS_MIN} ms</span>
            <span>response window 600&ndash;850 ms</span>
            <span>{AXIS_MAX} ms</span>
          </div>

          <div className="tf-controls">
            <div className="tf-slider-row">
              <label className="tf-slider-label" htmlFor="tf-timeout">
                <span>per-attempt timeout</span>
                <b>{timeout} ms</b>
              </label>
              <input
                id="tf-timeout"
                className="tf-slider"
                type="range"
                min={SLIDER_MIN}
                max={SLIDER_MAX}
                step={10}
                value={timeout}
                onChange={(e) => setTimeoutMs(Number(e.target.value))}
                aria-valuetext={`${timeout} milliseconds, ${ratePct.toFixed(0)} percent success`}
              />
              <div className="tf-presets">
                {[
                  { label: "500 ms (old)", v: 500 },
                  { label: "850 ms", v: 850 },
                  { label: "2000 ms (fix)", v: 2000 },
                ].map((p) => (
                  <button
                    key={p.v}
                    type="button"
                    className="tf-preset"
                    aria-pressed={timeout === p.v}
                    onClick={() => setTimeoutMs(p.v)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="tf-toggle">
              <input
                type="checkbox"
                checked={retry}
                onChange={(e) => setRetry(e.target.checked)}
              />
              retry up to 3 attempts (the fix)
            </label>
          </div>
        </div>

        <div className="tf-readout glass">
          <div
            className="tf-rate"
            style={{ color: rateColor }}
            aria-hidden="true"
          >
            {ratePct.toFixed(0)}
            <small>%</small>
          </div>
          <div className="tf-verdict">
            <span
              className="tag"
              style={{ background: verdict.tagColor + "22", color: verdict.tagColor }}
            >
              {verdict.tag}
            </span>
            <p>
              <strong style={{ color: "var(--ink-0)" }}>
                {Math.round(rate * N)} of {N} queries
              </strong>{" "}
              succeed at {timeout} ms{retry ? " with retries" : ""}.
            </p>
            <p style={{ marginTop: "0.7rem" }}>{verdict.text}</p>
          </div>
        </div>
      </div>
    </Section>
  );
}
