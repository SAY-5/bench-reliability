.PHONY: build test vet fmt demo clean

BIN := bench-reliability

build:
	go build -o $(BIN) ./cmd/bench-reliability

test:
	go test ./... -race

vet:
	go vet ./...

fmt:
	gofmt -w .

demo: build
	@echo "== comms-bench =="
	./$(BIN) comms-bench
	@echo
	@echo "== gen-udev =="
	./$(BIN) gen-udev
	@echo
	@echo "== tickets =="
	./$(BIN) tickets

clean:
	rm -f $(BIN)
