# Browser evidence — captured, and how to re-check it

**Status: done.** The first draft of this submission said Lighthouse and
a HAR could not be produced in the audit environment. That is obsolete:
both were captured on 30 Oct 2026 from a normal, passive page load in
headless Chrome, with no clicks, no form interaction, and the newsletter
popup untouched:

| Evidence | Files | What it shows |
|---|---|---|
| Lighthouse (12.8.2, Chrome 156) | `evidence/lighthouse/mobile-home.json`, `desktop-home.json`, `desktop-careers.json`, `summary.md` | Scores, Core Web Vitals, device settings, top opportunities |
| One browser load via CDP | `evidence/har/homepage.har`, `homepage-network-summary.md`, `README.txt` | 54 requests, headers, third parties, cookie flags, storage key names |

This file is kept for reviewers who want to reproduce or double-check
either capture. Everything below is optional verification, not a missing
step of the audit.

## A. Re-running Lighthouse (optional)

1. On a normal desktop Chrome, open `https://www.cynbit.in/`. If the
   newsletter popup appears, leave it alone — do not dismiss it.
2. DevTools (`F12`) → **Lighthouse** tab → leave the default categories
   (Performance, Accessibility, Best Practices, SEO) → device **Mobile**
   → **Analyze page load**.
3. Export the JSON and compare it against
   `evidence/lighthouse/mobile-home.json`.
4. Repeat with device **Desktop**.

**Expect different numbers.** Scores vary between runs by several points
on Performance and by hundreds of milliseconds on the metrics; that is
stated in `evidence/lighthouse/summary.md`. A reviewer's run agreeing
with ours to the point is not the test — the direction (mobile far worse
than desktop, unused JS and the icon font as the top opportunities) is.

Do not run Lighthouse on the payment page or on any form page with data
entered. Homepage only.

## B. Re-capturing a HAR (optional)

1. Fresh Chrome tab, DevTools open **before** loading the page, Network
   tab, **Preserve log** on, cache left **enabled** (so it matches a
   normal visit).
2. Load `https://www.cynbit.in/` once. Do not click, scroll
   excessively, fill, or submit anything.
3. Right-click any request → **Save all as HAR with content**.
4. Application tab → **Cookies**: record name, domain, and flags
   (Secure / HttpOnly / SameSite / expiry) only. **Local Storage** and
   **Session Storage**: key names only. Never copy a value into the repo.

Then compare with `evidence/har/homepage.har`. Two things worth checking
specifically:

- Whether the two `_ga*` cookies still lack `Secure`, `HttpOnly`, and an
  explicit `SameSite` (SEC-07).
- Whether any `/api/`, Server Action, or admin/portal request fires on a
  normal load. If one appears, `docs/02` §2.2 and ARCH-02 need
  correcting before submitting — the claim is about what was observed,
  and new observation should win.

## C. Redaction before committing

The committed files were already redacted; if you regenerate them, run
the same pass:

- Email addresses → `<redacted-email>`; phone numbers → `<redacted-phone>`.
- Cookie values, tokens, any `Authorization` header value → `<redacted>`,
  keeping the name. In the HAR: `x-vercel-id` and Google client ids too
  (that is what `[REDACTED]` marks in the committed file).
- Your own name, email, or machine paths if they appear (e.g. a HAR
  `creator` block).

Quick check from the repo root:

```bash
grep -riE "muazshaikh7861|@gmail\.com" evidence/lighthouse/ evidence/har/ || echo "no personal email in new evidence"
grep -oE "[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}" evidence/lighthouse/*.json evidence/har/*.har | grep -v redacted || echo "no real emails in new evidence"
```

If a regenerated HAR contains a value you cannot redact safely without
destroying the evidence, commit only a summary and note the withholding
in `docs/05` — do not commit a file you are unsure about.

## What not to do in this step

- Do not sign in to Cynbit, the intern portal, or any account.
- Do not fill or submit the contact, products, or BitElevate forms, and
  do not start a payment.
- Do not dismiss the newsletter popup by clicking it if that would submit
  an email address — just note that it appeared.
- Do not run Lighthouse in a loop or reload repeatedly. One mobile run
  and one desktop run is enough; further runs cost the target page loads.
