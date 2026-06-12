// Port of internal/tickets. Shared bench workstations produced roughly eight
// tickets a week, driven by three root causes: a Windows Update swapping a
// vendor driver for a generic one, Linux renaming USB ports by plug order, and
// a comms timeout shorter than device response times. A keyword classifier
// buckets each ticket, and a before/after summary shows the volume dropping to
// about two a month once every cause is marked fixed.

export type Category =
  | "driver-update"
  | "port-naming"
  | "timeout"
  | "uncategorized";

export const DRIVER_UPDATE: Category = "driver-update";
export const PORT_NAMING: Category = "port-naming";
export const TIMEOUT: Category = "timeout";
export const UNCATEGORIZED: Category = "uncategorized";

// The three real root causes in stable order.
export const ROOT_CAUSES: Category[] = [DRIVER_UPDATE, PORT_NAMING, TIMEOUT];

export interface Ticket {
  id: string;
  week: number;
  summary: string;
}

// keywordRules maps a category to the lowercase keywords that imply it. The
// first matching category in ROOT_CAUSES order wins. No user text is evaluated;
// only substring checks run.
const keywordRules: Record<Exclude<Category, "uncategorized">, string[]> = {
  "driver-update": [
    "driver",
    "windows update",
    "unknown device",
    "code 28",
    "device manager",
    "generic driver",
    "v2.3.1",
  ],
  "port-naming": [
    "ttyusb",
    "port order",
    "plug order",
    "wrong port",
    "/dev/tty",
    "symlink",
    "device path",
    "renamed",
  ],
  timeout: [
    "timeout",
    "timed out",
    "no response",
    "slow response",
    "gave up",
    "500ms",
    "response time",
  ],
};

// classify buckets a ticket by scanning its summary for known keywords.
export function classify(t: Ticket): Category {
  const s = t.summary.toLowerCase();
  for (const cat of ROOT_CAUSES) {
    for (const kw of keywordRules[cat as Exclude<Category, "uncategorized">]) {
      if (s.includes(kw)) return cat;
    }
  }
  return UNCATEGORIZED;
}

export function categories(): Category[] {
  return [...ROOT_CAUSES, UNCATEGORIZED];
}

// histogram counts tickets per category, always including every category so the
// UI can render a stable table.
export function histogram(ts: Ticket[]): Record<Category, number> {
  const h: Record<Category, number> = {
    "driver-update": 0,
    "port-naming": 0,
    timeout: 0,
    uncategorized: 0,
  };
  for (const t of ts) h[classify(t)]++;
  return h;
}

function weeksSpan(ts: Ticket[]): number {
  const seen = new Set<number>();
  for (const t of ts) seen.add(t.week);
  if (seen.size === 0) return 1;
  const weeks = [...seen].sort((a, b) => a - b);
  return weeks[weeks.length - 1] - weeks[0] + 1;
}

const WEEKS_PER_MONTH = 4.3;

export interface Summary {
  beforePerWeek: number;
  beforePerMonth: number;
  afterPerWeek: number;
  afterPerMonth: number;
  fixed: Category[];
}

// summarize computes the before/after picture. The before rate is the observed
// average tickets per week; the after rate keeps only tickets whose category is
// not fixed, modelling that a resolved root cause stops generating tickets.
export function summarize(ts: Ticket[], fixed: Category[]): Summary {
  const fixedSet = new Set(fixed);
  const weeks = weeksSpan(ts);
  let before = 0;
  let after = 0;
  for (const t of ts) {
    before++;
    if (!fixedSet.has(classify(t))) after++;
  }
  const beforePerWeek = before / weeks;
  const afterPerWeek = after / weeks;
  return {
    beforePerWeek,
    beforePerMonth: beforePerWeek * WEEKS_PER_MONTH,
    afterPerWeek,
    afterPerMonth: afterPerWeek * WEEKS_PER_MONTH,
    fixed,
  };
}

// seed returns the realistic four-week ticket set: 30 root-cause tickets plus
// two unrelated ones over four weeks = 32 total, i.e. exactly 8.0/week before.
// The unrelated residue (2 over 4 weeks) is what remains after the fixes,
// projecting to about two a month.
export function seed(): Ticket[] {
  const driver = [
    "Device shows as Unknown Device after Windows Update",
    "Monitor driver reverted to generic driver, code 28 in Device Manager",
    "Vendor driver v2.3.1 replaced overnight, bench offline",
  ];
  const port = [
    "Software cannot find /dev/ttyUSB0 after replug, wrong port order",
    "Calibrator on ttyUSB1 today, hardcoded path broke",
  ];
  const timeout = [
    "Anesthesia controller times out, no response within 500ms",
    "Intermittent timed out errors, device slow response",
  ];
  const extraDriver: Record<number, string> = {
    4: "Second bench lost its driver after the same Windows Update, code 28",
  };
  const extraTimeout: Record<number, string> = {
    2: "Controller gave up before response, timed out at 500ms again",
  };
  const unrelated: Record<number, string> = {
    1: "Bench keyboard sticky keys, please replace",
    3: "Monitor stand wobbly at workstation 4",
  };

  const ts: Ticket[] = [];
  let id = 1;
  const add = (week: number, summary: string) => {
    ts.push({ id: `T-${String(id).padStart(3, "0")}`, week, summary });
    id++;
  };

  for (let week = 1; week <= 4; week++) {
    for (const s of driver) add(week, s);
    for (const s of port) add(week, s);
    for (const s of timeout) add(week, s);
    if (extraDriver[week]) add(week, extraDriver[week]);
    if (extraTimeout[week]) add(week, extraTimeout[week]);
    if (unrelated[week]) add(week, unrelated[week]);
  }
  return ts;
}
