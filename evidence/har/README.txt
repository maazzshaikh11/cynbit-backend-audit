Captured: 2026-10-30T16:26:43Z — one passive homepage load of
https://www.cynbit.in/ via headless Chrome 156 over the Chrome DevTools
Protocol (fresh empty profile, first-visit state), no clicks, no scrolling,
no form interaction, newsletter popup untouched.

WHAT IS IN THIS DIRECTORY

  homepage.har                    Redacted HAR 1.2 (54 entries): URL,
                                  method, status, resource type, encoded
                                  size, timing and response headers for
                                  every request of that load. Response
                                  bodies are deliberately NOT included.

  homepage-network-summary.md     The same capture as readable markdown:
                                  totals, the 6 third-party requests,
                                  main-document headers, cookie
                                  attributes, storage key names, and an
                                  explicit "what was NOT captured" list.

WHAT WAS CAPTURED
  - All 54 requests (52x 200, 2x 204, 1 aborted Google POST).
  - Response headers of the main document (CSP absent, as in the curl set).
  - Third-party hosts: fonts.gstatic.com, googletagmanager.com,
    fonts.googleapis.com, analytics.google.com, stats.g.doubleclick.net,
    www.google.co.in — all contacted with zero user interaction.
  - Cookies: 2 (_ga, _ga_LK6CQWCWX0), attributes only. Both lack Secure,
    HttpOnly and an explicit SameSite. 0 Set-Cookie headers — both were
    written client-side by gtag.
  - Storage: localStorage key NAME "cynbit_newsletter_seen"; sessionStorage
    empty. Values never read.

WHAT WAS NOT CAPTURED / REDACTED
  - Cookie and storage VALUES, x-vercel-id values, and Google analytics
    client ids are replaced with [REDACTED] in the HAR.
  - Response bodies (would contain the site's own contact details).
  - TLS version/cipher (CDP Security domain not enabled). Chrome did
    negotiate h2 for every request; the origin sent no Alt-Svc header.
  - No form submission, no login, no click of any kind, one load only.

Earlier limitation note: no HAR was available in the first version of this
submission. That is now superseded by the capture above. See
docs/05-limitations-and-ethics.md for the ethics framing.
