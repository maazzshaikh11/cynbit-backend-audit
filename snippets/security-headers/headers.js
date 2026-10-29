// Security headers for a Next.js site — addresses SEC-01, SEC-02, ERR-01.
// Why a single headers() config: it applies to every route, including
// not-found/error routes, so the 404 page cannot silently miss the policy.
// Start with CSP in Report-Only mode, watch reports, then enforce.
//
// Zod/dependency note: this module has no dependencies. In a real Next.js
// app, export `headers` from next.config.js / middleware as shown below.
//
// Next.js usage:
//   // next.config.mjs
//   import { nextHeaders } from "./snippets/security-headers/headers.js";
//   export default { poweredByHeader: false, async headers() { return nextHeaders(); } };

const BASE_DIRECTIVES = {
  "default-src": ["'self'"],
  "script-src": ["'self'", "https://www.googletagmanager.com", "https://www.google-analytics.com"],
  "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
  // 'unsafe-inline' for styles is a deliberate, documented compromise:
  // the site's markup uses inline styles/classes heavily. Removing it is a
  // follow-up (move styles to CSS files), not a day-one blocker.
  "img-src": ["'self'", "data:", "https://www.google-analytics.com"],
  "font-src": ["'self'", "https://fonts.gstatic.com"],
  "connect-src": ["'self'", "https://www.google-analytics.com", "https://region1.google-analytics.com"],
  "frame-ancestors": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
  "object-src": ["'none'"],
};

// BitElevate additionally needs Cashfree. Do NOT add Cashfree to every
// page's CSP — scope it to the payment route only (least privilege).
export function buildCsp({ bitElevate = false } = {}) {
  const d = JSON.parse(JSON.stringify(BASE_DIRECTIVES));
  if (bitElevate) {
    d["script-src"].push("https://sdk.cashfree.com");
    d["connect-src"].push("https://api.cashfree.com", "https://sdk.cashfree.com");
    d["frame-src"] = ["'self'", "https://sdk.cashfree.com"];
  }
  return Object.entries(d).map(([k, v]) => `${k} ${v.join(" ")}`).join("; ");
}

export function buildSecurityHeaders({ bitElevate = false } = {}) {
  return {
    "Content-Security-Policy": buildCsp({ bitElevate }),
    "X-Content-Type-Options": "nosniff",
    // frame-ancestors in CSP is preferred over X-Frame-Options; keep the
    // legacy header only for very old browsers that ignore CSP framing.
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    // Disable powerful features the marketing site does not use.
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Strict-Transport-Security": "max-age=63072000",
    // Add "; includeSubDomains; preload" only after verifying every
    // subdomain is HTTPS-only (SEC-03). Do not preload blindly.
  };
}

// Next.js headers() shape: one entry per route pattern.
export function nextHeaders() {
  return [
    { source: "/:path*", headers: Object.entries(buildSecurityHeaders()).map(([key, value]) => ({ key, value })) },
    { source: "/bitelevate/:path*", headers: Object.entries(buildSecurityHeaders({ bitElevate: true })).map(([key, value]) => ({ key, value })) },
  ];
}
