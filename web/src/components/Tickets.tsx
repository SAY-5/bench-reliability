import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Section } from "./Section";
import {
  seed,
  histogram,
  summarize,
  ROOT_CAUSES,
  type Category,
} from "../sim/tickets";
import { usePrefersReducedMotion } from "./useReducedMotion";
import "./Tickets.css";

const CAUSE_LABELS: Record<Category, string> = {
  "driver-update": "Driver replaced by Windows Update",
  "port-naming": "USB port renamed by plug order",
  timeout: "Comms timeout too short",
  uncategorized: "Unrelated (keyboard, stand, ...)",
};

export function Tickets() {
  const reduced = usePrefersReducedMotion();
  const tickets = useMemo(() => seed(), []);
  const hist = useMemo(() => histogram(tickets), [tickets]);
  const [fixed, setFixed] = useState<Set<Category>>(new Set());

  const maxCount = Math.max(...ROOT_CAUSES.map((c) => hist[c]), hist.uncategorized);

  const summary = useMemo(
    () => summarize(tickets, [...fixed]),
    [tickets, fixed],
  );

  function toggle(cat: Category) {
    setFixed((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  const allFixed = ROOT_CAUSES.every((c) => fixed.has(c));

  return (
    <Section
      id="tickets"
      index="03"
      kicker="result / the support queue"
      title="Three causes, eight tickets, gone"
      blurb="Every ticket is bucketed by the same keyword classifier the toolkit uses. Mark each root cause fixed and watch the weekly volume fall toward the unrelated residue: about two a month."
    >
      <div className="tk-wrap">
        <div className="tk-panel glass">
          <div className="tk-causes">
            {ROOT_CAUSES.map((cat) => {
              const count = hist[cat];
              const isFixed = fixed.has(cat);
              return (
                <div className="tk-cause" key={cat}>
                  <div className="tk-cause-head">
                    <span className="tk-cause-name">{CAUSE_LABELS[cat]}</span>
                    <button
                      type="button"
                      className="tk-fixbtn"
                      aria-pressed={isFixed}
                      onClick={() => toggle(cat)}
                    >
                      {isFixed ? "fixed ✓" : "mark fixed"}
                    </button>
                  </div>
                  <div className="tk-cause-head">
                    <div className="tk-track" style={{ flex: 1 }}>
                      <motion.div
                        className={`tk-fill${isFixed ? " fixed" : ""}`}
                        initial={false}
                        animate={{
                          scaleX: (count / maxCount) * (isFixed ? 0.12 : 1),
                          opacity: isFixed ? 0.5 : 1,
                        }}
                        transition={{
                          duration: reduced ? 0 : 0.5,
                          ease: [0.16, 1, 0.3, 1],
                        }}
                        style={{ width: "100%" }}
                      />
                    </div>
                    <span className="tk-count">
                      {isFixed ? 0 : count}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* The residue that survives every fix. */}
            <div className="tk-cause">
              <div className="tk-cause-head">
                <span className="tk-cause-name" style={{ color: "var(--ink-2)" }}>
                  {CAUSE_LABELS.uncategorized}
                </span>
                <span className="tk-count" style={{ color: "var(--ink-3)" }}>
                  always
                </span>
              </div>
              <div className="tk-cause-head">
                <div className="tk-track" style={{ flex: 1 }}>
                  <div
                    className="tk-fill residue"
                    style={{ width: `${(hist.uncategorized / maxCount) * 100}%` }}
                  />
                </div>
                <span className="tk-count">{hist.uncategorized}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="tk-volume glass">
          <div className="tk-vrow">
            <div>
              <div className="tk-vlabel">before</div>
              <div className="tk-vbig before">
                {summary.beforePerWeek.toFixed(1)}
                <small>/ week</small>
              </div>
            </div>
          </div>
          <div className="tk-vrow">
            <div>
              <div className="tk-vlabel">
                after {fixed.size > 0 ? `(${fixed.size} fixed)` : ""}
              </div>
              <motion.div
                className="tk-vbig after"
                key={summary.afterPerMonth.toFixed(2)}
                initial={reduced ? false : { opacity: 0.4, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                {summary.afterPerWeek.toFixed(1)}
                <small>
                  / week &middot; ~{Math.round(summary.afterPerMonth)} / month
                </small>
              </motion.div>
            </div>
          </div>
          <p className="tk-hint">
            {allFixed
              ? "All three root causes fixed: only the unrelated residue remains, about two tickets a month."
              : "Mark all three causes fixed to reach the real outcome."}
          </p>
        </div>

        <div className="tk-driver glass">
          <div>
            <h3>The Windows driver lock</h3>
            <p style={{ marginTop: "0.5rem" }}>
              A Windows Update silently swapped the vendor driver (v2.3.1) for a
              generic one, so the device showed up as an Unknown Device. The fix:
              reinstall the correct driver, then lock it via Group Policy so
              updates never replace it, and document it on one page so
              non-engineers can self-serve.
            </p>
          </div>
          <div className="tk-gpo" role="figure" aria-label="Group Policy setting that locks the driver">
            <div className="path">Computer Configuration</div>
            <div className="path">&nbsp;&nbsp;&rsaquo; Administrative Templates</div>
            <div className="path">&nbsp;&nbsp;&nbsp;&nbsp;&rsaquo; Windows Update</div>
            <div style={{ marginTop: "0.6rem", color: "var(--ink-0)" }}>
              "Do not include drivers with Windows Updates"
            </div>
            <div className="set">&nbsp;&nbsp;= Enabled</div>
          </div>
        </div>
      </div>
    </Section>
  );
}
