# Manual browser evidence — to be done in your own Chrome

The audit environment could not run Lighthouse or capture a HAR
(see `docs/01-scope-and-methodology.md` and `docs/05-limitations-and-ethics.md`).
Both take about 10 minutes in a normal desktop Chrome. Do them **before**
submitting, on a normal (not signed-in to Cynbit) Chrome profile, and
without clicking, filling, or submitting anything on the site.

## A. Lighthouse — homepage, mobile + desktop

1. Open Chrome, go to `https://www.cynbit.in/`, and wait for the page to
   finish loading. If the newsletter popup appears, leave it alone —
   do not dismiss it by clicking, just run Lighthouse with the page as
   it is, and note that the popup was present.
2. Open DevTools (`F12` or `Ctrl+Shift+I`), go to the **Lighthouse** tab.
3. Run **Mobile** first: leave the default categories checked
   (Performance, Accessibility, Best Practices, SEO), device = Mobile,
   and click **Analyze page load**.
4. When it finishes, click the download/export icon and save the JSON as
   `evidence/lighthouse/home-mobile.json` in this repo.
   Note the four category scores.
5. Repeat for **Desktop** (device = Desktop) and save as
   `evidence/lighthouse/home-desktop.json`.
6. Add a three-line summary to `docs/02-architecture-analysis.md`
   (or to this file) in this shape — replace the numbers with yours,
   do not copy anyone else's scores:
   - Mobile: Performance X / Accessibility X / Best Practices X / SEO X.
   - Desktop: Performance X / Accessibility X / Best Practices X / SEO X.
   - One sentence on the largest opportunity Lighthouse names
     (for example, a render-blocking resource or an image size), and
     whether it agrees with the curl timings already in `docs/02`.

Do not run Lighthouse on the payment page or on any form page with
data entered. Homepage only, as above.

## B. HAR + cookies + storage — homepage, no interaction

1. In a fresh Chrome tab, open DevTools **before** loading the page
   (`F12`, then go to the **Network** tab and tick **Preserve log** and
   **Disable cache** off — leave cache enabled, so the capture matches
   a normal visit).
2. Go to `https://www.cynbit.in/` and wait for it to finish loading.
   Do not click, scroll excessively, fill, or submit anything.
3. In the Network tab, right-click any request → **Save all as HAR
   with content** → save as `evidence/har/browser-homepage.har`.
4. Go to the **Application** tab:
   - **Cookies** → note, for each cookie, only its **name, domain,
     and flags** (Secure / HttpOnly / SameSite / expiry). Never copy
     a cookie **value** into the repo.
   - **Local Storage** and **Session Storage** → note only the
     **key names** (and which origin they belong to), never values.
   - If there are no cookies or storage keys, write that down —
     "none observed" is a finding, not a gap.
5. Write the summary into `evidence/har/browser-homepage-summary.md`
   in this shape:
   - Total requests, grouped by host, with method + status for any
     request that is not a same-origin document/script/style/image/font.
   - Any `fetch`/`XHR` request: URL, method, status — and whether it
     matches the Server Action picture in `docs/02` (no public REST
     API observed). If an XHR/API call appears that contradicts
     `docs/02` / ARCH-02, flag it for a correction before submitting.
   - Cookies: names + flags only, or "none observed".
   - Storage: key names only, or "none observed".
   - Third-party hosts seen on load (Analytics, Fonts, etc.).

## C. Redact before committing

Before `git add`, check the HAR and the Lighthouse JSON for:

- Email addresses → replace with `<redacted-email>`.
- Phone numbers → replace with `<redacted-phone>`.
- Cookie values, tokens, or any `Authorization` header value →
  replace the value with `<redacted>`, keeping the header/cookie name.
- Your own name, email, or device details, if they appear anywhere
  in the files (for example in a HAR `creator` block, keep the tool
  name but remove personal paths).

A quick check, run from the repo root:

```bash
grep -ri "<your-personal-email>" evidence/lighthouse/ evidence/har/ || echo "no personal email in new evidence"
grep -o -E "[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}" evidence/lighthouse/*.json evidence/har/*.har | grep -v "redacted-email" || echo "no real emails in new evidence"
```

If a HAR still contains a value you cannot safely redact without
destroying the evidence, commit only the summary file
(`browser-homepage-summary.md`) and note in `docs/05` that the raw HAR
was withheld for that reason — do not commit a file you are unsure about.

## D. After you add the files

1. Update `docs/01-scope-and-methodology.md` (Lighthouse is no longer
   "skipped") and `docs/05-limitations-and-ethics.md` (HAR is now
   included, with its summary linked).
2. Re-run `cd snippets && npm test` and `git status` to confirm the
   tree is clean except for the intended new evidence files.
3. Commit the new evidence separately, for example:
   `docs: add Lighthouse JSON and browser HAR summary`.
4. Then push using the commands in the README / final summary.
   Do not push the old history: the history was rewritten to the
   no-reply email (see the repo's git log), so push only from the
   rewritten local repo, and check the remote shows only the
   no-reply author before submitting.

## What not to do in this step

- Do not sign in to Cynbit, the intern portal, or any account.
- Do not fill or submit the contact, products, or BitElevate forms,
  and do not start a payment.
- Do not dismiss the newsletter popup by clicking it if that would
  submit an email address — just note that it appeared.
- Do not run Lighthouse in a loop or reload the page repeatedly;
  one mobile run and one desktop run is enough.
