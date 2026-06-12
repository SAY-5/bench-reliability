// Package comms models the communication layer between a shared lab
// workstation and a serial peripheral. It exposes a client with a configurable
// per-attempt timeout and a retry count, and a Measure helper that runs many
// queries to characterise response times and success rate.
//
// Story 3 root cause: the timeout was set to 500 ms while devices answer in 600
// to 850 ms, so the client gave up too early. The fix raises the timeout to
// 2000 ms and adds retries, so a single slow reply is tolerated while three
// consecutive failures still surface quickly.
package comms

import (
	"context"
	"sort"
	"time"

	"github.com/SAY-5/bench-reliability/internal/simdevice"
)

// Config sets the communication policy.
type Config struct {
	// Timeout bounds a single attempt.
	Timeout time.Duration
	// Retries is the number of extra attempts after the first. Retries == 0
	// means a single attempt; Retries == 2 means up to three attempts total.
	Retries int
}

// Client talks to a simdevice.Device under a timeout-and-retry policy, driven
// by an injected clock so it can run on virtual time in tests.
type Client struct {
	clock *simdevice.VirtualClock
	dev   *simdevice.Device
	cfg   Config
}

// New builds a Client. The clock must be the same VirtualClock the device was
// built with so virtual time stays consistent across timeouts.
func New(clock *simdevice.VirtualClock, dev *simdevice.Device, cfg Config) *Client {
	if cfg.Timeout <= 0 {
		cfg.Timeout = 2 * time.Second
	}
	if cfg.Retries < 0 {
		cfg.Retries = 0
	}
	return &Client{clock: clock, dev: dev, cfg: cfg}
}

// Attempt records the outcome of one try.
type Attempt struct {
	Latency time.Duration
	Err     error
}

// CallResult is the outcome of a Call, including every attempt made.
type CallResult struct {
	Reply    string
	Attempts []Attempt
	// Latency is the latency of the successful attempt. It is only meaningful
	// when Err is nil.
	Latency time.Duration
	Err     error
}

// Call issues req, retrying on timeout up to the configured retry count. It
// returns once an attempt succeeds or all attempts are exhausted.
func (c *Client) Call(ctx context.Context, req string) CallResult {
	res := CallResult{}
	tries := c.cfg.Retries + 1
	for i := 0; i < tries; i++ {
		actx, cancel := c.clock.WithVirtualDeadline(ctx, c.cfg.Timeout)
		reply, latency, err := c.dev.Query(actx, req)
		cancel()
		res.Attempts = append(res.Attempts, Attempt{Latency: latency, Err: err})
		if err == nil {
			res.Reply = reply
			res.Latency = latency
			return res
		}
		res.Err = err
	}
	return res
}

// Stats summarises a run of queries.
type Stats struct {
	// Queries is the number of logical Call invocations measured.
	Queries int
	// Successes is how many Calls eventually succeeded.
	Successes int
	// Min, Median, P95 and Max describe the latency of successful attempts.
	Min    time.Duration
	Median time.Duration
	P95    time.Duration
	Max    time.Duration
}

// SuccessRate returns the fraction of successful calls in [0,1].
func (s Stats) SuccessRate() float64 {
	if s.Queries == 0 {
		return 0
	}
	return float64(s.Successes) / float64(s.Queries)
}

// Measure runs n Calls and reports latency statistics over the successful
// attempts plus the overall success rate. It is a pure measurement: no code is
// evaluated, only the simulated device is queried.
func (c *Client) Measure(ctx context.Context, n int, req string) Stats {
	var st Stats
	st.Queries = n
	latencies := make([]time.Duration, 0, n)
	for i := 0; i < n; i++ {
		r := c.Call(ctx, req)
		if r.Err == nil {
			st.Successes++
			latencies = append(latencies, r.Latency)
		}
	}
	if len(latencies) == 0 {
		return st
	}
	sort.Slice(latencies, func(i, j int) bool { return latencies[i] < latencies[j] })
	st.Min = latencies[0]
	st.Max = latencies[len(latencies)-1]
	st.Median = percentile(latencies, 0.50)
	st.P95 = percentile(latencies, 0.95)
	return st
}

// percentile returns the p-quantile (0..1) of a sorted slice using the
// nearest-rank method.
func percentile(sorted []time.Duration, p float64) time.Duration {
	if len(sorted) == 0 {
		return 0
	}
	if p <= 0 {
		return sorted[0]
	}
	if p >= 1 {
		return sorted[len(sorted)-1]
	}
	rank := int(p*float64(len(sorted)) + 0.5)
	if rank < 1 {
		rank = 1
	}
	if rank > len(sorted) {
		rank = len(sorted)
	}
	return sorted[rank-1]
}
