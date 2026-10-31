import type { NextConfig } from "next";

const dev = process.env.NODE_ENV !== "production";

/**
 * What a page may load: only Protégé itself. No third-party scripts, styles, fonts, images or trackers,
 * ever (Rule 3). Next.js writes small inline scripts into every page, so inline scripts are allowed,
 * but nothing from another site. While developing, React also needs eval and the reload socket.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "media-src 'self' blob:",
  `connect-src 'self'${dev ? " ws: wss:" : ""}`,
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // links to other sites never tell them which Protégé page a student was on
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // the microphone (voice typing) for Protégé only; nothing else a page could ask for
  { key: "Permissions-Policy", value: "microphone=(self), camera=(), geolocation=(), payment=(), usb=(), browsing-topics=()" },
  // browsers only ever use https
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  devIndicators: false,
  partialPrefetching: true,
  // never ship the art workshop, screenshots or tools inside the app
  outputFileTracingExcludes: {
    "*": ["data/**", "**/*.db", "**/*.db-*", "**/*.sqlite", "art/**", "screenshots/**", "scripts/**"],
  },
  // no "X-Powered-By: Next.js" (one less thing to tell a stranger)
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // the website (built into public/ by scripts/site.ts) at the short addresses: the home page and /j, in both languages
  async rewrites() {
    return [
      { source: "/", destination: "/index.html" },
      { source: "/fr", destination: "/fr/index.html" },
      { source: "/j", destination: "/j/index.html" },
      { source: "/fr/j", destination: "/fr/j/index.html" },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
