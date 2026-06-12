FROM golang:1.22-alpine AS build
WORKDIR /src
COPY go.mod ./
COPY . .
RUN CGO_ENABLED=0 go build -o /out/bench-reliability ./cmd/bench-reliability

FROM gcr.io/distroless/static-debian12
COPY --from=build /out/bench-reliability /bench-reliability
ENTRYPOINT ["/bench-reliability"]
CMD ["tickets"]
