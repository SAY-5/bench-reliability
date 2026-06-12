package main

import (
	"flag"
	"fmt"
	"os"
	"strings"

	"github.com/SAY-5/bench-reliability/internal/udevrules"
)

func runGenUdev(args []string) error {
	fs := flag.NewFlagSet("gen-udev", flag.ContinueOnError)
	mapFlag := fs.String("map", "", "inline serial:name pairs, comma separated (e.g. AH01T3XC:physio_monitor,BK22Z9QP:anesthesia)")
	file := fs.String("file", "", "read serial:name pairs from a file, one per line (# comments allowed)")
	out := fs.String("out", "", "write rules to this file instead of stdout")
	if err := fs.Parse(args); err != nil {
		return err
	}

	var raw []string
	switch {
	case *file != "":
		b, err := os.ReadFile(*file)
		if err != nil {
			return err
		}
		raw = strings.Split(string(b), "\n")
	case *mapFlag != "":
		raw = strings.Split(*mapFlag, ",")
	default:
		// Default sample mapping so the subcommand is useful with no input.
		raw = []string{
			"AH01T3XC:physio_monitor",
			"BK22Z9QP:anesthesia_controller",
			"CM47W1LD:dose_calibrator",
		}
	}

	mappings, err := parsePairs(raw)
	if err != nil {
		return err
	}

	rules, err := udevrules.Generate(mappings)
	if err != nil {
		return err
	}

	if *out != "" {
		if err := os.WriteFile(*out, []byte(rules), 0o644); err != nil {
			return err
		}
		fmt.Fprintf(os.Stderr, "wrote %d rule(s) to %s\n", len(mappings), *out)
		return nil
	}
	fmt.Print(rules)
	return nil
}

// parsePairs turns "serial:name" lines into mappings, skipping blanks and
// comment lines.
func parsePairs(lines []string) ([]udevrules.Mapping, error) {
	var out []udevrules.Mapping
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		serial, name, ok := strings.Cut(line, ":")
		if !ok {
			return nil, fmt.Errorf("invalid pair %q, want serial:name", line)
		}
		out = append(out, udevrules.Mapping{
			Serial: strings.TrimSpace(serial),
			Name:   strings.TrimSpace(name),
		})
	}
	if len(out) == 0 {
		return nil, fmt.Errorf("no serial:name pairs provided")
	}
	return out, nil
}
