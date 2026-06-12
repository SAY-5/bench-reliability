# bench-reliability

A reproducible model of how a bank of shared lab bench workstations was made
reliable. Several workstations were connected to serial peripherals
(physiological monitors, anesthesia controllers, dose calibrators), and three
recurring problems caused about eight support tickets a week. This toolkit
reproduces those three root causes and their fixes in code so the behaviour can
be measured and tested. It runs entirely without real hardware.

This is a model and teaching toolkit, not a hardware driver. The serial device
is simulated behind a seeded, deterministic latency model on an injectable
clock.

## The three root causes and their fixes

**1. Windows replaced the vendor driver.**
A Windows Update silently swapped the vendor driver (v2.3.1) for a generic one,
so the device appeared as an Unknown Device. The fix was to reinstall the correct
driver and lock it via Group Policy ("Do not include drivers with Windows
Updates"), then document it on one page so non-engineers could self-serve.

**2. Linux renamed the USB ports.**
Linux names USB serial adapters by plug order (`/dev/ttyUSB0`, `ttyUSB1`, ...),
so software with a hardcoded path could not find its device. The fix was udev
rules mapping each device's burned-in serial number to a permanent name. Read
the serial with:

```
udevadm info -a /dev/ttyUSB0 | grep serial
# ATTRS{serial}=="AH01T3XC"
```

and write a rule:

```
SUBSYSTEM=="tty", ATTRS{serial}=="AH01T3XC", SYMLINK+="physio_monitor"
```

**3. The comms timeout was too short.**
The timeout was 500 ms, but devices reply in 600 to 850 ms, so the client gave
up before the device answered. The fix was to measure 200 queries and set the
timeout to 2000 ms with retries (3 tries), so one slow reply is tolerated while
three consecutive failures still surface fast. It is deliberately not a huge
value like 30 s, because real failures should be detected quickly.

**Result:** with the three root causes removed, tickets fell from about eight a
week to about two a month.

## Install and run

Requires Go 1.22 or newer. Standard library only.

```
go build ./...
go test ./... -race
```

Or use the Makefile:

```
make build
make test
make demo
```

### comms-bench

Measures simulated response times and compares the old 500 ms timeout against
the 2000 ms + retry fix.

```
go run ./cmd/bench-reliability comms-bench
```

```
Bench comms measurement over 200 queries (device replies in 600 to 850 ms)

Measured response times (under the 2000ms policy):
  min     601 ms
  median  721 ms
  p95     831 ms
  max     845 ms

Reliability before vs after the fix:
  before  500ms timeout, 0 retries:    0.0% success (0/200)
  after  2000ms timeout, 2 retries:  100.0% success (200/200)
```

Flags: `-n` queries (default 200), `-seed`, `-retries`.

### gen-udev

Generates stable udev rules from a serial -> name mapping. With no input it uses
a sample mapping.

```
go run ./cmd/bench-reliability gen-udev
go run ./cmd/bench-reliability gen-udev -map AH01T3XC:physio_monitor,BK22Z9QP:anesthesia_controller
go run ./cmd/bench-reliability gen-udev -file serials.txt -out 99-lab.rules
```

```
SUBSYSTEM=="tty", ATTRS{serial}=="AH01T3XC", SYMLINK+="physio_monitor"
```

Duplicate serials or names and invalid symlink names are rejected.

### tickets

Shows the root-cause histogram and the before/after volume. With no input it
uses the seeded ticket set.

```
go run ./cmd/bench-reliability tickets
go run ./cmd/bench-reliability tickets -file tickets.tsv
```

```
Root-cause histogram over 30 tickets:

  driver-update  12  ############
  port-naming     8  ########
  timeout         8  ########
  uncategorized   2  ##

Ticket volume before vs after fixing all three root causes:
  before: 7.5 / week  (~32 / month)
  after:  0.5 / week  (~2 / month)
```

A tickets file is TSV, one `week<TAB>summary` per line.

## Docker

```
docker build -t bench-reliability .
docker run --rm bench-reliability comms-bench
```

## Project layout

See [ARCHITECTURE.md](ARCHITECTURE.md) for the package design and the virtual
clock used to keep tests fast and deterministic.

## License

MIT, see [LICENSE](LICENSE).
