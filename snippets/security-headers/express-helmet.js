// Express / Helmet equivalent of headers.js — addresses SEC-01, SEC-02.
// Usage (requires the `helmet` package in a real app):
//   import helmet from "helmet";
//   import { helmetOptions } from "./express-helmet.js";
//   app.use(helmet(helmetOptions()));
// This file itself has no dependency so it can be unit-tested in isolation;
// the object it returns is exactly the options object passed to helmet().

export function helmetOptions({ bitElevate = false } = {}) {
  const scriptSrc = ["'self'", "https://www.googletagmanager.com", "https://www.google-analytics.com"];
  const connectSrc = ["'self'", "https://www.google-analytics.com", "https://region1.google-analytics.com"];
  if (bitElevate) {
    scriptSrc.push("https://sdk.cashfree.com");
    connectSrc.push("https://api.cashfree.com", "https://sdk.cashfree.com");
  }
  return {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc,
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "https://www.google-analytics.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        connectSrc,
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        objectSrc: ["'none'"],
        ...(bitElevate ? { frameSrc: ["'self'", "https://sdk.cashfree.com"] } : {}),
      },
    },
    crossOriginOpenerPolicy: { policy: "same-origin" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    // Helmet sets X-Content-Type-Options: nosniff and X-Frame-Options: DENY
    // by default; Permissions-Policy must be set explicitly:
    permissionsPolicy: { features: { camera: [], microphone: [], geolocation: [], payment: [] } },
  };
}
