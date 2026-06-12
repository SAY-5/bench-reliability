package simdevice

import (
	"context"
	"errors"
	"sync"
	"time"
)

// ErrVirtualDeadline is returned by VirtualClock.Sleep when a sleep would
// advance virtual time past a deadline previously registered with
// WithVirtualDeadline. It stands in for a context timeout in virtual time.
var ErrVirtualDeadline = errors.New("simdevice: virtual deadline exceeded")

// VirtualClock is a Clock whose time only advances when Sleep is called. It
// lets tests run device queries with realistic latencies in zero wall-clock
// time and fully deterministically.
//
// To model a per-query timeout, callers register a virtual deadline with
// WithVirtualDeadline. A Sleep that would move past that deadline advances the
// clock only up to the deadline and returns ErrVirtualDeadline, mirroring how a
// real context deadline would fire mid-wait.
type VirtualClock struct {
	mu  sync.Mutex
	now time.Time
}

type deadlineKey struct{}

// NewVirtualClock returns a VirtualClock starting at the given time.
func NewVirtualClock(start time.Time) *VirtualClock {
	return &VirtualClock{now: start}
}

// Now reports the current virtual time.
func (c *VirtualClock) Now() time.Time {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.now
}

// WithVirtualDeadline returns a context carrying a virtual deadline at
// c.Now()+timeout. Sleep consults this deadline to decide whether a wait would
// time out. The returned context is also given a real deadline so that other
// context-aware code behaves consistently.
func (c *VirtualClock) WithVirtualDeadline(ctx context.Context, timeout time.Duration) (context.Context, context.CancelFunc) {
	dl := c.Now().Add(timeout)
	ctx = context.WithValue(ctx, deadlineKey{}, dl)
	return context.WithCancel(ctx)
}

// Sleep advances virtual time by d. If ctx carries a virtual deadline and the
// advance would pass it, the clock advances only to the deadline and the call
// returns ErrVirtualDeadline. A cancelled context returns ctx.Err().
func (c *VirtualClock) Sleep(ctx context.Context, d time.Duration) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	if d <= 0 {
		return nil
	}

	c.mu.Lock()
	defer c.mu.Unlock()

	target := c.now.Add(d)
	if dl, ok := ctx.Value(deadlineKey{}).(time.Time); ok && target.After(dl) {
		c.now = dl
		return ErrVirtualDeadline
	}
	c.now = target
	return nil
}
