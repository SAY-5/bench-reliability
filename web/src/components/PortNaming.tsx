import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Section } from "./Section";
import { generate, type Mapping } from "../sim/udev";
import { usePrefersReducedMotion } from "./useReducedMotion";
import "./PortNaming.css";

// The three bench peripherals, each with a burned-in serial and the stable name
// its software hardcodes. These mirror the README's sample mapping.
interface Dev {
  serial: string;
  name: string;
  label: string;
}
const DEVICES: Dev[] = [
  { serial: "AH01T3XC", name: "physio_monitor", label: "Physiological monitor" },
  { serial: "BK22Z9QP", name: "anesthesia_controller", label: "Anesthesia controller" },
  { serial: "CM77R4Wd".toUpperCase(), name: "dose_calibrator", label: "Dose calibrator" },
];

// The piece of software that hardcodes a single path. Before udev rules it
// targets /dev/ttyUSB0; the fix lets it target the stable /dev/physio_monitor.
const TARGET_DEV = DEVICES[0];

const PLUG_ORDERS: number[][] = [
  [0, 1, 2],
  [2, 0, 1],
  [1, 2, 0],
  [2, 1, 0],
];

export function PortNaming() {
  const reduced = usePrefersReducedMotion();
  const [orderIdx, setOrderIdx] = useState(0);
  const [rulesOn, setRulesOn] = useState(false);

  // order[i] = device index plugged into physical slot i.
  const order = PLUG_ORDERS[orderIdx];

  const mappings: Mapping[] = DEVICES.map((d) => ({ serial: d.serial, name: d.name }));
  const rulesText = useMemo(() => generate(mappings).rules, []);

  function replug() {
    setOrderIdx((i) => {
      let next = i;
      while (next === i) next = Math.floor(Math.random() * PLUG_ORDERS.length);
      return next;
    });
  }

  // What path resolves to TARGET_DEV right now?
  const targetSlot = order.indexOf(0); // physical slot holding the monitor
  const targetPath = rulesOn
    ? `/dev/${TARGET_DEV.name}`
    : `/dev/ttyUSB${targetSlot}`;
  // The software always asks for the same hardcoded path.
  const hardcoded = rulesOn ? `/dev/${TARGET_DEV.name}` : "/dev/ttyUSB0";
  const softwareFinds = hardcoded === targetPath;

  return (
    <Section
      id="ports"
      index="02"
      kicker="root cause / linux renamed the usb ports"
      title="The port-naming fix"
      blurb="Linux names USB serial adapters by plug order, so a hardcoded path finds a different device every replug. Replug the bench and watch the names shuffle. Then apply udev rules and each serial locks to a permanent name."
    >
      <div className="pn-wrap">
        <div className="pn-stage glass">
          <div className="pn-bar">
            <button type="button" className="pn-btn" onClick={replug}>
              &#x21bb; Replug devices
            </button>
            <button
              type="button"
              className="pn-btn ghost"
              onClick={() => setOrderIdx(0)}
            >
              Reset order
            </button>
            <button
              type="button"
              className="pn-toggle"
              aria-pressed={rulesOn}
              onClick={() => setRulesOn((v) => !v)}
            >
              apply udev rules
              <span className="pn-switch" data-on={rulesOn} aria-hidden="true" />
            </button>
          </div>

          <div className="pn-ports">
            {order.map((devIdx, slot) => {
              const d = DEVICES[devIdx];
              const path = rulesOn ? `/dev/${d.name}` : `/dev/ttyUSB${slot}`;
              return (
                <motion.div
                  key={d.serial}
                  layout={!reduced}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="pn-port"
                >
                  <span className="pn-plug">slot {slot}</span>
                  <span>
                    <span className="pn-dev-name">{d.label}</span>
                    <span className="pn-dev-serial">serial {d.serial}</span>
                  </span>
                  <span className={`pn-path ${rulesOn ? "stable" : "shuffled"}`}>
                    {path}
                  </span>
                </motion.div>
              );
            })}
          </div>

          <div className="pn-software">
            <div className="lead">bench software (hardcoded path)</div>
            <div>
              open(<span style={{ color: "var(--ink-0)" }}>{hardcoded}</span>) &rarr;{" "}
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={`${softwareFinds}-${orderIdx}-${rulesOn}`}
                  initial={reduced ? false : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduced ? undefined : { opacity: 0, y: -4 }}
                  transition={{ duration: 0.25 }}
                  className={softwareFinds ? "ok" : "err"}
                >
                  {softwareFinds
                    ? `connected to ${TARGET_DEV.label.toLowerCase()}`
                    : `wrong device or not found`}
                </motion.span>
              </AnimatePresence>
            </div>
            <div style={{ marginTop: "0.4rem", color: "var(--ink-2)", fontSize: "0.8rem" }}>
              {rulesOn
                ? "The serial-based symlink resolves to the same hardware every time, in any plug order."
                : "Without rules the monitor sits on " +
                  targetPath +
                  " this replug, so the hardcoded /dev/ttyUSB0 hits the wrong device."}
            </div>
          </div>
        </div>

        <div className="pn-rules glass">
          <h3>{rulesOn ? "Active udev rules" : "The rules to write"}</h3>
          <p className="sub">
            Read each serial with <code>udevadm info -a</code>, then map it to a
            permanent name in <code>/etc/udev/rules.d/99-lab.rules</code>.
          </p>
          <div className={`pn-rulebox${rulesOn ? "" : " dim"}`}>
            {rulesText.split("\n").map((line, i) =>
              line.startsWith("#") ? (
                <div key={i} className="cmt">
                  {line}
                </div>
              ) : line ? (
                <div key={i}>{line}</div>
              ) : null,
            )}
          </div>
          <p className="pn-rules-note">
            {rulesOn
              ? "Built by the same validator as the Go gen-udev command: sorted by name, with duplicate serials and names rejected."
              : "Toggle apply udev rules to load these and stop the shuffle."}
          </p>
        </div>
      </div>
    </Section>
  );
}
