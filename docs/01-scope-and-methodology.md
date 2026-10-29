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
| Browser load | One normal homepage load via the Muse browser, no clicks and no form interaction (see `evidence/har/` note in §5) |
| Lighthouse | Attempted, **not available** in this environment (see below) |

Pages collected (all publicly linked from the homepage or named in the brief):

`/`, `/contact`, `/careers`, `/services`, `/products`, `/bitelevate`,
`/robots.txt`, `/sitemap.xml`.

Additional pages linked from those pages (for example `/story`, `/team`,
`/blog/*`, `/careers/*`, `/bitelevate/paths`) were **not** fetched, to stay
well inside the request budget. Their existence is recorded only where
`evidence/html/*-r1.html` or `evidence/html/sitemap_xml-r1.html` already
lists them.

## Rate limiting and request count

- At least 2 seconds between curl requests; no parallel requests.
- User-Agent for curl: `passive-audit/1.0 (internship assessment; contact: <my email placeholder>)`.
- Curl request log: `evidence/request-log.txt` (33 lines at the time of
  writing, including 3 bundle fetches and 1 TLS-observation request).
  The browser load's asset requests are recorded separately in
  `evidence/har/browser-homepage.json` when available; they are normal
  page-load requests, not probe traffic, and are not counted in the curl log.
- Total curl requests: **under 100**, as required.

## Reproducing the collection

```bash
bash scripts/passive_probe.sh
python3 scripts/analyze_headers.py evidence/headers
python3 scripts/analyze_html.py evidence/html
python3 scripts/analyze_bundles.py evidence/bundles
```

`scripts/passive_probe.sh` contains the exact URL list that was collected.
Re-running it today will produce different timings and cache states, which
is expected: timings and `Age`/`X-Vercel-Cache` values are observations at
collection time (29 Oct 2026, ~21:27 UTC), not permanent properties.

## Redaction applied to evidence

Saved evidence was redacted **before committing** so the public repository
contains no contact details or request identifiers:

- Email addresses in saved HTML/bundles replaced with `<redacted-email>`.
- Telephone numbers in structured data replaced with `<redacted-phone>`.
- `X-Vercel-Id` values replaced with `<redacted>`.
- The header analyser (`scripts/analyze_headers.py`) prints cookie names
  and flags only, never cookie values. No `Set-Cookie` header was observed
  in any curl response in any case (see `docs/03-findings.md`, AUTH-01).

Redaction does not affect any finding: no finding depends on an email
address, a phone number, or a Vercel request ID.

## Lighthouse: skipped, not faked

Lighthouse was attempted with `npx lighthouse` and
`CHROME_PATH=/opt/meta-chromium/chrome`. Both attempts failed in this VM
because the managed Chrome refuses headless startup outside the Muse
browser:

> `Hatch WebGL domain policy is required for browser startup`

No Lighthouse JSON is therefore included, and no Lighthouse score is
quoted anywhere in this repository. Performance findings rest on curl
timings, transfer sizes, and header/cache evidence only. A reviewer can
re-run Lighthouse from a normal desktop browser against the live site;
that was not possible from this environment, and inventing scores would
have violated the no-fabrication rule.

## TLS / HTTP-version limitation

Curl in this environment goes through a sandbox egress proxy
(`CONNECT www.cynbit.in:443`, `HTTP/1.1 200 Connection Established`).
The TLS handshake curl reports (TLS 1.3, sandbox CA) is therefore the
proxy's, **not** the origin's, and ALPN negotiated `http/1.1` through the
proxy. This audit therefore makes **no claim** about the origin's TLS
version, certificate, or HTTP/2/HTTP/3 support. See
`docs/05-limitations-and-ethics.md`.

## Tools

`curl 8.5.0`, `python3 3.12`, `node 24`, `git`. No vulnerability scanner,
fuzzer, port scanner, or load-testing tool was used.
