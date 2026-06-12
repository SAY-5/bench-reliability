package tickets

import (
	"math"
	"testing"
)

func TestClassify(t *testing.T) {
	cases := []struct {
		summary string
		want    Category
	}{
		{"Device shows as Unknown Device after Windows Update", DriverUpdate},
		{"driver v2.3.1 replaced by generic driver", DriverUpdate},
		{"cannot find /dev/ttyUSB0 after replug", PortNaming},
		{"wrong port order broke the script", PortNaming},
		{"controller timed out, no response within 500ms", Timeout},
		{"sticky keyboard keys", Uncategorized},
	}
	for _, c := range cases {
		if got := Classify(Ticket{Summary: c.summary}); got != c.want {
			t.Errorf("Classify(%q) = %q, want %q", c.summary, got, c.want)
		}
	}
}

func TestHistogramAlwaysHasAllCategories(t *testing.T) {
	h := Histogram(nil)
	for _, c := range Categories() {
		if _, ok := h[c]; !ok {
			t.Errorf("histogram missing category %q", c)
		}
	}
}

func TestSeedHistogram(t *testing.T) {
	h := Histogram(Seed())
	if h[Uncategorized] != 2 {
		t.Fatalf("expected 2 unrelated tickets, got %d", h[Uncategorized])
	}
	for _, c := range RootCauses {
		if h[c] == 0 {
			t.Fatalf("root cause %q has no tickets in seed", c)
		}
	}
	total := 0
	for _, c := range Categories() {
		total += h[c]
	}
	if total != 32 {
		t.Fatalf("expected 32 seed tickets, got %d", total)
	}
	// The three root causes must dominate the residue.
	root := h[DriverUpdate] + h[PortNaming] + h[Timeout]
	if root != 30 {
		t.Fatalf("expected 30 root-cause tickets, got %d", root)
	}
}

// Before the fixes the bench produces exactly 8 tickets a week; after all three
// root causes are fixed it falls to about 2 a month.
func TestBeforeAfterSummary(t *testing.T) {
	s := Summarize(Seed(), RootCauses)

	if math.Abs(s.BeforePerWeek-8.0) > 1e-9 {
		t.Fatalf("before/week = %.4f, want 8.0", s.BeforePerWeek)
	}
	if math.Round(s.AfterPerMonth) != 2 {
		t.Fatalf("after/month = %.2f, want to round to 2", s.AfterPerMonth)
	}
	if s.AfterPerWeek >= s.BeforePerWeek {
		t.Fatalf("after rate %.2f not below before rate %.2f", s.AfterPerWeek, s.BeforePerWeek)
	}
}

func TestSummaryNoFixesUnchanged(t *testing.T) {
	s := Summarize(Seed(), nil)
	if math.Abs(s.AfterPerWeek-s.BeforePerWeek) > 1e-9 {
		t.Fatalf("with no fixes, after %.4f should equal before %.4f", s.AfterPerWeek, s.BeforePerWeek)
	}
}
