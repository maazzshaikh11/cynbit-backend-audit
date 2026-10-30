# Cynbit Technologies — Backend Technical Audit

A passive, evidence-backed backend audit of the public website
[https://www.cynbit.in](https://www.cynbit.in), prepared as a Backend
Developer Intern assessment. Every finding cites a saved evidence file;
nothing was submitted, logged into, scanned, or load-tested, and no
Server Action, API, or payment flow was ever invoked.

**In one paragraph:** the site is a Next.js App Router site on Vercel
whose public surface is prerendered marketing pages plus three Server
Actions (`submitInquiry`, `submitServiceLead`, and BitElevate's Cashfree
order/verification actions). Its HTTPS redirects, HSTS, Brotli
compression, edge caching, and 404 handling are sound, but it sends no
Content-Security-Policy or other hardening headers, its forms show only
client-side constraints with server-side validation unobservable from
outside, its mobile Lighthouse run scores 33 (a 1.11 MB icon font and
~125 KB of unused JavaScript), and its two always-dynamic routes
(`/careers`, `/sitemap.xml`) never benefit from edge caching. The
recommendations are therefore small, concrete, and proportionate: add
global security headers, validate and rate-limit Server Actions
server-side, subset the icon font, and make caching and canonicalisation
explicit — all with tested code in `snippets/`.

## Scope and ethics

- **Allowed only:** anonymous GET requests to publicly linked pages
  (`/`, `/contact`, `/careers`, `/services`, `/products`, `/bitelevate`),
  `/robots.txt`, `/sitemap.xml`, one 404 probe, one `security.txt` probe,
  the public JS bundles those pages reference, plus three Lighthouse runs
  and one no-interaction browser load (each a normal page load).
- **Rate limit:** at least 2 seconds between requests, no parallel
  requests; **39 page loads** and **42 log entries** in
  `evidence/request-log.txt` (budgets: <40 loads, <100 entries).
- **Forbidden and not done:** form submissions, login attempts, fuzzing,
  brute-forcing, port scans, vulnerability scanners, payload injection,
  load testing, guessing non-public paths, or calling any API/Server
  Action observed in a bundle. No click, scroll, or popup dismissal in
  the browser capture either.
- **Redaction:** public contact details, cookie/client values, and
  Vercel request IDs in saved evidence were redacted before committing.
  No secret or credential-like string was found in any bundle analysed.
- Full methodology, including the TLS limitations of this environment
  and what the browser/Lighthouse captures can and cannot show, is in
  `docs/01-scope-and-methodology.md` and `docs/05-limitations-and-ethics.md`.

## Top 5 findings

| ID | Finding | Severity |
|---|---|---|
| SEC-01 | No Content-Security-Policy on any of the 29 header responses (and none in the browser capture), while the site loads Google Tag Manager, Google Fonts, and (on BitElevate) Cashfree | Medium |
| VAL-01 | Forms show only `required` + `type=email` client-side; no `maxlength`, `pattern`, or `autocomplete`, and server-side validation / rate limiting / spam controls cannot be verified passively | Medium |
| PERF-05 | Mobile Lighthouse performance is 33: LCP 11.0 s, TBT 3.0 s, a single 1.11 MB icon font, ~125 KB unused JavaScript, render-blocking Google Fonts CSS (desktop scores 77) | Medium |
| SEC-02 | All other hardening headers missing (nosniff, frame-ancestors, Referrer-Policy, Permissions-Policy, COOP/CORP) | Low |
| SEC-07 | Analytics cookies `_ga` / `_ga_LK6CQWCWX0` set client-side with no `Secure`, no `HttpOnly`, no explicit `SameSite` (0 `Set-Cookie` headers anywhere) | Low |

Full findings, with evidence, impact, fix, and effort for each, are in
`docs/03-findings.md`. The prioritised roadmap is in
`docs/04-recommendations.md`.

## How to reproduce

```bash
# 1. Re-collect evidence (rate-limited, read-only; see docs/01)
bash scripts/passive_probe.sh

# 2. Analyse what was saved
python3 scripts/analyze_headers.py evidence/headers
python3 scripts/analyze_html.py evidence/html
python3 scripts/analyze_bundles.py evidence/bundles

# 3. Run the snippet tests (no dependencies, Node >= 18)
cd snippets && npm test
# Python mirror of the error-envelope test (pytest if installed,
# otherwise the file runs standalone with the standard library):
python3 tests/test_problem.py
```

Lighthouse 12.8.2 was run against the live site in this environment
(mobile + desktop on `/`, desktop on `/careers`); the raw JSON is in
`evidence/lighthouse/` with a summary that notes **scores vary between
runs**. One homepage browser load produced the redacted HAR in
`evidence/har/`. Re-running either costs the target page loads — steps
and redaction checks are in
`docs/manual-browser-evidence-checklist.md`.

## Repository map

```text
README.md                     This file
docs/
  01-scope-and-methodology.md  What was (and was not) tested, and how to re-run it
  02-architecture-analysis.md  Observed vs inferred stack, API surface, timings
  03-findings.md              Categorised findings with evidence and fixes
  04-recommendations.md       Prioritised roadmap + target architecture
  05-limitations-and-ethics.md What passive testing cannot reveal
  submission-notes.md         Short text for the submission portal
  manual-browser-evidence-checklist.md  How to re-check the Lighthouse + HAR captures
scripts/
  passive_probe.sh            Rate-limited, read-only collector
  analyze_headers.py          Security-header scorecard from saved headers
  analyze_html.py             Forms, scripts, links, third parties from saved HTML
  analyze_bundles.py          Static analysis of saved public JS bundles
evidence/
  headers/  html/  timings/  bundles/   Raw saved responses (redacted, see docs/01)
  header-scorecard.txt  bundle-analysis.txt  html-inventory.txt  request-log.txt
  lighthouse/       3 raw Lighthouse JSON runs + summary.md
  har/              Redacted homepage HAR + network summary + README.txt
snippets/
  security-headers/  Next.js headers() config + Express/Helmet equivalent
  api-validation/    Server-side validation for the three Server Actions
  error-envelope/    RFC 9457 problem+json error format
  rate-limiting/     Sliding-window limiter (in-memory; Redis notes included)
  caching/           Cache-Control strategy by route type
  tests/             15 Node tests + 1 Python test, all passing at submission time
```

## Limitations

Passive testing cannot reveal server code, database/CRM destinations,
server-side validation, rate limiting, authentication internals, or
payment validation. Those areas are labelled as hypotheses where they
appear, never as proven defects. The browser capture was one load of one
page with zero interaction, so it cannot establish consent behaviour,
post-login behaviour, or cache behaviour across loads; the Lighthouse
numbers are one lab run each and **vary between runs**. TLS version and
cipher are not claimed (only `h2` negotiation and no `Alt-Svc` were
observed). See `docs/05-limitations-and-ethics.md`.
