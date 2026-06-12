package tickets

import "fmt"

// Seed returns a realistic four-week ticket set for a bank of shared bench
// workstations. It averages about eight tickets per week, dominated by the
// three Story 3 root causes plus a small residue of unrelated tickets. Once all
// three causes are marked fixed, the residue projects to roughly two tickets a
// month.
func Seed() []Ticket {
	// Per week: 3 driver-update, 2 port-naming, 2 timeout, ~0.5 unrelated.
	// Over four weeks that is 8/week before, and the unrelated residue alone
	// after the fixes (2 over 4 weeks ~= 2.15/month).
	driver := []string{
		"Device shows as Unknown Device after Windows Update",
		"Monitor driver reverted to generic driver, code 28 in Device Manager",
		"Vendor driver v2.3.1 replaced overnight, bench offline",
	}
	port := []string{
		"Software cannot find /dev/ttyUSB0 after replug, wrong port order",
		"Calibrator on ttyUSB1 today, hardcoded path broke",
	}
	timeout := []string{
		"Anesthesia controller times out, no response within 500ms",
		"Intermittent timed out errors, device slow response",
	}
	// Sparse unrelated tickets: one in week 1, one in week 3.
	unrelated := map[int]string{
		1: "Bench keyboard sticky keys, please replace",
		3: "Monitor stand wobbly at workstation 4",
	}

	var ts []Ticket
	id := 1
	add := func(week int, summary string) {
		ts = append(ts, Ticket{ID: fmt.Sprintf("T-%03d", id), Week: week, Summary: summary})
		id++
	}

	for week := 1; week <= 4; week++ {
		for _, s := range driver {
			add(week, s)
		}
		for _, s := range port {
			add(week, s)
		}
		for _, s := range timeout {
			add(week, s)
		}
		if s, ok := unrelated[week]; ok {
			add(week, s)
		}
	}
	return ts
}
