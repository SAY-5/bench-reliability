package main

import (
	"bufio"
	"flag"
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/SAY-5/bench-reliability/internal/tickets"
)

func runTickets(args []string) error {
	fs := flag.NewFlagSet("tickets", flag.ContinueOnError)
	file := fs.String("file", "", "read tickets from a TSV file (week<TAB>summary per line); default uses the seed set")
	if err := fs.Parse(args); err != nil {
		return err
	}

	var ts []tickets.Ticket
	if *file != "" {
		loaded, err := loadTickets(*file)
		if err != nil {
			return err
		}
		ts = loaded
	} else {
		ts = tickets.Seed()
	}

	hist := tickets.Histogram(ts)
	fmt.Printf("Root-cause histogram over %d tickets:\n\n", len(ts))
	for _, c := range tickets.Categories() {
		fmt.Printf("  %-14s %2d  %s\n", c, hist[c], bar(hist[c]))
	}

	summary := tickets.Summarize(ts, tickets.RootCauses)
	fmt.Println("\nTicket volume before vs after fixing all three root causes:")
	fmt.Printf("  Ticket volume: about %.0f per week  ->  about %.0f per month\n", summary.BeforePerWeek, summary.AfterPerMonth)
	fmt.Printf("  before: %.1f / week    after: %.0f / month (the unrelated residue once the three root causes are fixed)\n", summary.BeforePerWeek, summary.AfterPerMonth)
	fmt.Println("\nFixing the Windows driver lock, the Linux udev names, and the comms timeout")
	fmt.Println("removed the three root causes, so the recurring tickets stopped.")
	return nil
}

// bar renders a small text histogram bar.
func bar(n int) string {
	return strings.Repeat("#", n)
}

// loadTickets parses a TSV file of "week<TAB>summary" lines.
func loadTickets(path string) ([]tickets.Ticket, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	var out []tickets.Ticket
	sc := bufio.NewScanner(f)
	id := 1
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		week, summary, ok := strings.Cut(line, "\t")
		if !ok {
			return nil, fmt.Errorf("invalid line %q, want week<TAB>summary", line)
		}
		w, err := strconv.Atoi(strings.TrimSpace(week))
		if err != nil {
			return nil, fmt.Errorf("invalid week in %q: %w", line, err)
		}
		out = append(out, tickets.Ticket{
			ID:      fmt.Sprintf("T-%03d", id),
			Week:    w,
			Summary: strings.TrimSpace(summary),
		})
		id++
	}
	if err := sc.Err(); err != nil {
		return nil, err
	}
	if len(out) == 0 {
		return nil, fmt.Errorf("no tickets found in %s", path)
	}
	return out, nil
}
