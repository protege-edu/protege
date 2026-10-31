import os from "node:os";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
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
  // over the https tunnel, browsers only ever use https (ignored on the plain school-network address)
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
];

/**
 * This laptop's own addresses on the school network. Students open those (the join code on the projector
 * sends them there), and while developing, Next only serves its page files to addresses it's told about.
 */
const ownAddresses = Object.values(os.networkInterfaces())
  .flat()
  .flatMap((i) => (i && i.family === "IPv4" && !i.internal && /^(10|172\.(1[6-9]|2\d|3[01])|192\.168)\./.test(i.address) ? [i.address] : []));

const nextConfig: NextConfig = {
  // (no Cache Components: on Cloudflare Workers its render stages wait on timers that never fire, and every page hangs.
  // Protégé builds every page fresh per request anyway.)
  // (and a Cloudflare quick tunnel's address, for trying the online way while developing)
  allowedDevOrigins: [...ownAddresses, "*.trycloudflare.com"],
  devIndicators: false,
  // `npm run release` builds a self-contained copy a teacher can run without installing anything else
  // (into its own folder, so building a release never disturbs a running dev server)
  output: process.env.PROTEGE_RELEASE ? "standalone" : undefined,
  distDir: process.env.PROTEGE_RELEASE ? ".next-release" : ".next",
  // never ship a database (or the art workshop, screenshots and tools) inside a release: data stays on each school's laptop
  outputFileTracingExcludes: {
    "*": ["data/**", "**/*.db", "**/*.db-*", "**/*.sqlite", "art/**", "screenshots/**", "scripts/**", "release/**", "app/**/*.ts", "app/**/*.tsx", "lib/**/*.ts"],
  },
  // no "X-Powered-By: Next.js" (one less thing to tell a stranger)
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
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

// `next dev` gets Cloudflare's bindings (the local database in .wrangler/state) like the real Worker
initOpenNextCloudflareForDev();
