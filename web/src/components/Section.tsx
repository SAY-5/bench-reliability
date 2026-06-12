import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { usePrefersReducedMotion } from "./useReducedMotion";

interface Props {
  id: string;
  index: string;
  kicker: string;
  title: string;
  blurb?: string;
  children: ReactNode;
}

// A consistent, accessible section shell: numbered kicker, heading, optional
// blurb, then content. Reveals on scroll unless reduced motion is requested.
export function Section({ id, index, kicker, title, blurb, children }: Props) {
  const reduced = usePrefersReducedMotion();
  const reveal = reduced
    ? {}
    : {
        initial: { opacity: 0, y: 30 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: "-12% 0px" },
        transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const },
      };

  return (
    <motion.section id={id} className="section" {...reveal}>
      <div className="section-head">
        <p className="eyebrow">
          <span style={{ color: "var(--ink-3)" }}>{index}</span> &nbsp;{kicker}
        </p>
        <h2>{title}</h2>
        {blurb ? <p>{blurb}</p> : null}
      </div>
      {children}
    </motion.section>
  );
}
