// Port of internal/udevrules. Linux names USB serial adapters by plug order
// (/dev/ttyUSB0, ttyUSB1, ...), so software with a hardcoded path cannot find
// its device. The fix maps each device's burned-in serial number to a permanent
// symlink via a udev rule, for example:
//
//   SUBSYSTEM=="tty", ATTRS{serial}=="AH01T3XC", SYMLINK+="physio_monitor"

const SERIAL_LINE = /ATTRS\{serial\}=="([^"]+)"/g;
const NAME_PATTERN = /^[A-Za-z0-9_]+$/;

// extractSerials returns every serial found in udevadm-style text, in order of
// appearance with duplicates removed (real `udevadm info -a` repeats the serial
// on several parent stanzas).
export function extractSerials(udevadm: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const m of udevadm.matchAll(SERIAL_LINE)) {
    const s = m[1];
    if (!seen.has(s)) {
      seen.add(s);
      out.push(s);
    }
  }
  return out;
}

export interface Mapping {
  serial: string;
  name: string;
}

export interface GenerateResult {
  rules: string;
  error?: string;
}

// generate builds a udev rules file from the given mappings. Output is sorted by
// symlink name so the file is deterministic regardless of input order. It
// rejects empty fields, invalid names, and duplicate serials or names.
export function generate(mappings: Mapping[]): GenerateResult {
  const bySerial = new Map<string, string>();
  const byName = new Map<string, string>();
  for (const m of mappings) {
    const serial = m.serial.trim();
    const name = m.name.trim();
    if (serial === "")
      return { rules: "", error: `empty serial for name "${name}"` };
    if (name === "")
      return { rules: "", error: `empty name for serial "${serial}"` };
    if (!NAME_PATTERN.test(name))
      return {
        rules: "",
        error: `invalid symlink name "${name}" (use only letters, digits, underscore)`,
      };
    const prevName = bySerial.get(serial);
    if (prevName !== undefined)
      return {
        rules: "",
        error: `duplicate serial "${serial}" maps to both "${prevName}" and "${name}"`,
      };
    const prevSerial = byName.get(name);
    if (prevSerial !== undefined)
      return {
        rules: "",
        error: `duplicate name "${name}" maps to both "${prevSerial}" and "${serial}"`,
      };
    bySerial.set(serial, name);
    byName.set(name, serial);
  }

  const names = [...byName.keys()].sort();
  const lines: string[] = [
    "# Managed by bench-reliability: stable names for lab serial devices.",
    "# Each rule maps a burned-in serial number to a permanent /dev symlink.",
  ];
  for (const name of names) {
    const serial = byName.get(name)!;
    lines.push(
      `SUBSYSTEM=="tty", ATTRS{serial}=="${serial}", SYMLINK+="${name}"`,
    );
  }
  return { rules: lines.join("\n") + "\n" };
}

// ruleLine renders a single rule line for one mapping, used by the UI to show
// the rule beside each device.
export function ruleLine(serial: string, name: string): string {
  return `SUBSYSTEM=="tty", ATTRS{serial}=="${serial}", SYMLINK+="${name}"`;
}
