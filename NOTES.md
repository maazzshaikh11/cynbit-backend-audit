# Working notes (temporary — fold into docs/05 before final commit)

## Decisions
- Repo created at `~/workspace/cynbit-backend-audit/`; NOT pushed (user will publish).
- Global git config was unset (`~/.gitconfig` missing). Local repo author set from
  the author's own prior repo commit (`git -C ~/workspace/devassist log -1`):
  Muaz Shaikh <[redacted-email]>. Flag for manual verification before submit.
- User-Agent uses a placeholder contact, not the real email, so the public repo
  contains no personal email: `passive-audit/1.0 (internship assessment; contact: <my email placeholder>)`.
- No other candidates' Cynbit audits/repos were searched, read, or copied.
  Recommendations cite only public docs (MDN / OWASP / RFC / vendor docs).
- Chrome found at `/opt/meta-chromium/chrome` (Muse Browser 155). Lighthouse via
  npx was slow to resolve; will try with CHROME_PATH set, otherwise record as
  skipped (not faked).

## Uncertainties (to resolve during Phase 1)
- Exact linked-page set: confirm from homepage HTML which of /contact, /careers,
  /services, /products, /bitelevate exist and what else is linked from them.
- Whether the site is Next.js/Vercel, WordPress, or something else: decide ONLY
  from headers/HTML/bundle evidence, not from guessing.
- Whether a normal browser load makes any API/XHR calls: record from HAR only;
  do NOT call any API URL seen in a bundle unless the page itself calls it.
- Request budget: target <= ~60 total curl/browser requests, >= 2 s apart.

## Request log
- Maintained in `evidence/request-log.txt` (appended by scripts/passive_probe.sh).
- Count checked before final commit; must stay under 100.
