package comms

import (
	"context"
	"testing"
	"time"

	"github.com/SAY-5/bench-reliability/internal/simdevice"
)

var epoch = time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)

func newPair(seed int64, cfg Config) *Client {
	clk := simdevice.NewVirtualClock(epoch)
	dev := simdevice.New(clk, simdevice.Config{Name: "physio_monitor", Seed: seed})
	return New(clk, dev, cfg)
}

// At a 500 ms timeout with no retries, every query fails because the device
// never replies in under 600 ms.
func TestShortTimeoutFails(t *testing.T) {
	c := newPair(1, Config{Timeout: 500 * time.Millisecond, Retries: 0})
	st := c.Measure(context.Background(), 200, "READ?")
	if st.Successes != 0 {
		t.Fatalf("expected 0 successes at 500ms timeout, got %d/%d", st.Successes, st.Queries)
	}
	if st.SuccessRate() != 0 {
		t.Fatalf("expected 0%% success rate, got %.2f", st.SuccessRate())
	}
}

// Measuring 200 queries with a generous timeout yields latencies inside the
// device's 600 to 850 ms window.
func TestMeasureWindow(t *testing.T) {
	c := newPair(2, Config{Timeout: 2 * time.Second, Retries: 0})
	st := c.Measure(context.Background(), 200, "READ?")
	if st.Successes != 200 {
		t.Fatalf("expected all 200 to succeed, got %d", st.Successes)
	}
	if st.Min < 600*time.Millisecond {
		t.Fatalf("min %v below 600ms", st.Min)
	}
	if st.Max > 850*time.Millisecond {
		t.Fatalf("max %v above 850ms", st.Max)
	}
	if st.Median < st.Min || st.Median > st.Max {
		t.Fatalf("median %v outside [%v,%v]", st.Median, st.Min, st.Max)
	}
	if st.P95 < st.Median || st.P95 > st.Max {
		t.Fatalf("p95 %v outside [median,max]", st.P95)
	}
}

// With a 2000 ms timeout and 3 tries, success is effectively 100 percent
// because a single slow reply never exceeds the timeout.
func TestTimeoutWithRetrySucceeds(t *testing.T) {
	c := newPair(3, Config{Timeout: 2 * time.Second, Retries: 2})
	st := c.Measure(context.Background(), 200, "READ?")
	if st.SuccessRate() != 1.0 {
		t.Fatalf("expected 100%% success, got %.4f (%d/%d)", st.SuccessRate(), st.Successes, st.Queries)
	}
}

// A single Call under the short timeout makes exactly Retries+1 attempts and
// fails, proving three consecutive failures still surface.
func TestRetriesExhaust(t *testing.T) {
	c := newPair(5, Config{Timeout: 500 * time.Millisecond, Retries: 2})
	r := c.Call(context.Background(), "READ?")
	if r.Err == nil {
		t.Fatalf("expected failure under 500ms timeout")
	}
	if len(r.Attempts) != 3 {
		t.Fatalf("expected 3 attempts, got %d", len(r.Attempts))
	}
}

func TestPercentile(t *testing.T) {
	in := []time.Duration{10, 20, 30, 40, 50, 60, 70, 80, 90, 100}
	if got := percentile(in, 0.50); got != 50 {
		t.Fatalf("median = %v, want 50", got)
	}
	if got := percentile(in, 0.95); got != 100 {
		t.Fatalf("p95 = %v, want 100", got)
	}
	if got := percentile(in, 0); got != 10 {
		t.Fatalf("p0 = %v, want 10", got)
	}
}
