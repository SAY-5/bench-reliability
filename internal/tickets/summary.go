package tickets

// weeksPerMonth is the conversion used to express ticket volume as a monthly
// figure (about 4.3 weeks per month).
const weeksPerMonth = 4.3

// Summary describes ticket volume before and after the three root causes are
// fixed, expressed both per week and per month.
type Summary struct {
	BeforePerWeek  float64
	BeforePerMonth float64
	AfterPerWeek   float64
	AfterPerMonth  float64
	// Fixed lists the categories marked resolved, removing their tickets from
	// the "after" projection.
	Fixed []Category
}

// Summarize computes the before/after picture. The "before" rate is the
// observed average tickets per week across the data set. The "after" rate keeps
// only tickets whose category is not in fixed, modelling that a resolved root
// cause stops generating tickets.
func Summarize(ts []Ticket, fixed []Category) Summary {
	fixedSet := make(map[Category]bool, len(fixed))
	for _, c := range fixed {
		fixedSet[c] = true
	}

	weeks := float64(weeksSpan(ts))
	var before, after int
	for _, t := range ts {
		before++
		if !fixedSet[Classify(t)] {
			after++
		}
	}

	beforePerWeek := float64(before) / weeks
	afterPerWeek := float64(after) / weeks
	return Summary{
		BeforePerWeek:  beforePerWeek,
		BeforePerMonth: beforePerWeek * weeksPerMonth,
		AfterPerWeek:   afterPerWeek,
		AfterPerMonth:  afterPerWeek * weeksPerMonth,
		Fixed:          fixed,
	}
}
