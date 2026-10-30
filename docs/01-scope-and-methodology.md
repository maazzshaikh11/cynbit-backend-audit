# 1. Scope and methodology

## Target and permission

Target: `https://www.cynbit.in` (apex `cynbit.in` redirects to `www`).
This audit was **passive and anonymous only**, as instructed in the assessment
brief. No form was submitted, no login was attempted, no credentials were
used, and no request was made that a normal visitor would not make by
loading a public page.

## What was collected

| Method | Detail |
|---|---|
| `curl` (anonymous GET, `--compressed`) | Headers, HTML, and timing for each page below, 3 spaced repeats each |
| Redirect checks (GET, no follow) | `http://cynbit.in/`, `http://www.cynbit.in/`, `https://cynbit.in/` |
| Single probes | One non-existent URL (`/this-page-does-not-exist-audit-404`), `/.well-known/security.txt` |
| Public static assets | The 3 page JS bundles referenced by `/contact`, `/products`, and `/bitelevate` (see `evidence/bundles/`) |
| Browser load | One normal homepage load via headless Chrome over the CDP (fresh profile, no clicks, no form interaction): 54 requests captured as a redacted HAR (see `evidence/har/`) |
| Lighthouse | Lighthouse 12.8.2 against the live site with local Chrome 156: mobile + desktop on `/`, desktop on `/careers` (see `evidence/lighthouse/`) |

Pages collected (all publicly linked from the homepage or named in the brief):

`/`, `/contact`, `/careers`, `/services`, `/products`, `/bitelevate`,
`/robots.txt`, `/sitemap.xml`.

Additional pages linked from those pages (for example `/story`, `/team`,
`/blog/*`, `/careers/*`, `/bitelevate/paths`) were **not** fetched
deliberately, to stay well inside the request budget. Their existence is
recorded only where `evidence/html/*-r1.html` or
`evidence/html/sitemap_xml-r1.html` already lists them.

One nuance from the browser load: a normal homepage load in a real
browser triggers Next.js App Router **link prefetches** — 13 RSC payload
requests for linked routes were observed as subrequests of that single
load (`evidence/har/homepage.har`). Those are the framework doing what it
does for any visitor; no link was clicked, no route was opened, and they
are not counted as page loads. Their HTTP status (all 200) is recorded
because it was observed, not because the routes were probed.

## Rate limiting and request count

- At least 2 seconds between curl requests; no parallel requests.
- User-Agent for curl: `passive-audit/1.0 (internship assessment; contact: <my email placeholder>)`.
- Request log: `evidence/request-log.txt` — **42 entries** at the time of
  writing: 33 original curl/TLS entries, 8 Lighthouse page navigations
  (4 runs × warmup + measured), and 1 browser-load navigation.
- Page loads (document navigations to the target): **39 of the 40
  allowed**, counted conservatively — 29 curl document loads (3
  redirects, 18 pages, 3 `robots.txt`, 3 `sitemap.xml`, the 404 probe,
  the `security.txt` probe), 1 TLS-observation GET of the homepage,
  8 Lighthouse navigations, and 1 browser navigation. The 13 App Router
  RSC prefetches in the HAR are subrequests of that single browser load,
  not separate navigations; the 3 JS-bundle fetches are asset requests,
  not page loads. **No further requests to the target were made after
  this point**, to stay inside the budget.
- Browser and Lighthouse subresource requests (JS, CSS, fonts, analytics)
  are recorded in their own artifacts (`evidence/har/`,
  `evidence/lighthouse/`), not in the curl log; they are normal page-load
  traffic, not probe traffic.
- Total log entries: **42**, well under the 100-request budget.

## Reproducing the collection

```bash
bash scripts/passive_probe.sh
python3 scripts/analyze_headers.py evidence/headers
python3 scripts/analyze_html.py evidence/html
python3 scripts/analyze_bundles.py evidence/bundles
cd snippets && npm test
```

`scripts/passive_probe.sh` contains the exact URL list that was collected.
Re-running it today will produce different timings and cache states, which
is expected: timings and `Age`/`X-Vercel-Cache` values are observations at
collection time (29 Oct 2026, ~21:27 UTC), not permanent properties.

To re-run the two new evidence types yourself (each costs page loads —
do not do this against the target if you are inside a request budget):

```bash
# Lighthouse (needs Chrome): two runs for the two committed home files
npx lighthouse@12 https://www.cynbit.in/ --output=json \
  --output-path=mobile-home.json --form-factor=mobile --screenEmulation.mobile
npx lighthouse@12 https://www.cynbit.in/ --output=json \
  --output-path=desktop-home.json --preset=desktop
# HAR: any DevTools "Export HAR" on one normal homepage load, then redact
# cookie values and x-vercel-id before committing (see evidence/har/README.txt)
```

## Redaction applied to evidence

Saved evidence was redacted **before committing** so the public repository
contains no contact details or request identifiers:

- Email addresses in saved HTML/bundles replaced with `<redacted-email>`.
- Telephone numbers in saved HTML and structured data replaced with
  `<redacted-phone>`; one `tel:+91…` URI that had been missed in the
  contact-page bundle was caught and replaced with `[REDACTED-PHONE]` in
  the same pass as the Lighthouse commit.
- `X-Vercel-Id` values replaced with `<redacted>` in the curl set and
  with `[REDACTED]` in the HAR.
- In `evidence/har/homepage.har`: cookie values, Google analytics client
  ids, and `x-vercel-id` are `[REDACTED]`; response bodies are not stored
  at all; cookie/storage values were never read, only attributes and key
  names.
- In `evidence/lighthouse/*.json`: no email or phone-number pattern
  appears (checked); the Google measurement ID `G-LK6CQWCWX0` present
  there is the site's own public ID, already in its HTML, not a secret.
- The header analyser (`scripts/analyze_headers.py`) prints cookie names
  and flags only, never cookie values. No `Set-Cookie` header was
  observed in any curl response or in any of the 54 responses of the
  browser load (see `docs/03-findings.md`, SEC-07).

Redaction does not affect any finding: no finding depends on an email
address, a phone number, a cookie value, or a Vercel request ID.

## Lighthouse: run, with one honest caveat

Lighthouse 12.8.2 was run against the live site using the Chrome installed
on this machine (Chrome 156, headless, attached over the DevTools
protocol). Three runs are committed as raw JSON in `evidence/lighthouse/`:
mobile and desktop on `/`, desktop on `/careers`. Scores, Core Web Vitals,
device settings and the top opportunities are summarised in
`evidence/lighthouse/summary.md`; that summary states explicitly that
scores vary between runs.

The first mobile attempt failed part-way with Lighthouse
`PROTOCOL_TIMEOUT` on the `ResponseCompression` gatherer (only the
`uses-text-compression` audit was affected; all metrics and category
scores were still produced). Rather than quote a run with a known error,
Chrome was restarted and the run repeated cleanly — the committed
`mobile-home.json` reports no `runtimeError` and no errored audits. The
failed attempt is recorded in `evidence/request-log.txt` and is not
quoted anywhere.

## TLS / HTTP-version limitation

Curl in the collection environment went through a sandbox egress proxy
(`CONNECT www.cynbit.in:443`, `HTTP/1.1 200 Connection Established`).
The TLS handshake curl reports (TLS 1.3, sandbox CA) is therefore the
proxy's, **not** the origin's, and ALPN negotiated `http/1.1` through the
proxy. The curl evidence makes **no claim** about the origin's TLS
version, certificate, or HTTP/2/HTTP/3 support.

The later browser capture adds one narrow, separate fact: Chrome
negotiated **HTTP/2 (`h2`) for all 54 requests** to `www.cynbit.in`
(`evidence/har/homepage.har`, `protocol: h2`), and the origin sent **no
`Alt-Svc` header**, so HTTP/3 was not offered by this origin during that
capture (Google's own endpoints did advertise `h3`). The CDP `Security`
domain was not enabled, so **TLS version and cipher suite are still not
claimed** anywhere in this repo. See `docs/05-limitations-and-ethics.md`.

## Tools

Collection environment (original curl pass, 29 Oct 2026): `curl 8.5.0`,
`python3 3.12`, `node 24`, `git`.

Lighthouse/HAR environment (this machine, 30 Oct 2026): `Google Chrome
156.0.8078.74` (headless, over CDP), `lighthouse 12.8.2` via `npx`,
`node 20.20.0`, `curl 8.7.1`, `python3 3.14.7`, `git 2.39.5`,
`puppeteer-core` (driver only, kept outside the repo).

No vulnerability scanner, fuzzer, port scanner, or load-testing tool was
used at any point.
