// Command bench-reliability is a reproducible toolkit that models Story 3: the
// work of making shared lab bench workstations reliable by removing three
// recurring root causes. It runs entirely without real hardware.
//
// Subcommands:
//
//	comms-bench  measure simulated device response times and compare the old
//	             500 ms timeout against the 2000 ms + retry fix
//	gen-udev     generate stable udev rules mapping serials to symlink names
//	tickets      show the root-cause histogram and the 8/week -> 2/month change
package main

import (
	"fmt"
	"os"
)

func main() {
	if len(os.Args) < 2 {
		usage()
		os.Exit(2)
	}
	var err error
	switch os.Args[1] {
	case "comms-bench":
		err = runCommsBench(os.Args[2:])
	case "gen-udev":
		err = runGenUdev(os.Args[2:])
	case "tickets":
		err = runTickets(os.Args[2:])
	case "-h", "--help", "help":
		usage()
		return
	default:
		fmt.Fprintf(os.Stderr, "unknown subcommand %q\n\n", os.Args[1])
		usage()
		os.Exit(2)
	}
	if err != nil {
		fmt.Fprintln(os.Stderr, "error:", err)
		os.Exit(1)
	}
}

func usage() {
	fmt.Fprint(os.Stderr, `bench-reliability: reproducible model of shared lab bench reliability work.

Usage:
  bench-reliability comms-bench [flags]   measure response times, 500ms vs 2000ms+retry
  bench-reliability gen-udev   [flags]    generate udev rules from serials
  bench-reliability tickets    [flags]    root-cause histogram and before/after volume

Run "bench-reliability <subcommand> -h" for subcommand flags.
`)
}
