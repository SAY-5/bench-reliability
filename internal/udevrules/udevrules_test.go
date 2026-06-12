package udevrules

import (
	"strings"
	"testing"
)

// sampleDump mimics a real `udevadm info -a /dev/ttyUSB0` walk, where the same
// serial appears on several parent stanzas.
const sampleDump = `
looking at device '/devices/pci0000:00/0000:00:14.0/usb1/1-3/1-3:1.0/ttyUSB0/tty/ttyUSB0':
    KERNEL=="ttyUSB0"
    SUBSYSTEM=="tty"
    DRIVER==""

looking at parent device '/devices/pci0000:00/0000:00:14.0/usb1/1-3':
    KERNELS=="1-3"
    SUBSYSTEMS=="usb"
    ATTRS{idVendor}=="0403"
    ATTRS{idProduct}=="6001"
    ATTRS{serial}=="AH01T3XC"
    ATTRS{manufacturer}=="FTDI"

looking at parent device '/devices/pci0000:00/0000:00:14.0/usb1':
    ATTRS{serial}=="AH01T3XC"
`

func TestExtractSerials(t *testing.T) {
	got := ExtractSerials(sampleDump)
	if len(got) != 1 || got[0] != "AH01T3XC" {
		t.Fatalf("ExtractSerials = %v, want [AH01T3XC]", got)
	}
}

func TestExtractSerialsMultiple(t *testing.T) {
	dump := `ATTRS{serial}=="AH01T3XC"
ATTRS{serial}=="BK22Z9QP"
ATTRS{serial}=="AH01T3XC"`
	got := ExtractSerials(dump)
	if len(got) != 2 {
		t.Fatalf("want 2 unique serials, got %v", got)
	}
	if got[0] != "AH01T3XC" || got[1] != "BK22Z9QP" {
		t.Fatalf("unexpected order/values: %v", got)
	}
}

func TestGenerateRuleLine(t *testing.T) {
	out, err := Generate([]Mapping{{Serial: "AH01T3XC", Name: "physio_monitor"}})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	const want = `SUBSYSTEM=="tty", ATTRS{serial}=="AH01T3XC", SYMLINK+="physio_monitor"`
	if !strings.Contains(out, want) {
		t.Fatalf("output missing rule line.\nwant: %s\ngot:\n%s", want, out)
	}
}

func TestGenerateDeterministicOrder(t *testing.T) {
	a, err := Generate([]Mapping{
		{Serial: "S2", Name: "zeta"},
		{Serial: "S1", Name: "alpha"},
	})
	if err != nil {
		t.Fatal(err)
	}
	b, err := Generate([]Mapping{
		{Serial: "S1", Name: "alpha"},
		{Serial: "S2", Name: "zeta"},
	})
	if err != nil {
		t.Fatal(err)
	}
	if a != b {
		t.Fatalf("output not deterministic:\n%s\n---\n%s", a, b)
	}
	if strings.Index(a, "alpha") > strings.Index(a, "zeta") {
		t.Fatalf("rules not sorted by name:\n%s", a)
	}
}

func TestGenerateRejectsDuplicateName(t *testing.T) {
	_, err := Generate([]Mapping{
		{Serial: "S1", Name: "monitor"},
		{Serial: "S2", Name: "monitor"},
	})
	if err == nil {
		t.Fatal("expected duplicate-name error")
	}
}

func TestGenerateRejectsDuplicateSerial(t *testing.T) {
	_, err := Generate([]Mapping{
		{Serial: "S1", Name: "a"},
		{Serial: "S1", Name: "b"},
	})
	if err == nil {
		t.Fatal("expected duplicate-serial error")
	}
}

func TestGenerateRejectsBadName(t *testing.T) {
	_, err := Generate([]Mapping{{Serial: "S1", Name: "bad name!"}})
	if err == nil {
		t.Fatal("expected invalid-name error")
	}
}

func TestGenerateRejectsEmpty(t *testing.T) {
	if _, err := Generate([]Mapping{{Serial: "", Name: "x"}}); err == nil {
		t.Fatal("expected empty-serial error")
	}
	if _, err := Generate([]Mapping{{Serial: "S1", Name: ""}}); err == nil {
		t.Fatal("expected empty-name error")
	}
}
