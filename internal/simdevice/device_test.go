package simdevice

import (
	"context"
	"errors"
	"testing"
	"time"
)

var epoch = time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)

func TestQueryLatencyWithinWindow(t *testing.T) {
	clk := NewVirtualClock(epoch)
	dev := New(clk, Config{Name: "physio_monitor", Seed: 1})

	for i := 0; i < 500; i++ {
		ctx, cancel := clk.WithVirtualDeadline(context.Background(), 2*time.Second)
		reply, latency, err := dev.Query(ctx, "READ?")
		cancel()
		if err != nil {
			t.Fatalf("query %d failed unexpectedly: %v", i, err)
		}
		if latency < DefaultMinLatency || latency > DefaultMaxLatency {
			t.Fatalf("query %d latency %v outside [%v,%v]", i, latency, DefaultMinLatency, DefaultMaxLatency)
		}
		if reply != "physio_monitor:ack:READ?" {
			t.Fatalf("query %d unexpected reply %q", i, reply)
		}
	}
}

func TestQueryTimesOutBelowLatency(t *testing.T) {
	clk := NewVirtualClock(epoch)
	dev := New(clk, Config{Name: "dose_calibrator", Seed: 7})

	// 500 ms timeout is below the 600 ms floor, so every query must time out.
	for i := 0; i < 50; i++ {
		ctx, cancel := clk.WithVirtualDeadline(context.Background(), 500*time.Millisecond)
		_, _, err := dev.Query(ctx, "READ?")
		cancel()
		if err == nil {
			t.Fatalf("query %d should have timed out at 500ms", i)
		}
		if !errors.Is(err, ErrVirtualDeadline) {
			t.Fatalf("query %d expected virtual deadline error, got %v", i, err)
		}
	}
}

func TestDeterministicSequence(t *testing.T) {
	latencies := func() []time.Duration {
		clk := NewVirtualClock(epoch)
		dev := New(clk, Config{Seed: 42})
		out := make([]time.Duration, 20)
		for i := range out {
			ctx, cancel := clk.WithVirtualDeadline(context.Background(), 2*time.Second)
			_, lat, err := dev.Query(ctx, "PING")
			cancel()
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			out[i] = lat
		}
		return out
	}

	a, b := latencies(), latencies()
	for i := range a {
		if a[i] != b[i] {
			t.Fatalf("non-deterministic at %d: %v vs %v", i, a[i], b[i])
		}
	}
}

func TestVirtualClockAdvances(t *testing.T) {
	clk := NewVirtualClock(epoch)
	dev := New(clk, Config{Seed: 3})
	ctx, cancel := clk.WithVirtualDeadline(context.Background(), 2*time.Second)
	defer cancel()
	_, lat, err := dev.Query(ctx, "READ?")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got := clk.Now().Sub(epoch); got != lat {
		t.Fatalf("clock advanced by %v, want %v", got, lat)
	}
}
