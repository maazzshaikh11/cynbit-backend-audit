import test from "node:test";
import assert from "node:assert/strict";
import { buildCsp, buildSecurityHeaders, nextHeaders } from "../security-headers/headers.js";
import { helmetOptions } from "../security-headers/express-helmet.js";
import { validateInquiry, validateServiceLead, validateBitElevate } from "../api-validation/contact.js";
import { problem, validationProblem, serverProblem } from "../error-envelope/problem.js";
import { SlidingWindowLimiter } from "../rate-limiting/limiter.js";
import { cacheControlFor } from "../caching/cache.js";

// --- Security headers (SEC-01, SEC-02) ---
test("CSP includes frame-ancestors none and does not use unsafe-eval", () => {
  const csp = buildCsp();
  assert.match(csp, /frame-ancestors 'none'/);
  assert.doesNotMatch(csp, /unsafe-eval/);
  assert.match(csp, /default-src 'self'/);
});

test("CSP adds Cashfree only for BitElevate, not for other pages", () => {
  assert.doesNotMatch(buildCsp(), /cashfree/);
  assert.match(buildCsp({ bitElevate: true }), /sdk\.cashfree\.com/);
});

test("security headers include nosniff, referrer policy, and HSTS without preload by default", () => {
  const h = buildSecurityHeaders();
  assert.equal(h["X-Content-Type-Options"], "nosniff");
  assert.equal(h["Referrer-Policy"], "strict-origin-when-cross-origin");
  assert.match(h["Strict-Transport-Security"], /max-age=63072000/);
  assert.doesNotMatch(h["Strict-Transport-Security"], /preload/);
});

test("nextHeaders() covers all routes and BitElevate separately", () => {
  const entries = nextHeaders();
  assert.equal(entries[0].source, "/:path*");
  assert.equal(entries[1].source, "/bitelevate/:path*");
});

test("helmet options mirror the Next.js CSP (same frame-ancestors, no unsafe-eval)", () => {
  const opts = helmetOptions();
  assert.deepEqual(opts.contentSecurityPolicy.directives.frameAncestors, ["'none'"]);
  assert.ok(!opts.contentSecurityPolicy.directives.scriptSrc.join(" ").includes("unsafe-eval"));
  assert.ok(helmetOptions({ bitElevate: true }).contentSecurityPolicy.directives.scriptSrc.join(" ").includes("sdk.cashfree.com"));
});

// --- Validation (VAL-01) ---
test("valid inquiry passes and trims whitespace", () => {
  const r = validateInquiry({ fullName: "  Alex Rivera ", email: "alex@example.com", message: "Hello, I would like to discuss a project." });
  assert.equal(r.ok, true);
  assert.equal(r.data.fullName, "Alex Rivera");
});

test("inquiry rejects bad email, short message, and over-long name", () => {
  const r = validateInquiry({ fullName: "x".repeat(101), email: "not-an-email", message: "hi" });
  assert.equal(r.ok, false);
  assert.ok(r.errors.email);
  assert.ok(r.errors.message);
  assert.ok(r.errors.fullName);
});

test("inquiry accepts optional fields omitted, rejects over-long optional field", () => {
  const ok = validateInquiry({ fullName: "Alex", email: "a@b.co", message: "A sufficiently long message here." });
  assert.equal(ok.ok, true);
  const bad = validateInquiry({ fullName: "Alex", email: "a@b.co", message: "A sufficiently long message here.", company: "x".repeat(101) });
  assert.equal(bad.ok, false);
});

test("service lead inherits inquiry rules and caps serviceType", () => {
  const r = validateServiceLead({ fullName: "Alex", email: "a@b.co", message: "A sufficiently long message here.", serviceType: "x".repeat(201) });
  assert.equal(r.ok, false);
  assert.ok(r.errors.serviceType);
});

test("BitElevate accepts a real track/duration and rejects an invented track", () => {
  const good = validateBitElevate({
    fullName: "Aarav Sharma", university: "SKIT", email: "aarav@example.com",
    phone: "+91 98765 43210", track: "AI", duration: "60-Day Standard Sprint (8 Weeks)",
    ambitions: "I want to build AI products and learn backend engineering.",
  });
  assert.equal(good.ok, true);
  const bad = validateBitElevate({
    fullName: "Aarav", university: "SKIT", email: "aarav@example.com",
    phone: "+91 98765 43210", track: "Quantum", duration: "60-Day Standard Sprint (8 Weeks)",
    ambitions: "I want to build AI products and learn backend engineering.",
  });
  assert.equal(bad.ok, false);
  assert.ok(bad.errors.track);
});

// --- Error envelope (RFC 9457) ---
test("problem() has RFC 9457 fields and never includes a stack", () => {
  const p = problem(400, "Validation failed", { detail: "Bad field", errors: { email: "invalid" } });
  assert.equal(p.status, 400);
  assert.equal(p.title, "Validation failed");
  assert.equal(p.type, "about:blank");
  assert.ok(!("stack" in p));
  assert.equal(p.errors.email, "invalid");
});

test("serverProblem() is generic and does not leak internals", () => {
  const p = serverProblem();
  assert.equal(p.status, 500);
  assert.doesNotMatch(JSON.stringify(p), /sql|stack|Error:/i);
  assert.equal(validationProblem({ email: "invalid" }).status, 400);
});

// --- Rate limiting ---
test("sliding window allows up to limit, then blocks, then allows after window passes", () => {
  const lim = new SlidingWindowLimiter({ limit: 3, windowMs: 1000 });
  assert.equal(lim.allow("1.2.3.4", 0).allowed, true);
  assert.equal(lim.allow("1.2.3.4", 100).allowed, true);
  assert.equal(lim.allow("1.2.3.4", 200).allowed, true);
  const blocked = lim.allow("1.2.3.4", 300);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.remaining, 0);
  // After the window slides past the first hit, a new request is allowed.
  assert.equal(lim.allow("1.2.3.4", 1001).allowed, true);
  // A different key is unaffected.
  assert.equal(lim.allow("5.6.7.8", 300).allowed, true);
});

test("fixed-window burst across a boundary is still limited by sliding window", () => {
  const lim = new SlidingWindowLimiter({ limit: 2, windowMs: 1000 });
  lim.allow("k", 999);
  lim.allow("k", 1000);
  // A fixed window would reset at 1000 and allow more; sliding window does not.
  assert.equal(lim.allow("k", 1001).allowed, false);
});

// --- Caching ---
test("cacheControlFor returns distinct, sensible values per route type", () => {
  assert.match(cacheControlFor("static-asset"), /immutable/);
  assert.match(cacheControlFor("prerendered-page"), /stale-while-revalidate/);
  assert.match(cacheControlFor("dynamic-page"), /no-store/);
  assert.match(cacheControlFor("sitemap"), /s-maxage=3600/);
  assert.throws(() => cacheControlFor("unknown"), /unknown route type/);
});
