package main

import "testing"

func TestRunCommsBench(t *testing.T) {
	if err := runCommsBench([]string{"-n", "50"}); err != nil {
		t.Fatalf("comms-bench failed: %v", err)
	}
}

func TestRunGenUdevDefault(t *testing.T) {
	if err := runGenUdev(nil); err != nil {
		t.Fatalf("gen-udev failed: %v", err)
	}
}

func TestRunGenUdevInline(t *testing.T) {
	if err := runGenUdev([]string{"-map", "AH01T3XC:physio_monitor"}); err != nil {
		t.Fatalf("gen-udev inline failed: %v", err)
	}
}

func TestRunGenUdevRejectsDuplicate(t *testing.T) {
	if err := runGenUdev([]string{"-map", "S1:a,S2:a"}); err == nil {
		t.Fatal("expected duplicate name to be rejected")
	}
}

func TestRunTickets(t *testing.T) {
	if err := runTickets(nil); err != nil {
		t.Fatalf("tickets failed: %v", err)
	}
}

func TestParsePairs(t *testing.T) {
	m, err := parsePairs([]string{"# comment", "", "AH01T3XC:physio_monitor"})
	if err != nil {
		t.Fatal(err)
	}
	if len(m) != 1 || m[0].Serial != "AH01T3XC" || m[0].Name != "physio_monitor" {
		t.Fatalf("unexpected mappings: %v", m)
	}
	if _, err := parsePairs([]string{"nope"}); err == nil {
		t.Fatal("expected error for malformed pair")
	}
}
