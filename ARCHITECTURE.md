# Architecture

`bench-reliability` is a small, dependency-free Go toolkit that reproduces the
work of making shared lab bench workstations reliable. It models three recurring
root causes and their fixes so the behaviour can be demonstrated and tested
without any real hardware.

## Layout

```
cmd/bench-reliability/   CLI wiring (comms-bench, gen-udev, tickets)
internal/simdevice/      simulated serial device + injectable clock
internal/comms/          timeout/retry client and response-time measurement
internal/udevrules/      udevadm parsing and udev rules generation
internal/tickets/        ticket model, root-cause classifier, before/after view
```

Each `internal` package is self-contained and unit tested. The CLI is a thin
layer that parses flags and prints results; all logic lives in the packages.

## simdevice

`Device.Query` draws a deterministic, seeded latency in the 600 to 850 ms window
and waits that long on an injected `Clock` before returning a reply.

The `Clock` interface has two implementations:

- `RealClock` uses real timers.
- `VirtualClock` only advances when `Sleep` is called, so a 200-query benchmark
  runs in microseconds of wall time and is fully deterministic.

Timeouts are modelled in virtual time: `WithVirtualDeadline` stamps a context
with a virtual deadline, and a `Sleep` that would pass it stops at the deadline
and returns `ErrVirtualDeadline`, exactly as a real context deadline would fire
mid-wait.

## comms

`Client.Call` issues a request under a per-attempt timeout, retrying up to a
configured count. `Measure` runs N calls and reports min/median/p95/max latency
over the successful attempts plus the success rate. This is what shows the
500 ms timeout failing every query while 2000 ms with retries succeeds.

## udevrules

`ExtractSerials` pulls `ATTRS{serial}=="..."` values out of `udevadm info -a`
text. `Generate` turns a serial -> name mapping into a deterministic, sorted
rules file and rejects duplicate serials or names and invalid symlink names.

## tickets

`Classify` buckets a ticket into `driver-update`, `port-naming`, or `timeout`
using substring keyword rules (no code evaluation). `Summarize` projects the
observed per-week volume and the post-fix volume once each root cause is marked
fixed, reproducing the drop from about eight tickets a week to about two a month.

## Determinism

Every result is reproducible: the device latency sequence is seeded, virtual
time removes wall-clock variance, and the udev and ticket outputs are sorted or
fixed. This keeps `go test -race` stable and makes the CLI output suitable for
documentation.
