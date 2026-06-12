import { motion, useScroll, useSpring } from "framer-motion";
import { usePrefersReducedMotion } from "./useReducedMotion";

// A thin amber progress rail at the top of the viewport. Purely decorative.
export function ScrollProgress() {
  const reduced = usePrefersReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <motion.div
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        transformOrigin: "0% 50%",
        scaleX: reduced ? 1 : scaleX,
        background:
          "linear-gradient(90deg, var(--signal-deep), var(--signal-bright))",
        boxShadow: "0 0 14px var(--signal-glow)",
        zIndex: 50,
      }}
    />
  );
}
