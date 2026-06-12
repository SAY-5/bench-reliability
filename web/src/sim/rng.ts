// A small, seeded pseudo-random generator. The Go toolkit uses math/rand with a
// fixed seed so its latency sequence is deterministic and reproducible; this is
// the browser-side equivalent. We use a mulberry32 generator: tiny, fast, and
// well-distributed enough that the response-time histogram looks like the real
// one and every run with the same seed is identical.
export class Rng {
  private state: number;

  constructor(seed: number) {
    // Mix the seed so small seeds (1, 2, ...) still produce a healthy spread.
    this.state = (seed ^ 0x9e3779b9) >>> 0;
  }

  // next returns a float in [0, 1).
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // intn returns an integer in [0, n], matching Go's rng.Int63n(span+1) usage
  // where the upper bound is inclusive of the span.
  intn(nInclusive: number): number {
    if (nInclusive <= 0) return 0;
    return Math.floor(this.next() * (nInclusive + 1));
  }
}
