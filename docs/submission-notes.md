Passive backend audit of cynbit.in (Next.js on Vercel): anonymous GETs to public pages, one 404 probe, public JS bundles, one no-interaction browser load (HAR), and three Lighthouse runs. No forms submitted, no logins, no scanning. 39 page loads logged in evidence/request-log.txt.

Top findings:
1. No Content-Security-Policy or hardening headers on any response.
2. Forms show only client-side constraints; server-side validation and rate limiting are unverifiable from outside.
3. Mobile Lighthouse performance is 33 (LCP 11.0 s, a 1.11 MB icon font, ~125 KB unused JS).

Also: analytics writes two _ga cookies without Secure/HttpOnly/SameSite; /careers and /sitemap.xml are always edge-cache MISS.

Reproduce: bash scripts/passive_probe.sh, then cd snippets && npm test.

Limits: passive only, so server validation, consent handling, TLS version and anything authenticated remain unverified. Scores vary between runs.
