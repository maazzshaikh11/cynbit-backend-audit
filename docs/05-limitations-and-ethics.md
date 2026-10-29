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

## Browser-load evidence: limited

A normal homepage load was performed via the Muse browser (title
confirmed: "Cynbit Technologies | AI Automation & Software Solutions
Jaipur"), but the browser task's network/cookie/storage report was not
returned before this report was finalised (the window state showed
"failed" after loading). The direct headless-Chrome route was also
unavailable in this VM (see §1, Lighthouse). Consequently:

- No HAR file is included in `evidence/har/`. The directory is kept in
  the repo structure for a reviewer who re-runs a browser load.
- No claim is made in this report about cookies set by a browser load,
  localStorage keys, or XHR calls during a browser load. The only network
  claims are from curl (headers/HTML/timings) and from static bundle
  analysis, both saved in `evidence/`.
- If a reviewer re-runs a browser load and finds an XHR/API call that
  contradicts §2.2 ("no public API observed"), §2.2 and ARCH-02 should be
  corrected — the static-analysis claim is about the bundles analysed,
  not about every possible runtime request.

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
