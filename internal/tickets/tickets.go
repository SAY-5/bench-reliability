// Package tickets models the support-ticket side of Story 3. Shared bench
// workstations generated roughly eight tickets a week, driven by three root
// causes: a Windows Update swapping a vendor driver for a generic one, Linux
// renaming USB ports by plug order, and a comms timeout shorter than device
// response times. A keyword classifier buckets each ticket into one of those
// causes, and a before/after summary shows the volume dropping to about two a
// month once every cause is marked fixed.
package tickets

import (
	"sort"
	"strings"
)

// Category is a root-cause bucket for a ticket.
type Category string

const (
	// DriverUpdate covers Windows Update replacing the vendor driver, so the
	// device shows up as an unknown device.
	DriverUpdate Category = "driver-update"
	// PortNaming covers Linux assigning /dev/ttyUSB names by plug order so
	// hardcoded paths break.
	PortNaming Category = "port-naming"
	// Timeout covers comms giving up before the device replies.
	Timeout Category = "timeout"
	// Uncategorized is used when no rule matches.
	Uncategorized Category = "uncategorized"
)

// RootCauses lists the three real root causes in a stable order.
var RootCauses = []Category{DriverUpdate, PortNaming, Timeout}

// Ticket is a single support request.
type Ticket struct {
	ID      string
	Week    int
	Summary string
}

// keywordRules maps a category to the lowercase keywords that imply it. The
// first matching category in RootCauses order wins, keeping classification
// deterministic. No user text is ever evaluated; only substring checks run.
var keywordRules = map[Category][]string{
	DriverUpdate: {
		"driver", "windows update", "unknown device", "code 28",
		"device manager", "generic driver", "v2.3.1",
	},
	PortNaming: {
		"ttyusb", "port order", "plug order", "wrong port",
		"/dev/tty", "symlink", "device path", "renamed",
	},
	Timeout: {
		"timeout", "timed out", "no response", "slow response",
		"gave up", "500ms", "response time",
	},
}

// Classify buckets a ticket by scanning its summary for known keywords.
func Classify(t Ticket) Category {
	s := strings.ToLower(t.Summary)
	for _, cat := range RootCauses {
		for _, kw := range keywordRules[cat] {
			if strings.Contains(s, kw) {
				return cat
			}
		}
	}
	return Uncategorized
}

// Histogram counts tickets per category. The map always contains every entry in
// RootCauses plus Uncategorized so callers can render a stable table.
func Histogram(ts []Ticket) map[Category]int {
	h := map[Category]int{
		DriverUpdate:  0,
		PortNaming:    0,
		Timeout:       0,
		Uncategorized: 0,
	}
	for _, t := range ts {
		h[Classify(t)]++
	}
	return h
}

// Categories returns the histogram keys in display order.
func Categories() []Category {
	out := append([]Category{}, RootCauses...)
	return append(out, Uncategorized)
}

// weeksSpan returns the number of distinct weeks present in the ticket set, or
// 1 if none, so per-week math never divides by zero.
func weeksSpan(ts []Ticket) int {
	seen := map[int]bool{}
	for _, t := range ts {
		seen[t.Week] = true
	}
	if len(seen) == 0 {
		return 1
	}
	weeks := make([]int, 0, len(seen))
	for w := range seen {
		weeks = append(weeks, w)
	}
	sort.Ints(weeks)
	return weeks[len(weeks)-1] - weeks[0] + 1
}
