import type { NextConfig } from "next";

/**
 * Content-Security-Policy.
 *
 * Deliberately permissive on script/style/connect (the app relies on Next.js
 * inline bootstrap, Framer Motion, Razorpay checkout, Google OAuth and YouTube
 * embeds), but still locks down the things that matter most for a production
 * fitness app handling auth + payments:
 *   - frame-ancestors 'self'  -> clickjacking protection
 *   - object-src 'none'       -> no Flash/plugin injection
 *   - base-uri 'self'         -> can't rewrite the document base
 *   - form-action             -> forms can only post to us / payment + OAuth
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://*.razorpay.com https://accounts.google.com https://apis.google.com https://www.youtube.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "media-src 'self' blob: data:",
  "frame-src 'self' https://www.youtube.com https://youtube.com https://*.razorpay.com https://api.razorpay.com https://accounts.google.com",
  "connect-src 'self' https: wss:",
  "worker-src 'self' blob:",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://*.razorpay.com https://accounts.google.com",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Permissions-Policy",
    // Geolocation is used for gym detection; camera for nothing yet — keep them off by default.
    value: "camera=(), microphone=(), geolocation=(self), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apply security headers to every route.
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
