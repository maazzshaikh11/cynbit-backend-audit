# 3. Security & performance findings

Severity is calibrated for a public marketing site with no logged-in
user area observed: a missing header on such a site is **not** Critical.
Justification is given as likelihood × impact in one line per finding.
Confidence: **Confirmed** = directly in saved evidence;
**Strongly inferred** = the only reasonable reading of the evidence, but
not directly observed; **Hypothesis** = cannot be verified passively,
included only where it changes what the owners should check internally.

## Summary table

| ID | Title | Severity | Confidence |
|---|---|---|---|
| SEC-01 | No Content-Security-Policy on any response | Medium | Confirmed |
| SEC-02 | Other hardening headers missing (X-Content-Type-Options, frame-ancestors, Referrer-Policy, Permissions-Policy, COOP/CORP) | Low | Confirmed |
| SEC-03 | HSTS present but without `includeSubDomains` / `preload` | Low | Confirmed |
| SEC-04 | `Access-Control-Allow-Origin: *` on HTML pages, inconsistently applied | Low | Confirmed |
| SEC-05 | Framework/hosting leakage in headers | Info | Confirmed |
| SEC-06 | No `/.well-known/security.txt` | Info | Confirmed |
| AUTH-01 | Intern-portal login surface exists but was not (and could not be) tested | Info | Strongly inferred |
| VAL-01 | Forms rely on visible client-side constraints only; server-side validation, rate limiting, and spam controls are unverifiable from outside | Medium | Confirmed (client side) / Hypothesis (server side) |
| VAL-02 | PII collected on forms; third-party data sharing and consent are only partly visible | Low | Confirmed (fields) / Hypothesis (consent) |
| PERF-01 | Slowest routes are the always-dynamic ones (`/careers`, `/sitemap.xml`) | Low | Confirmed |
| PERF-02 | Cache policy is inconsistent and hard to reason about (`max-age=0` + ~8 h `Age`; careers never cached) | Low | Confirmed |
| PERF-03 | BitElevate page is the heaviest: 220 KB HTML, oversized `next/image` widths | Low | Confirmed |
| PERF-04 | Canonicalisation is inconsistent (no canonical on most pages; `og:url` uses apex, site redirects to `www`) | Low | Confirmed |
| ERR-01 | 404 handling is correct in status but shares the same header gaps and a full-page payload | Info | Confirmed |
| ARCH-01 | `robots.txt` advertises `/api/`, `/admin/`, `/portal/` as disallowed paths | Info | Confirmed |
| ARCH-02 | No public REST/GraphQL API is observable; the API is Server Actions, so versioning, pagination, and error formats cannot be assessed externally | Info | Strongly inferred |

## Detailed findings

### SEC-01 — No Content-Security-Policy on any response

- **Severity:** Medium — likelihood medium (site loads third-party scripts: Google Tag Manager, Google Fonts, and, on BitElevate, Cashfree), impact medium (a compromised or malicious third-party script runs with full page privilege).
- **Confidence:** Confirmed.
- **Evidence:** `evidence/header-scorecard.txt` — `content-security-policy: 0/29` files. Every page, the 404, `robots.txt`, and `sitemap.xml` lack it.
- **Impact:** No browser-enforced restriction on which scripts, styles, frames, or connections the page may load. This matters most on the payment page, where the Cashfree checkout modal runs in the same page as marketing scripts.
- **Recommended fix:** Add a strict-but-realistic CSP via Next.js `headers()` (see `snippets/security-headers/`), starting in report-only mode, then enforcing. Allow-list exactly the hosts observed: self, Google Tag Manager / Analytics, Google Fonts, and Cashfree on BitElevate only.
- **Effort:** S.

### SEC-02 — Other hardening headers missing

- **Severity:** Low — likelihood low on a largely static marketing site, impact low-to-medium (clickjacking, MIME sniffing, referrer leakage).
- **Confidence:** Confirmed.
- **Evidence:** `evidence/header-scorecard.txt` — `x-content-type-options: 0/29`, `x-frame-options: 0/29`, `referrer-policy: 0/29`, `permissions-policy: 0/29`, `cross-origin-opener-policy: 0/29`, `cross-origin-resource-policy: 0/29`, `cross-origin-embedder-policy: 0/29`.
- **Impact:** Pages can be framed by any site (no `frame-ancestors` either, since there is no CSP); browsers may MIME-sniff responses; full referrer URLs may leak to third parties; powerful browser features are not explicitly disabled.
- **Recommended fix:** Same `headers()` config as SEC-01: `X-Content-Type-Options: nosniff`, `frame-ancestors 'none'` inside the CSP (preferred over `X-Frame-Options`), `Referrer-Policy: strict-origin-when-cross-origin`, and a restrictive `Permissions-Policy` (see `snippets/security-headers/`).
- **Effort:** S (same change as SEC-01).

### SEC-03 — HSTS present but without `includeSubDomains` / `preload`

- **Severity:** Low — the main protection is already in place; the gap only affects subdomains and first visits.
- **Confidence:** Confirmed.
- **Evidence:** `evidence/headers/home-r1.headers.txt` (and all HTTPS responses): `Strict-Transport-Security: max-age=63072000`. No `includeSubDomains`, no `preload`. The two plain-HTTP redirect responses correctly carry no HSTS (HSTS over HTTP would be ignored).
- **Impact:** A subdomain served over HTTP would not be covered; first-visit downgrade protection depends on preload listing.
- **Recommended fix:** Once all subdomains are confirmed HTTPS-only, use `max-age=63072000; includeSubDomains; preload` and submit to the preload list. Do not add `preload` before confirming subdomain coverage.
- **Effort:** S.

### SEC-04 — `Access-Control-Allow-Origin: *` on HTML pages, inconsistently applied

- **Severity:** Low — likelihood low, impact low: a wildcard on a public HTML document does not by itself expose credentials or private data, and no credentialed API was observed.
- **Confidence:** Confirmed.
- **Evidence:** `evidence/header-scorecard.txt` — `access-control-allow-origin: 20/29`. Present (`*`) on `/`, `/contact`, `/services`, `/products`, `/bitelevate`, `/robots.txt`, and the 404; absent on `/careers` and `/sitemap.xml` and on redirect responses.
- **Impact:** Mainly a hygiene / least-privilege issue: the wildcard is unnecessary for documents that browsers load by navigation, and its inconsistency suggests it is a platform default for some routes rather than a deliberate policy. It should not be copied onto any future authenticated API.
- **Recommended fix:** Do not set `Access-Control-Allow-Origin` on document responses. For any future API route, allow-list specific origins and never combine `*` with credentials.
- **Effort:** S.

### SEC-05 — Framework/hosting leakage in headers

- **Severity:** Info — helps an attacker pick a target stack, but reveals nothing exploitable by itself.
- **Confidence:** Confirmed.
- **Evidence:** `Server: Vercel` in 29/29 files; `X-Powered-By: Next.js` in 3/29 (the three `/careers` repeats only); `X-Matched-Path`, `X-Nextjs-Prerender`, and `X-Vercel-Cache` in most files.
- **Impact:** Negligible on its own; the stack is also obvious from `/_next/` URLs. The interesting part is the inconsistency: `/careers` is the only route that advertises Next.js, which corroborates that it renders differently (see PERF-01).
- **Recommended fix:** In Next.js, set `poweredByHeader: false` in `next.config` for consistency. `Server: Vercel` is set by the platform and is not worth fighting.
- **Effort:** S.

### SEC-06 — No `/.well-known/security.txt`

- **Severity:** Info — no direct risk; it only makes responsible disclosure harder to find.
- **Confidence:** Confirmed.
- **Evidence:** `evidence/headers/security-txt.headers.txt` — `HTTP/1.1 404 Not Found`, `X-Matched-Path: /404`; the body saved as `evidence/html/security-txt.txt` is the site's normal 404 HTML page, not a `security.txt` file.
- **Impact:** A researcher who finds an issue has no published contact or policy to use.
- **Recommended fix:** Publish a minimal `security.txt` (RFC 9116) at `/.well-known/security.txt` with a contact and an expiry, served as `text/plain`.
- **Effort:** S.

### AUTH-01 — Intern-portal login surface exists but was not tested

- **Severity:** Info — untested, so no severity can be assigned; included so it is not mistaken for "no auth exists".
- **Confidence:** Strongly inferred.
- **Evidence:** BitElevate bundle (`evidence/bundles/app__marketing__bitelevate_page-e1cc18fdcf688572_js`): after payment verification the UI shows "Portal URL: cynbit.in/intern-portal/login" and a link to `/intern-portal/login`, plus user credentials for copying. `robots.txt` also disallows `/portal/`.
- **Impact:** Unknown. The portal is the site's only observed authenticated surface, and it handles post-payment student credentials — exactly the area that deserves an authorised review (session handling, credential delivery, password policy). Passive testing cannot assess any of it, and login attempts were forbidden by the brief.
- **Recommended fix:** Authorised internal review only: check how portal credentials are generated, delivered, stored (hashed, never in URLs/logs), and rotated; confirm the portal is not reachable without authentication; do not display a password in page JavaScript longer than the single success screen needs.
- **Effort:** M (review) — not estimable for fixes without access.

### VAL-01 — Forms rely on visible client-side constraints only

- **Severity:** Medium — likelihood medium (public forms with no visible bot protection are routinely spammed), impact medium (spam / junk leads, oversized or malformed data reaching a CRM or inbox, and, on BitElevate, payment-order creation).
- **Confidence:** Confirmed for the client side; **Hypothesis** for the server side (see below).
- **Evidence (client side):** `evidence/html-inventory.txt` and field inspection of `evidence/html/contact-r1.html`, `products-r1.html`, `bitelevate-r1.html`:
  - Only `required` and `type=email` constraints are present.
  - **Zero** `autocomplete`, `maxlength`/`maxLength`, or `pattern` attributes on any form field on any page.
  - No CSRF token field, no captcha/honeypot field, and no `action` URL in the HTML (submission is via Server Actions, §2.2).
  - Client handlers show only a generic failure message ("Something went wrong. Please try again or email us directly." in the contact bundle) — no field-level server error mapping is visible.
- **What is not known (Hypothesis — needs verification):** whether the Server Actions validate length, format, and content server-side, enforce rate limits, deduplicate submissions (idempotency), or reject bots. None of that is visible in a client bundle or in headers, and it was not tested by submitting. **Do not read this finding as "the server does not validate"** — read it as "validation cannot be evidenced from outside, and the client gives it no help".
- **Impact if the hypothesis holds:** unbounded message/phone fields, duplicate submissions on double-click or retry, and automated spam reaching the team.
- **Recommended fix:** Server-side Zod/Pydantic schemas with length and format limits, an idempotency key per submission, and per-IP + per-form rate limiting (see `snippets/api-validation/` and `snippets/rate-limiting/`). Add `maxlength` and `autocomplete` attributes client-side as a second layer, not the control.
- **Effort:** M.

### VAL-02 — PII collected on forms; third-party sharing and consent partly visible

- **Severity:** Low — the data collected is ordinary business-contact data, not sensitive personal data, but BitElevate adds phone numbers and education/career details of students.
- **Confidence:** Confirmed for the fields; Hypothesis for consent handling.
- **Evidence (fields):** Contact form collects name, email, company, industry, message. Products form collects name, work email, company, message, product interest. BitElevate collects name, university, email, phone/WhatsApp, track, duration, referral, and career ambitions. All are `FormData` passed to Server Actions (§2.2).
- **Evidence (third parties):** Google Analytics on every page; Google Fonts; Cashfree on BitElevate (§2.6). No CRM or lead-gen widget is visible in the HTML or page bundles.
- **Hypothesis:** No consent banner or consent string was found in the server-rendered homepage HTML (only a footer link to `/cookies`). A banner could be rendered client-side after load, so this is **not** confirmed as "no consent mechanism". The browser-load evidence that could settle it was not returned (see `docs/05-limitations-and-ethics.md`).
- **Recommended fix:** Document, on the privacy page, exactly which fields go where (CRM/inbox/payment provider) and for how long; if analytics runs before consent, gate it behind consent; minimise BitElevate fields to what enrolment actually needs.
- **Effort:** S (documentation) / M (consent gating).

### PERF-01 — Slowest routes are the always-dynamic ones

- **Severity:** Low — warm TTFB is acceptable; the cost is paid on every visit to these two routes, not just cold starts.
- **Confidence:** Confirmed.
- **Evidence:** `evidence/timings/` — `/careers` TTFB 1.235 / 0.508 / 0.652 s and `/sitemap.xml` 1.818 / 0.992 / 1.106 s, against 0.27–0.75 s warm for prerendered pages. Both are `X-Vercel-Cache: MISS` on all 3 repeats, while prerendered pages are `HIT` on all 3.
- **Impact:** Every careers visitor pays a dynamic render; every crawler pays a dynamic sitemap generation. At this site's scale this is a cost and latency issue, not an outage risk.
- **Recommended fix:** Prerender `/careers` if its content is static (it appears to be a job list), or cache it at the edge with revalidation; generate `sitemap.xml` at build time or cache it for hours instead of per request (see `snippets/caching/`).
- **Effort:** S–M.

### PERF-02 — Cache policy is inconsistent and hard to reason about

- **Severity:** Low — no stale-content incident is evidenced; the risk is that nobody can predict what is cached.
- **Confidence:** Confirmed.
- **Evidence:** Prerendered pages send `Cache-Control: public, max-age=0, must-revalidate` yet arrive with `X-Vercel-Cache: HIT` and `Age: ~29,600 s` (~8.2 h) on all repeats, plus `X-Nextjs-Stale-Time: 300`. `/careers` sends `private, no-cache, no-store`. `/robots.txt` went `MISS → HIT (Age 51) → HIT (Age 2974)`, suggesting different edge nodes or cache ages.
- **Impact:** Operators cannot tell from the headers alone whether a content update reaches visitors in 5 minutes or 8 hours, and the `Age` value contradicts a naive reading of `max-age=0`.
- **Recommended fix:** Document the intended caching per route type (static / prerendered / dynamic / sitemap) and set it explicitly — for example, immutable hashes for `/_next/static/*`, a stated revalidation interval for prerendered pages, and `no-store` only where content is genuinely per-user (see `snippets/caching/`).
- **Effort:** S.

### PERF-03 — BitElevate page is the heaviest

- **Severity:** Low — one page, not site-wide; impact is mobile load time and data use.
- **Confidence:** Confirmed.
- **Evidence:** `evidence/html/bitelevate-r1.html` is ~220 KB decompressed (vs 64–125 KB for other pages); its page chunk is 90 KB decompressed (vs 24 KB contact, 44 KB products). Student photos are served via `/_next/image?url=...&w=3840&q=75` — a 3840 px width for what renders as a small avatar/card image.
- **Impact:** Unnecessary bytes on every BitElevate visit, especially on mobile connections.
- **Recommended fix:** Serve responsive `next/image` widths matched to rendered sizes (e.g. 256–768 px for cards), keep `q=75` or lower for photos, and lazy-load below-the-fold images.
- **Effort:** S.

### PERF-04 — Canonicalisation is inconsistent

- **Severity:** Low — SEO / duplicate-content risk, not a security or availability issue.
- **Confidence:** Confirmed.
- **Evidence:** No `<link rel="canonical">` in home, contact, careers, services, or products HTML; only `/bitelevate` has one (`https://cynbit.in/bitelevate`). All pages' `og:url` uses the apex (`https://cynbit.in`), while the site redirects apex HTTPS to `www` with a 307 (see §2, redirect evidence). `robots.txt` likewise points the sitemap at the apex URL.
- **Impact:** Search engines see apex and `www` versions of the same content without a canonical signal; social shares point at a URL that redirects.
- **Recommended fix:** Emit a canonical on every page pointing at the `www` URL, and make `og:url`, sitemap locs, and robots' sitemap line use the same host.
- **Effort:** S.

### ERR-01 — 404 handling is correct in status but shares the same header gaps

- **Severity:** Info — the important behaviour (correct status, no leak) is right.
- **Confidence:** Confirmed.
- **Evidence:** `evidence/headers/not-found-404.headers.txt` — `HTTP/1.1 404 Not Found`, `X-Matched-Path: /404`, `X-Next-Error-Status: 404`. Body (`evidence/html/not-found-404.html`) is a branded "Node Not Found" page with links home and to contact; no stack trace, no file paths, no framework version in the body. The 404 response still lacks CSP and the other hardening headers (SEC-01/02), and it is a full page (~15 KB decompressed, 4.4 KB wire) including layout, analytics, and RSC payload.
- **Impact:** Minimal. The same header fix as SEC-01/02 covers the 404.
- **Recommended fix:** Apply the global `headers()` config to error routes as well (Next.js `headers()` applies to all routes, including `not-found`, unless scoped otherwise); keep the branded page.
- **Effort:** S (covered by SEC-01).

### ARCH-01 — `robots.txt` advertises `/api/`, `/admin/`, `/portal/` as disallowed paths

- **Severity:** Info — `robots.txt` is public by design; disallowing a path does not protect it, but listing it does advertise that something may live there.
- **Confidence:** Confirmed.
- **Evidence:** `evidence/html/robots_txt-r1.html`:
  `Disallow: /api/`, `Disallow: /admin/`, `Disallow: /portal/`, alongside `Allow: /` and `Sitemap: https://cynbit.in/sitemap.xml`.
- **Impact:** Low. No `/api/`, `/admin/`, or `/portal/` URL was fetched or verified to exist in this audit. If any of those routes exist, their security must come from authentication and authorisation, not from `robots.txt`.
- **Recommended fix:** Keep the disallows only for paths that genuinely should not be crawled, and verify internally that `/admin/` and `/portal/` (if they exist) require authentication. No change is needed if the disallows are purely precautionary.
- **Effort:** S (verification).

### ARCH-02 — No public REST/GraphQL API is observable

- **Severity:** Info — this limits what an external audit can say, and it is itself an architectural observation.
- **Confidence:** Strongly inferred.
- **Evidence:** No `/api/` string in the three page bundles; `robots.txt` disallows `/api/` but no API route was observed, called, or verified; all observed mutations are Server Actions (§2.2).
- **Impact:** Standard API concerns — versioning, pagination, rate-limit headers, consistent error envelopes — cannot be assessed from outside, because there is no public API surface to assess. If the team later exposes a REST API (for the portal, mobile app, or partners), it should be designed with those concerns from day one (see `snippets/error-envelope/` for the error format to adopt).
- **Recommended fix:** No fix needed for the current site. For any future API: version it, return RFC 9457 problem responses, and document rate limits.
- **Effort:** — (future work).

## What's done well

- **HTTPS by default, correctly redirected:** `http://cynbit.in/` and `http://www.cynbit.in/` return 308 to HTTPS; `https://cynbit.in/` returns 307 to `https://www.cynbit.in/` (redirect evidence in `evidence/headers/redirect-*.headers.txt`).
- **HSTS on HTTPS responses** (`max-age=63072000`, ~2 years).
- **Brotli compression** on all HTML responses.
- **Edge caching works for prerendered pages** (consistent `HIT`s).
- **Correct 404 semantics** with a branded page and no stack trace or path leakage.
- **No cookies for anonymous visitors** (no `Set-Cookie` in any curl response) — the site does not track anonymous curl traffic with server cookies.
- **No secrets in client bundles:** no API keys, tokens, or credential-like strings were found in the three page bundles analysed; no `sourceMappingURL` in any of them, so no source maps are referenced (and none was fetched).
- **Structured data and a real sitemap** (82 URLs) are present and well formed.
