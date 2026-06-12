package main

import (
	"context"
	"flag"
	"fmt"
	"time"

	"github.com/SAY-5/bench-reliability/internal/comms"
	"github.com/SAY-5/bench-reliability/internal/simdevice"
)

var epoch = time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)

func runCommsBench(args []string) error {
	fs := flag.NewFlagSet("comms-bench", flag.ContinueOnError)
	n := fs.Int("n", 200, "number of queries to measure")
	seed := fs.Int64("seed", 1, "seed for the device latency model")
	retries := fs.Int("retries", 2, "retries for the fixed policy (extra attempts after the first)")
	if err := fs.Parse(args); err != nil {
		return err
	}

	// Each policy gets its own clock+device pair seeded identically so the two
	// measurements see the same latency sequence and the comparison is fair.
	measure := func(timeout time.Duration, retry int) comms.Stats {
		clk := simdevice.NewVirtualClock(epoch)
		dev := simdevice.New(clk, simdevice.Config{Name: "physio_monitor", Seed: *seed})
		c := comms.New(clk, dev, comms.Config{Timeout: timeout, Retries: retry})
		return c.Measure(context.Background(), *n, "READ?")
	}

	old := measure(500*time.Millisecond, 0)
	fixed := measure(2000*time.Millisecond, *retries)

	fmt.Printf("Bench comms measurement over %d queries (device replies in %d to %d ms)\n\n",
		*n, simdevice.DefaultMinLatency.Milliseconds(), simdevice.DefaultMaxLatency.Milliseconds())

	fmt.Println("Measured response times (under the 2000ms policy):")
	fmt.Printf("  min    %4d ms\n", fixed.Min.Milliseconds())
	fmt.Printf("  median %4d ms\n", fixed.Median.Milliseconds())
	fmt.Printf("  p95    %4d ms\n", fixed.P95.Milliseconds())
	fmt.Printf("  max    %4d ms\n\n", fixed.Max.Milliseconds())

	fmt.Println("Reliability before vs after the fix:")
	fmt.Printf("  before  500ms timeout, 0 retries: %6.1f%% success (%d/%d)\n",
		old.SuccessRate()*100, old.Successes, old.Queries)
	fmt.Printf("  after  2000ms timeout, %d retries: %6.1f%% success (%d/%d)\n",
		*retries, fixed.SuccessRate()*100, fixed.Successes, fixed.Queries)

	fmt.Println("\nRoot cause: the 500ms timeout sat below the 600 to 850 ms response window,")
	fmt.Println("so the client gave up before the device answered. Raising the timeout to")
	fmt.Println("2000ms with retries tolerates one slow reply while still failing fast on")
	fmt.Println("three consecutive misses.")
	return nil
}
