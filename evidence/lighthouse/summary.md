# Lighthouse summary

Raw JSON in this directory: `mobile-home.json`, `desktop-home.json`,
`desktop-careers.json`.

**Scores vary between runs.** Lighthouse is a lab measurement with
simulated throttling; two runs of the same page on the same day routinely
differ by several points on Performance and by hundreds of milliseconds on
the metric timings. Treat the numbers below as one observation each, not
as a property of the site. The category scores are rounded to the nearest
integer from the raw JSON.

## Runs

| File | URL | Form factor | Lighthouse | Fetch time (UTC) | Runtime error |
|---|---|---|---|---|---|
| `mobile-home.json` | `https://www.cynbit.in/` | mobile (412×823, DSF 1.75, 4× CPU) | 12.8.2 | 2026-10-30T16:12:56Z | none |
| `desktop-home.json` | `https://www.cynbit.in/` | desktop preset | 12.8.2 | 2026-10-30T16:16:07Z | none |
| `desktop-careers.json` | `https://www.cynbit.in/careers` | desktop preset | 12.8.2 | 2026-10-30T16:20:26Z | none |

Device settings, from each file's `configSettings`:

- **Mobile:** `formFactor: mobile`, screen emulation 412×823 at device
  scale factor 1.75, simulated throttling `rttMs 150`,
  `throughputKbps 1638.4` (down 1474.56 / up 675), CPU slowdown 4×.
- **Desktop:** `formFactor: desktop`, `--preset=desktop` (no simulated
  throttling beyond the preset's own settings — see the raw JSON for the
  exact `configSettings.throttling` values).

Both runs were made with headless Chrome 156.0.8078.74 attached over the
DevTools protocol, categories Performance / Accessibility / Best Practices
/ SEO, no form interaction, no clicks — a plain page load.

## Scores

| Category | Mobile — home | Desktop — home | Desktop — /careers |
|---|---|---|---|
| Performance | **33** | **77** | **87** |
| Accessibility | **82** | **82** | **90** |
| Best Practices | **100** | **100** | **100** |
| SEO | **100** | **100** | **100** |

## Core Web Vitals and load metrics

| Metric | Mobile — home | Desktop — home |
|---|---|---|
| LCP | 11,005 ms (fail) | 2,151 ms (good) |
| CLS | 0.013 (good) | 0.002 (good) |
| TBT (lab proxy for INP) | 3,009 ms (fail) | 0 ms (good) |
| FCP | 2,671 ms | 1,791 ms |
| Speed Index | 8,589 ms | 2,597 ms |
| TTI | 11,005 ms | 2,155 ms |

Desktop `/careers` for comparison: LCP 2,166 ms, CLS 0.003, TBT 118 ms,
FCP 573 ms. It scores **higher than the homepage on desktop (87 vs 77)**
even though it is the route that is always `X-Vercel-Cache: MISS` —
which fits PERF-01's framing: `/careers` is slow at the *edge/origin*
step (TTFB, measured with curl), not in the browser, so a desktop
Lighthouse run against a warm origin does not penalise it.

INP is a field metric; Lighthouse does not measure it directly, so
**Total Blocking Time is reported as the lab proxy** and no INP value is
claimed. LCP element on the mobile run was the hero paragraph
(`div.lg:col-span-7 > div > div > p.text-base`), not an image.

## Top 3 opportunities (mobile run)

1. **Reduce unused JavaScript** — Lighthouse score 0, est. **750 ms**
   savings and **~125 KB** of unused bytes across the loaded bundles.
   This is the single largest lever in the run.
2. **Avoid serving legacy JavaScript to modern browsers** — score 0,
   est. **150 ms** and **~11.6 KB** (transpiled/polyfilled code shipped
   to modern browsers).
3. **Eliminate render-blocking resources** — score 0.5; the two
   render-blocking stylesheets are `fonts.googleapis.com`
   (Material Symbols CSS, ~1,029 ms wasted on the mobile run) and
   `/_next/static/css/ab1584e3d32cd2d2.css` (~680 ms wasted).

On the desktop run the same three opportunities appear in the same
order by bytes, with much smaller time estimates (unused JS ~40 ms) —
consistent with the mobile run's CPU/network throttling doing the
damage rather than raw transfer size alone.

## Interpretation notes

- The mobile Performance score of 33 sits next to a Best Practices
  score of 100: the site is *correctly built* but *heavy for a throttled
  phone*. The findings in `docs/03-findings.md` (PERF-03, and the
  new Lighthouse-derived entry) reflect that framing.
- Accessibility 82 is driven by contrast and link-name audits in the
  raw JSON; this audit did not treat accessibility as in scope beyond
  recording the score.
- A first attempt at the mobile run ended with a Lighthouse
  `PROTOCOL_TIMEOUT` in the `ResponseCompression` gatherer (only
  `uses-text-compression` was affected; all metrics and the four
  category scores were still produced). That file was kept aside and
  **replaced** by a clean run against a freshly started Chrome; the
  replacement is what is in this directory, and it reports no runtime
  error. Nothing from the failed run is quoted.
