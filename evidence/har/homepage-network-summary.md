# Homepage browser load — network summary

**Captured:** 2026-10-30T16:26:43Z · **URL:** `https://www.cynbit.in/` ·
**Tool:** headless Chrome 156 (Chrome DevTools Protocol via `puppeteer-core`),
fresh empty profile (first-visit state) · **Result:** HTTP 200, final URL
unchanged (no redirect), page title
`Cynbit Technologies | AI Automation & Software Solutions Jaipur | Cynbit Technologies`.

**Interaction: none.** One `page.goto()` to the homepage, then a 12-second
wait for late-loading resources. No clicks, no scrolling, no key presses,
the newsletter popup was not touched, no form was filled or submitted.
54 network requests were recorded; the machine-readable version with URL,
method, status, type, size and timing for every one of them is
`homepage.har` in this directory.

## Totals

| | |
|---|---|
| Requests recorded | 54 (all got a response: 52× 200, 2× 204; 1 POST later aborted — see "Not captured") |
| Owned by `www.cynbit.in` | 48 requests, ~395 KB transferred |
| Third-party | 6 requests, ~1,310 KB transferred (77% of all bytes) |
| Total transferred | ~1,705 KB over a cold cache |
| Main document | `h2`, 15,790 B wire (Brotli), 1,353 ms, `X-Vercel-Cache: HIT` |
| Protocol observed | `h2` for all 54 requests (see limitations) |

## Third parties contacted (6 requests)

| Host | Requests | Method/status | Type | Bytes | When |
|---|---|---|---|---|---|
| `fonts.gstatic.com` | 1 | GET 200 | Font | 1,140,011 | Material Symbols variable font, cold cache |
| `www.googletagmanager.com` | 1 | GET 200 | Script | 199,307 | `gtag/js?id=G-LK6CQWCWX0`, on load |
| `fonts.googleapis.com` | 1 | GET 200 | Stylesheet | 891 | Material Symbols CSS, render-blocking |
| `stats.g.doubleclick.net` | 1 | POST 204 | Ping | 557 | analytics hit, no interaction |
| `www.google.co.in` | 1 | GET 200 | Image | 408 | `ads/ga-audiences` pixel, no interaction |
| `analytics.google.com` | 1 | POST 204 → aborted | Fetch | 0 | `g/collect`, no interaction |

All four Google endpoints (`googletagmanager`, `analytics.google.com`,
`stats.g.doubleclick.net`, `www.google.co.in/ads/ga-audiences`) were
contacted **during the page load with zero user interaction** — no click,
no scroll, no form activity. That is `Confirmed` for *this* capture.

Google Analytics measurement ID `G-LK6CQWCWX0` is the site's own public ID,
present in the server-rendered HTML; it is not a secret and is not redacted.

## Main document response headers (verbatim, `x-vercel-id` redacted)

```http
HTTP/2 200
access-control-allow-origin: *
age: 98056
cache-control: public, max-age=0, must-revalidate
content-disposition: inline
content-encoding: br
content-type: text/html; charset=utf-8
etag: W/"babdce9795e4ef3d84461090987852d3"
server: Vercel
strict-transport-security: max-age=63072000
vary: rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch
x-matched-path: /
x-nextjs-prerender: 1
x-nextjs-stale-time: 300
x-vercel-cache: HIT
x-vercel-id: [REDACTED]
```

This corroborates the curl header evidence: **no CSP, no
`X-Content-Type-Options`, no `Referrer-Policy`, no `Permissions-Policy`, no
`X-Frame-Options`/`frame-ancestors`** on the main document as seen by a
real browser (SEC-01, SEC-02), and `max-age=0` + edge `Age` as described
in PERF-02.

## Cookies set (attributes only — values never read, never stored)

| Name | Domain | Path | Secure | HttpOnly | SameSite | Kind | Value length |
|---|---|---|---|---|---|---|---|
| `_ga` | `.cynbit.in` | `/` | **no** | **no** | **not set** | persistent (exp ~2027-11) | 27 |
| `_ga_LK6CQWCWX0` | `.cynbit.in` | `/` | **no** | **no** | **not set** | persistent (exp ~2027-11) | 45 |

- **0 responses carried a `Set-Cookie` header.** Both cookies were written
  to the jar by client-side JavaScript (Google Tag Manager / `gtag`), not
  by the server — consistent with the curl evidence, which saw no
  `Set-Cookie` either.
- **Flag finding (Confirmed):** both cookies are served over HTTPS yet
  were created **without `Secure`, without `HttpOnly`, and without an
  explicit `SameSite`**. They are analytics cookies readable by any script
  on the page, not scoped to `SameSite` explicitly (browsers now default
  to `Lax`, so the practical exposure is limited — that is why this is a
  Low, not a Medium).
- They are **first-party** cookies (domain `.cynbit.in`) written *by* a
  third-party script. `HttpOnly` is not applicable to cookies that
  `gtag` must read back, so the actionable gaps are `Secure` and an
  explicit `SameSite=Lax`.

## Storage (key names only, values not read)

| Store | Keys |
|---|---|
| `localStorage` | `cynbit_newsletter_seen` |
| `sessionStorage` | *(empty)* |
| `document.cookie` | 2 — `_ga_LK6CQWCWX0`, `_ga` (same as the jar above) |

The presence of `cynbit_newsletter_seen` confirms the newsletter popup
component executed client-side on this load — consistent with the earlier
browser observation in `docs/05`. Its value was not read; per the brief
only key names are recorded.

## Also observed in this load (new vs. the curl-only evidence)

- **13 Next.js RSC prefetches** to linked routes (`/team`, `/story`,
  `/services`, `/impact`, `/careers`, `/products`, `/bitelevate`,
  `/bitelevate/paths`, `/case-studies`, `/diaries`, `/contact`, `/blog`,
  `/blog/ai-agents-business-operations`), all `GET 200`. These are normal
  App Router link-prefetch subrequests of a single page load, not separate
  navigations, and are not counted as page loads in `evidence/request-log.txt`.
  They strengthen ARCH-02: **at runtime, on the homepage, no `/api/` call,
  no Server Action POST, and no `/admin/` or `/portal/` request occurred** —
  the only POSTs in the whole capture were the two Google analytics hits.
- **One failed request:** `POST https://analytics.google.com/g/collect…`
  ended `net::ERR_ABORTED` (the capture ended while it was in flight).
  Recorded as-is; no conclusion is drawn from it.
- **Bytes:** the single Material Symbols font (1.11 MB) is the largest
  transfer in the load — more than the entire rest of the page combined.
  This is first-hand support for the performance findings in `docs/03`.

## What was NOT captured

- **No response bodies.** The HAR stores headers, sizes and timings only,
  deliberately: response bodies would embed the site's own contact details
  and RSC payloads, which the redaction rules require to be removed anyway.
- **No TLS version / cipher.** The CDP `Security` domain was not enabled,
  so this capture says nothing about TLS 1.2 vs 1.3. What it does show is
  that Chrome negotiated **`h2` for every request to `www.cynbit.in`** and
  that the origin sends **no `Alt-Svc` header** (third parties do advertise
  `h3`), so HTTP/3 was not available from this origin in this capture.
- **No cookie or storage *values*.** Only names, attributes and lengths.
- **No interaction of any kind**, therefore: no post-click behaviour, no
  newsletter popup dismissal, no form-related requests, no authenticated
  view, and no observation of anything behind `/intern-portal/login`.
- **One load only.** No repeats, so nothing here shows cache behaviour
  across loads; cache claims rest on the three-repeat curl evidence.
- No consent banner was found in the server-rendered HTML and none was
  interacted with (none was needed — there was no interaction at all).
  Whether the site renders a consent banner client-side later, or for
  other regions, is **not** established by this capture.
