# 3. Security & performance findings

Severity is calibrated for a public marketing site with no logged-in
user area observed: a missing header on such a site is **not** Critical.
Justification is given as likelihood × impact in one line per finding.
Confidence: **Confirmed** = directly in saved evidence;
**Strongly inferred** = the only reasonable reading of the evidence, but
not directly observed; **Hypothesis** = cannot be verified passively,
included only where it changes what the owners should check internally.

## Summary table

Ranked by value to the owner: what to act on first, then by severity.
Severities are calibrated for a public marketing site — a missing header
here is never Critical.

| ID | Title | Severity | Confidence |
|---|---|---|---|
| SEC-01 | No Content-Security-Policy on any response | Medium | Confirmed |
| VAL-01 | Forms rely on visible client-side constraints only; server-side validation, rate limiting, and spam controls are unverifiable from outside | Medium | Confirmed (client side) / Hypothesis (server side) |
| PERF-05 | Mobile lab performance is poor (Lighthouse 33): LCP 11.0 s, TBT 3.0 s, a 1.11 MB icon font, and ~125 KB of unused JavaScript | Medium | Confirmed |
| SEC-02 | Other hardening headers missing (X-Content-Type-Options, frame-ancestors, Referrer-Policy, Permissions-Policy, COOP/CORP) | Low | Confirmed |
| SEC-07 | Analytics cookies (`_ga`, `_ga_LK6CQWCWX0`) set without `Secure`, `HttpOnly`, or an explicit `SameSite` | Low | Confirmed |
| VAL-02 | PII collected on forms; analytics runs and writes cookies with zero user interaction; consent handling not established | Low | Confirmed (fields, firing) / Hypothesis (consent) |
| PERF-01 | Slowest routes are the always-dynamic ones (`/careers`, `/sitemap.xml`) | Low | Confirmed |
| PERF-03 | BitElevate page is the heaviest: 220 KB HTML, oversized `next/image` widths | Low | Confirmed |
| SEC-03 | HSTS present but without `includeSubDomains` / `preload` | Low | Confirmed |
| SEC-04 | `Access-Control-Allow-Origin: *` on HTML pages, inconsistently applied | Low | Confirmed |
| PERF-04 | Canonicalisation is inconsistent (no canonical on most pages; `og:url` uses apex, site redirects to `www`) | Low | Confirmed |
| PERF-02 | Browser revalidates prerendered pages on every visit (normal Vercel default) | Info | Confirmed |
| ARCH-01 | `robots.txt` advertises `/api/`, `/admin/`, `/portal/` as disallowed paths | Info | Confirmed |
| ERR-01 | 404 handling is correct in status but shares the same header gaps and a full-page payload | Info | Confirmed |
| SEC-05 | Framework/hosting leakage in headers | Info | Confirmed |
| SEC-06 | No `/.well-known/security.txt` | Info | Confirmed |
| ARCH-02 | No public REST/GraphQL API is observable; the API is Server Actions, so versioning, pagination, and error formats cannot be assessed externally | Info | Strongly inferred |
| AUTH-01 | Intern-portal login surface exists but was not (and could not be) tested | Info | Confirmed (link exists) / Hypothesis (everything about its security) |

## Detailed findings

### SEC-01 — No Content-Security-Policy on any response

- **Severity:** Medium — likelihood medium (site loads third-party scripts: Google Tag Manager, Google Fonts, and, on BitElevate, Cashfree), impact medium (a compromised or malicious third-party script runs with full page privilege).
- **Confidence:** Confirmed (the absence of the header, in 29 curl responses and in the browser capture). Whether any injection risk is *currently* exploited is not claimable by any passive audit — nothing here says it is.
- **Evidence:** `evidence/header-scorecard.txt` — `content-security-policy: 0/29` files. Every page, the 404, `robots.txt`, and `sitemap.xml` lack it. Corroborated by a real browser: the main-document response headers in `evidence/har/homepage-network-summary.md` (one passive homepage load through headless Chrome) contain no `content-security-policy` either, so the gap is not an artefact of curl.
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

### SEC-07 — Analytics cookies set without `Secure`, `HttpOnly`, or explicit `SameSite`

- **Severity:** Low — these are non-authentication analytics cookies; no session or credential rides on them, and modern browsers default an absent `SameSite` to `Lax`, so real-world exposure is limited. The gap is hygiene, and it would matter a great deal on any cookie that *does* carry a session.
- **Confidence:** Confirmed.
- **Evidence:** `evidence/har/homepage.har` and `evidence/har/homepage-network-summary.md` — the browser cookie jar after one passive homepage load contains exactly two cookies, `_ga` and `_ga_LK6CQWCWX0`, both on `.cynbit.in`, both `secure: false`, `httpOnly: false`, and with **no `SameSite` attribute at all** (persistent, expiring ~2027-11). `0` responses carried a `Set-Cookie` header: both cookies were written client-side by Google Tag Manager / `gtag`. Cookie *values* were never read or stored — only attributes and lengths.
- **Impact:** A script injected into any page on the domain (the exact risk SEC-01 exists to mitigate) can read these cookies; without `Secure` a browser would accept them from a non-HTTPS request in future if one ever succeeded; without an explicit `SameSite` the policy depends on the browser's changing default rather than on the site's intent.
- **Recommended fix:** Since `gtag` writes these cookies, set the flags Google documents for Consent Mode (`SameSite=Lax`, `Secure`) or set them via `gtag('set','cookie_flags','SameSite=Lax;Secure')`. More importantly: whatever cookie *is* used for the intern portal session must be `Secure; HttpOnly; SameSite=Lax` (or `Strict`) — verify that internally (AUTH-01).
- **Effort:** S.

### AUTH-01 — Intern-portal login surface exists but was not tested

- **Severity:** Info — untested, so no severity can be assigned; included so it is not mistaken for "no auth exists".
- **Confidence:** Confirmed that the link and credential-display string exist in the published bundle; **Hypothesis** for everything about the portal's actual security (there is no observation of it in this repo).
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

### VAL-02 — PII collected on forms; analytics runs with zero interaction; consent not established

- **Severity:** Low — the data collected is ordinary business-contact data, not sensitive personal data, but BitElevate adds phone numbers and education/career details of students. The analytics firing is pre-consent only in the sense that no consent was ever *given* during the observation window; no consent dialog was visible to decline.
- **Confidence:** Confirmed for the fields and for the firing; **Hypothesis** for consent handling (see below).
- **Evidence (fields):** Contact form collects name, email, company, industry, message. Products form collects name, work email, company, message, product interest. BitElevate collects name, university, email, phone/WhatsApp, track, duration, referral, and career ambitions. All are `FormData` passed to Server Actions (§2.2).
- **Evidence (third parties firing):** `evidence/har/homepage-network-summary.md` — during one passive homepage load **with zero user interaction** (no click, no scroll, no form activity), the browser contacted `www.googletagmanager.com` (199 KB `gtag/js`), then `analytics.google.com/g/collect` (POST 204), `stats.g.doubleclick.net/g/collect` (POST 204) and `www.google.co.in/ads/ga-audiences` (GET 200), and wrote two `_ga*` cookies. This upgrades the earlier "Google Analytics appears in HTML" observation to **Confirmed: analytics and an audience-measurement pixel run during a normal load, before any interaction**.
- **Evidence (consent):** no consent banner, consent string, or CMP (OneTrust/Cookiebot/etc.) appears in the server-rendered homepage HTML (`evidence/html/home-r1.html`); the only consent-adjacent surface is a footer link to `/cookies`. During the 12-second capture no consent dialog appeared. **Hypothesis:** whether a banner renders later, is region-gated, or simply does not exist is *not* established — a client-rendered banner outside the capture window, or geo-gating outside this region, would not be visible here. Do not read this as "the site has no consent mechanism"; read it as "no consent mechanism was observed before analytics ran".
- **Evidence (server side):** `evidence/har/homepage.har` — 0 `Set-Cookie` headers in all 54 responses; the two cookies present were written by client-side script.
- **Recommended fix:** Document, on the privacy page, exactly which fields go where (CRM/inbox/payment provider) and for how long; gate analytics and the DoubleClick/audience pixels behind consent if the site's users are in a consent jurisdiction; minimise BitElevate fields to what enrolment actually needs.
- **Effort:** S (documentation) / M (consent gating).

### PERF-01 — Slowest routes are the always-dynamic ones

- **Severity:** Low — warm TTFB is acceptable; the cost is paid on every visit to these two routes, not just cold starts.
- **Confidence:** Confirmed.
- **Evidence:** `evidence/timings/` — `/careers` TTFB 1.235 / 0.508 / 0.652 s and `/sitemap.xml` 1.818 / 0.992 / 1.106 s, against 0.27–0.75 s warm for prerendered pages. Both are `X-Vercel-Cache: MISS` on all 3 repeats, while prerendered pages are `HIT` on all 3.
- **Impact:** Every careers visitor pays a dynamic render; every crawler pays a dynamic sitemap generation. At this site's scale this is a cost and latency issue, not an outage risk.
- **Recommended fix:** Prerender `/careers` if its content is static (it appears to be a job list), or cache it at the edge with revalidation; generate `sitemap.xml` at build time or cache it for hours instead of per request (see `snippets/caching/`).
- **Effort:** S–M.

### PERF-02 — Browser revalidates prerendered pages on every visit (normal Vercel default)

- **Severity:** Info — this is expected platform behaviour, not a defect; the only cost is a revalidation round-trip per browser visit.
- **Confidence:** Confirmed.
- **Evidence:** Prerendered pages send `Cache-Control: public, max-age=0, must-revalidate` and arrive with `X-Vercel-Cache: HIT` and `Age: ~29,600 s` (~8.2 h) on all repeats, plus `X-Nextjs-Stale-Time: 300` (`evidence/headers/home-r1.headers.txt`, and the same pattern for `/contact`, `/services`, `/products`, `/bitelevate`).
- **Interpretation (corrected):** `max-age=0` tells the *browser* to revalidate on every visit, while Vercel's *edge* may still serve its own cached copy — hence `HIT` and a large edge `Age`. `Age` is an edge-cache age, not a browser-cache age, so the two values are not contradictory. An earlier draft of this report described this as an inconsistency; that was a misunderstanding of Vercel's default for prerendered Next.js pages, and it has been corrected here.
- **Impact:** Each browser visit pays a revalidation round-trip (usually cheap, and served from the edge), but visitors get no browser-side caching of these pages. The always-`MISS` routes are a separate, real observation — see PERF-01, not this finding.
- **Recommended fix:** Only if browser-side caching is wanted: keep the edge policy as it is (it is correct) and add browser-facing directives — for example `public, max-age=60, stale-while-revalidate=300` — and, if a shared-cache TTL independent of the browser is the actual goal, set **`s-maxage`** alongside `max-age` so the edge and the browser are told apart explicitly (see `snippets/caching/`). The trade-off is that browser-cached visitors see updates up to `max-age` later; do not make this change if immediate updates matter more than saved revalidations.
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

### PERF-05 — Mobile lab performance is poor (Lighthouse 33)

- **Severity:** Medium — likelihood high (mobile visitors on a throttled connection are the normal case for a marketing site), impact high: LCP 11.0 s and TBT 3.0 s in the lab correspond to a page that feels unresponsive and risks losing visitors before the hero text paints. This is the highest-value *performance* item found because it is measurable and cheap to improve.
- **Confidence:** Confirmed for the lab run (raw JSON committed); scores vary between runs, so treat the numbers as one observation — see the note in `evidence/lighthouse/summary.md`.
- **Evidence:** `evidence/lighthouse/mobile-home.json` — Performance **33**, Accessibility 82, Best Practices 100, SEO 100 (mobile, simulated 150 ms RTT / 1.6 Mbps / 4× CPU). LCP **11,005 ms**, TBT **3,009 ms**, CLS 0.013, FCP 2,671 ms, Speed Index 8,589 ms. Desktop by contrast scores **77** (LCP 2,151 ms, TBT 0 ms), and `/careers` desktop scores **87** — the pain is specific to the throttled mobile case.
- **Corroborating first-hand evidence:** `evidence/har/homepage-network-summary.md` — a cold browser load transfers **~1.7 MB**, of which **1,140,011 B is a single Material Symbols icon font** from `fonts.gstatic.com` and 199,307 B is `gtag/js`; together the 6 third-party requests account for ~77% of all bytes. Top Lighthouse opportunities: unused JavaScript (~125 KB, est. 750 ms), legacy JavaScript (~11.6 KB, est. 150 ms), and render-blocking stylesheets (`fonts.googleapis.com` ~1,029 ms wasted, site CSS ~680 ms wasted).
- **Impact:** Slow first paint and main-thread blocking on mobile; the icon font alone is larger than every other resource combined.
- **Recommended fix:** (1) Serve the icon font as a subset (the page uses a handful of Material Symbols) or replace with inline SVG — that single change removes ~1.1 MB. (2) Self-host and `font-display: swap` the Google Fonts CSS so it stops render-blocking. (3) Drop unused code paths from the page chunks. (4) Load `gtag` deferred. Findings PERF-03 (oversized `next/image` widths) and this one overlap on the BitElevate page.
- **Effort:** S for the font subset, M for the JS trim.

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
- **Evidence:** No `/api/` string in the three page bundles; `robots.txt` disallows `/api/` but no API route was observed, called, or verified; all observed mutations are Server Actions (§2.2). Runtime corroboration: the one browser homepage load in `evidence/har/homepage.har` produced 54 requests of which the only POSTs were two Google analytics hits — no `/api/`, `/admin/`, `/portal/`, or Server Action call fired during a normal visit.
- **Impact:** Standard API concerns — versioning, pagination, rate-limit headers, consistent error envelopes — cannot be assessed from outside, because there is no public API surface to assess. If the team later exposes a REST API (for the portal, mobile app, or partners), it should be designed with those concerns from day one (see `snippets/error-envelope/` for the error format to adopt).
- **Recommended fix:** No fix needed for the current site. For any future API: version it, return RFC 9457 problem responses, and document rate limits.
- **Effort:** — (future work).

## What's done well

- **HTTPS by default, correctly redirected:** `http://cynbit.in/` and `http://www.cynbit.in/` return 308 to HTTPS; `https://cynbit.in/` returns 307 to `https://www.cynbit.in/` (redirect evidence in `evidence/headers/redirect-*.headers.txt`).
- **HSTS on HTTPS responses** (`max-age=63072000`, ~2 years).
- **Brotli compression** on all HTML responses.
- **Edge caching works for prerendered pages** (consistent `HIT`s).
- **Correct 404 semantics** with a branded page and no stack trace or path leakage.
- **No cookies for anonymous visitors at the HTTP layer:** no `Set-Cookie` in any of the 29 curl responses **or** in any of the 54 responses of the browser load. A browser *does* end up with two analytics cookies (`_ga`, `_ga_LK6CQWCWX0`), but those are written client-side by Google Tag Manager, not by Cynbit's server — see SEC-07 and VAL-02.
- **No secrets in client bundles:** no API keys, tokens, or credential-like strings were found in the three page bundles analysed; no `sourceMappingURL` in any of them, so no source maps are referenced (and none was fetched).
- **Structured data and a real sitemap** (82 URLs) are present and well formed.
