// Cache-Control strategy by route type — addresses PERF-01, PERF-02.
// Why explicit per-type values: prerendered pages send
// `max-age=0, must-revalidate` — Vercel's normal default, meaning the
// browser revalidates on every visit while the edge may still serve its
// cached copy (hence a large edge Age). That is not a contradiction.
// Stating the intent per route type makes the behaviour reviewable and
// stops a future change from silently un-caching a page.
// If browser-side caching is wanted for prerendered pages, use e.g.
// `public, max-age=60, stale-while-revalidate=300` instead of the
// default below — accepting that browser-cached visitors see updates
// up to max-age later.
//
// Next.js note: for App Router pages, prefer `revalidate` (ISR) or
// route-segment config over hand-setting headers, and use these values
// as the documented intent. `/_next/static/*` assets already carry
// content hashes, so `immutable` is safe for them.

export function cacheControlFor(routeType) {
  switch (routeType) {
    case "static-asset":
      // Content-hashed bundles/fonts: safe to cache for a year.
      return "public, max-age=31536000, immutable";
    case "prerendered-page":
      // Marketing pages: edge may serve stale for 5 min while it
      // revalidates in the background (stale-while-revalidate).
      return "public, max-age=0, s-maxage=300, stale-while-revalidate=60";
    case "dynamic-page":
      // Genuinely per-request content (e.g. a page that reads cookies
      // or request headers). Only use this where content really varies.
      return "private, no-cache, no-store, max-age=0, must-revalidate";
    case "sitemap":
      // Sitemaps change rarely; regenerating per request wastes a render.
      // Cache for an hour at the edge, serve stale for a day on error.
      return "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400";
    case "robots":
      return "public, max-age=86400";
    default:
      throw new Error(`unknown route type: ${routeType}`);
  }
}
