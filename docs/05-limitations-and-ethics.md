# 5. Limitations and ethics

## What passive testing cannot reveal

- **Server code, database, and CRM.** Where form submissions go, how they
  are validated server-side, and how they are stored are invisible from
  outside. Findings VAL-01 and VAL-02 are therefore framed as
  "confirmed on the client, hypothesis on the server", not as proven
  server defects.
- **Authentication internals.** The intern portal (`/intern-portal/login`)
  was not visited beyond noting its link in a public bundle, and no login
  was attempted. Session handling, password storage, and authorisation
  are unaudited.
- **Payment internals.** Cashfree order creation and verification are
  Server Actions that were never invoked. Whether amounts, order IDs, and
  tokens are validated server-side cannot be determined passively.
- **Authenticated or personalised behaviour.** All requests were
  anonymous. Any behaviour that differs for logged-in users, or after
  interaction (for example a client-rendered consent banner), was not
  observed.
- **Performance under load.** No load testing was performed, as required.
  Timings are single-visitor observations from one environment, not
  capacity measurements.
- **Origin TLS and HTTP/2/3.** Curl in this environment goes through a
  sandbox egress proxy, so origin TLS version, certificate, and HTTP
  version support cannot be verified here (see `docs/01-scope-and-methodology.md`).
- **Pages not fetched.** Only the pages listed in §1 were fetched.
  Conclusions about `/blog/*`, `/careers/*`, `/case-studies/*`, and other
  linked pages rest on sitemap/HTML listings, not on direct observation
  of those pages.

## Browser-load evidence: what it now covers

Two kinds of browser evidence exist in this repo, both collected
**passively** — no clicks, no scrolling, no form interaction, popup
untouched.

**1. Network capture (`evidence/har/`).** One homepage load through
headless Chrome over the Chrome DevTools Protocol, from a fresh empty
profile, recorded 54 requests as a redacted HAR plus a structured
summary. It confirms at runtime what the curl pass showed (no CSP, no
other hardening headers, `max-age=0` + edge `Age`) and adds what curl
could not see: which third parties are actually contacted (`gtag`,
`analytics.google.com`, DoubleClick, `google.co.in/ads/ga-audiences`, two
Google Fonts hosts), that two `_ga*` cookies are written client-side with
no `Secure`, `HttpOnly` or explicit `SameSite` flag, that the only
`localStorage` key is `cynbit_newsletter_seen`, and that no `/api/`,
Server Action, or admin/portal request fires during a normal visit.

**2. Lighthouse (`evidence/lighthouse/`).** Mobile and desktop runs on
the homepage plus a desktop run on `/careers`, raw JSON committed,
summarised with device settings and a "scores vary between runs" note.

**Earlier observation kept for completeness:** an earlier passive browser
session saw the page title and hero render normally, and then an
automatic newsletter popup ("THE ARCHITECT'S DIGEST") appear over a
blurred homepage. It was **not** clicked or dismissed, since interaction
was not authorised. That popup text does not appear in the
server-rendered homepage HTML (`evidence/html/home-r1.html`), so it is
client-rendered or time-delayed — a further data-collection surface that
was never exercised and is not assessed in `docs/03`. The HAR capture's
`cynbit_newsletter_seen` localStorage key independently confirms that
this component runs on load.

What neither capture can show, and what no claim is made about:

- **Consent.** No consent banner or CMP was found in the server HTML and
  none appeared during the 12-second capture. Whether one renders later,
  is region-gated, or does not exist is **not** established — this is
  recorded as Hypothesis in VAL-02, not as "the site has no consent
  mechanism".
- **The newsletter popup's behaviour.** Its existence is evidenced by the
  `cynbit_newsletter_seen` key and by an earlier observation of the popup
  itself; it was never clicked or dismissed, so its submission flow was
  never exercised.
- **TLS version, cipher, HTTP/3.** The CDP `Security` domain was not
  enabled. Only `h2` negotiation and the absence of `Alt-Svc` are claimed
  (§1).
- **Anything post-interaction or authenticated** — including the intern
  portal, form error handling, and what a Server Action returns.
- **Repeatability.** One load only, so the HAR says nothing about cache
  behaviour across loads; cache claims rest on the three-repeat curl set.

Earlier drafts of this report stated that no HAR and no Lighthouse data
were available in the audit environment. That was true then and is now
superseded by the two artifacts above; every document in this repo has
been updated to match.

## Ethics and handling of findings

- Only publicly linked pages and public static assets were requested.
- No attempt was made to exploit, disrupt, overload, or gain unauthorised
  access to any Cynbit system, and no form, login, or payment flow was
  submitted or completed.
- No credential-like string or personal data was found in the bundles
  analysed. Had one been found, it would have been redacted and reported
  only as "a credential-like string was observed" with its location type,
  with a rotation recommendation — per the brief. That situation did not
  arise.
- Contact details that the site itself publishes were redacted from
  saved evidence before committing (see §1), to avoid republishing them
  in this repository.
- Other candidates' audits or repositories of Cynbit were not searched,
  read, or copied. All findings come from the evidence in `evidence/`.
  Recommendation guidance cites public documentation (MDN, OWASP, RFC
  9116, RFC 9457, Next.js and Vercel docs) — see the snippet comments.

## Working notes

A temporary `NOTES.md` was kept during collection to record decisions
and uncertainties. Its substance is folded into this document and into
§1; the file itself is removed before the final commit, so the published
repository contains only the finished docs.
