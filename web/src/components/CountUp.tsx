import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "./useReducedMotion";

interface Props {
  to: number;
  from?: number;
  durationMs?: number;
  decimals?: number;
  delayMs?: number;
}

// Animates a number from `from` to `to`. Respects reduced-motion by snapping to
// the final value. Uses requestAnimationFrame with an ease-out curve.
export function CountUp({
  to,
  from = 0,
  durationMs = 1400,
  decimals = 0,
  delayMs = 0,
}: Props) {
  const reduced = usePrefersReducedMotion();
  const [value, setValue] = useState(reduced ? to : from);
  const raf = useRef<number>();

  useEffect(() => {
    if (reduced) {
      setValue(to);
      return;
    }
    let start: number | null = null;
    const tick = (t: number) => {
      if (start === null) start = t;
      const elapsed = t - start - delayMs;
      if (elapsed < 0) {
        raf.current = requestAnimationFrame(tick);
        return;
      }
      const p = Math.min(elapsed / durationMs, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(from + (to - from) * eased);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [to, from, durationMs, delayMs, reduced]);

  return <>{value.toFixed(decimals)}</>;
}
