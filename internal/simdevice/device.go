package simdevice

import (
	"context"
	"fmt"
	"math/rand"
	"time"
)

// Default latency window for the simulated peripheral. Real bench devices in
// the lab replied within this range; the comms timeout of 500 ms sat below the
// upper bound, which is what caused spurious failures.
const (
	DefaultMinLatency = 600 * time.Millisecond
	DefaultMaxLatency = 850 * time.Millisecond
)

// Device is a simulated serial line peripheral (physiological monitor,
// anesthesia controller, dose calibrator, ...). Each Query takes a seeded,
// deterministic amount of virtual time within [MinLatency, MaxLatency] before a
// reply is available. If the supplied context times out first, Query reports
// the timeout instead of a reply.
type Device struct {
	clock      Clock
	rng        *rand.Rand
	minLatency time.Duration
	maxLatency time.Duration
	name       string
}

// Config configures a Device. Zero values fall back to sensible defaults.
type Config struct {
	// Name labels the device in replies, e.g. "physio_monitor".
	Name string
	// Seed makes the latency sequence deterministic.
	Seed int64
	// MinLatency and MaxLatency bound the simulated response time.
	MinLatency time.Duration
	MaxLatency time.Duration
}

// New builds a Device driven by the given clock and config. The clock is
// injected so tests can run on virtual time.
func New(clock Clock, cfg Config) *Device {
	min := cfg.MinLatency
	if min <= 0 {
		min = DefaultMinLatency
	}
	max := cfg.MaxLatency
	if max < min {
		max = DefaultMaxLatency
		if max < min {
			max = min
		}
	}
	name := cfg.Name
	if name == "" {
		name = "sim_device"
	}
	return &Device{
		clock:      clock,
		rng:        rand.New(rand.NewSource(cfg.Seed)),
		minLatency: min,
		maxLatency: max,
		name:       name,
	}
}

// nextLatency draws the next deterministic latency in [min, max].
func (d *Device) nextLatency() time.Duration {
	span := d.maxLatency - d.minLatency
	if span <= 0 {
		return d.minLatency
	}
	return d.minLatency + time.Duration(d.rng.Int63n(int64(span)+1))
}

// Query sends req to the device and waits for the reply. It returns the reply
// string and the latency the device took. If the context deadline fires before
// the reply is ready, it returns a non-nil error and the elapsed latency up to
// the timeout.
func (d *Device) Query(ctx context.Context, req string) (string, time.Duration, error) {
	latency := d.nextLatency()
	start := d.clock.Now()
	if err := d.clock.Sleep(ctx, latency); err != nil {
		return "", d.clock.Now().Sub(start), fmt.Errorf("query %q to %s: %w", req, d.name, err)
	}
	reply := fmt.Sprintf("%s:ack:%s", d.name, req)
	return reply, latency, nil
}
