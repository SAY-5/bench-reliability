// Package simdevice models a serial-style lab peripheral whose replies arrive
// after a deterministic, seeded latency. A Clock is injected so callers can run
// virtual time in tests: queries complete instantly in wall-clock terms while
// the device reports realistic 600 to 850 ms response times.
package simdevice

import (
	"context"
	"time"
)

// Clock abstracts the passage of time so tests can advance a virtual clock
// instead of sleeping. The real implementation is RealClock; tests use
// VirtualClock for fast, deterministic runs.
type Clock interface {
	// Now reports the current time.
	Now() time.Time
	// Sleep blocks until d has elapsed on the clock, or until ctx is done.
	// It returns ctx.Err() if the context was cancelled first, else nil.
	Sleep(ctx context.Context, d time.Duration) error
}

// RealClock is a Clock backed by the wall clock and a real timer.
type RealClock struct{}

// Now reports the current wall-clock time.
func (RealClock) Now() time.Time { return time.Now() }

// Sleep waits for d using a real timer, honouring context cancellation.
func (RealClock) Sleep(ctx context.Context, d time.Duration) error {
	if d <= 0 {
		return ctx.Err()
	}
	t := time.NewTimer(d)
	defer t.Stop()
	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-t.C:
		return nil
	}
}
