import { motion } from "framer-motion";
import { CountUp } from "./CountUp";
import { usePrefersReducedMotion } from "./useReducedMotion";
import "./Hero.css";

const causes = [
  "Windows replaced the driver",
  "Linux renamed the ports",
  "The timeout was too short",
];

export function Hero() {
  const reduced = usePrefersReducedMotion();
  const rise = (delay: number) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, y: 24 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] },
        };

  return (
    <header className="hero">
      <div className="hero-grid" aria-hidden="true" />
      <div className="hero-inner">
        <motion.p className="eyebrow" {...rise(0)}>
          bench reliability &middot; story 3
        </motion.p>

        <motion.h1 {...rise(0.08)}>Same three problems, every week.</motion.h1>

        <motion.p className="hero-lede" {...rise(0.18)}>
          A bank of shared lab bench workstations, wired to serial peripherals,
          kept generating the same support tickets. Three root causes. One fix
          each.
        </motion.p>
        <motion.p className="hero-sub" {...rise(0.26)}>
          This is the whole repair, rebuilt as a model you can run in the
          browser. No hardware, every number reproducible.
        </motion.p>

        <motion.div className="statline" {...rise(0.4)} aria-hidden="true">
          <div className="stat stat-before">
            <span className="stat-value">
              <CountUp to={8} durationMs={1100} delayMs={500} />
            </span>
            <span className="stat-unit">tickets / week</span>
          </div>
          <span className="stat-arrow">&rarr;</span>
          <div className="stat stat-after">
            <span className="stat-value">
              <CountUp to={2} durationMs={1100} delayMs={1300} />
            </span>
            <span className="stat-unit">tickets / month</span>
          </div>
        </motion.div>
        <p className="hero-sub" style={{ marginTop: "0.9rem" }}>
          Eight tickets a week fell to about two a month once all three causes
          were removed.
        </p>

        <motion.div className="hero-causes" {...rise(0.52)}>
          {causes.map((c) => (
            <span className="cause-chip" key={c}>
              <span className="dot" aria-hidden="true" />
              {c}
            </span>
          ))}
        </motion.div>
      </div>
      <span className="scroll-cue">scroll to trace the fixes</span>
    </header>
  );
}
