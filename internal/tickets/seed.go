package tickets

import "fmt"

// Seed returns a realistic four-week ticket set for a bank of shared bench
// workstations. It averages exactly eight tickets per week, dominated by the
// three Story 3 root causes plus a small residue of unrelated tickets. Once all
// three causes are marked fixed, only the residue survives, projecting to about
// two tickets a month.
func Seed() []Ticket {
	// Thirty root-cause tickets plus two unrelated tickets over four weeks give
	// 32 total, i.e. exactly 8.0/week before. The unrelated residue alone (2
	// over 4 weeks, ~0.5/week, ~2.15/month) is what remains after the fixes.
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
	// A couple of extra root-cause tickets land the before rate on exactly
	// 8.0/week. They keep the three causes dominant and vary the per-week count.
	extraDriver := map[int]string{
		4: "Second bench lost its driver after the same Windows Update, code 28",
	}
	extraTimeout := map[int]string{
		2: "Controller gave up before response, timed out at 500ms again",
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
		if s, ok := extraDriver[week]; ok {
			add(week, s)
		}
		if s, ok := extraTimeout[week]; ok {
			add(week, s)
		}
		if s, ok := unrelated[week]; ok {
			add(week, s)
		}
	}
	return ts
}
