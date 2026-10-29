// Sliding-window rate limiter — addresses VAL-01.
// Why sliding window, not fixed window: a fixed window allows 2x the
// limit in a burst straddling a boundary (e.g. 10 at 23:59:59 + 10 at
// 00:00:00). Sliding window counts only requests inside the last
// `windowMs`, so bursts are actually limited.
//
// Production note: this in-memory version is correct for a single
// server instance and for tests. On Vercel / serverless, instances do
// not share memory, so use a shared store (Redis via Upstash, or
// Vercel KV) with the same algorithm: store one sorted set / list of
// timestamps per key, prune older than windowMs, count, then append.
// The interface below (allow(key, now)) is deliberately store-agnostic
// so the Redis version is a drop-in replacement for the Map.
//
// Recommended starting limits (tune from real traffic, not guesses):
//   contact / service-lead forms: 5 submissions / 10 minutes / IP
//   BitElevate order creation:    3 orders / 10 minutes / IP
//   (generous on purpose — a college NAT can share one IP)

export class SlidingWindowLimiter {
  constructor({ limit, windowMs }) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.hits = new Map(); // key -> array of timestamps (ms)
  }

  allow(key, now = Date.now()) {
    const cutoff = now - this.windowMs;
    const recent = (this.hits.get(key) || []).filter((t) => t > cutoff);
    if (recent.length >= this.limit) {
      this.hits.set(key, recent);
      return { allowed: false, remaining: 0, resetMs: recent[0] + this.windowMs - now };
    }
    recent.push(now);
    this.hits.set(key, recent);
    return { allowed: true, remaining: this.limit - recent.length, resetMs: this.windowMs };
  }
}
