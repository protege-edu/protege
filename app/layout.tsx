import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next, Recursive, Shantell_Sans } from "next/font/google";
import localFont from "next/font/local";
import { ACCESS_BOOT } from "@/lib/access/boot";
import { OLD_BROWSER_CHECK } from "@/lib/browser/old";
import "./globals.css";

// Gloam's voice for younger age styles. BNCE (bounce) lets its handwriting change with mood.
const shantell = Shantell_Sans({
  variable: "--font-shantell",
  subsets: ["latin"],
  axes: ["BNCE", "INFM"],
});

// Gloam's voice for high school: dry and deadpan, but a person talking, not a terminal.
// Its CASL (casual) and slnt axes shift with Gloam's mood: upright and neat when unimpressed, loose when thrilled.
const recursive = Recursive({
  variable: "--font-recursive",
  subsets: ["latin"],
  axes: ["CASL", "slnt"],
});

// Everything students read and type, at every age.
const atkinson = Atkinson_Hyperlegible_Next({
  variable: "--font-atkinson",
  subsets: ["latin"],
});

// "Easier reading" in Ways to play (OFL licence). Not preloaded: it's only downloaded by students who pick it.
const dyslexic = localFont({
  variable: "--font-dyslexic",
  preload: false,
  display: "swap",
  src: [
    { path: "../node_modules/@fontsource/opendyslexic/files/opendyslexic-latin-400-normal.woff2", weight: "400" },
    { path: "../node_modules/@fontsource/opendyslexic/files/opendyslexic-latin-700-normal.woff2", weight: "700" },
  ],
});

export const metadata: Metadata = {
  title: "Protégé",
  description: "Teach Gloam something it doesn't get yet.",
};

export const viewport: Viewport = {
  themeColor: "#0d1613",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${shantell.variable} ${recursive.variable} ${atkinson.variable} ${dyslexic.variable}`} suppressHydrationWarning>
      <head>
        {/* the student's bigger text, contrast and reading settings, before the first paint (lib/access) */}
        <script dangerouslySetInnerHTML={{ __html: ACCESS_BOOT }} />
        {/* a browser too old to run Protégé says so, instead of showing a dark page (lib/browser/old.ts) */}
        <script dangerouslySetInnerHTML={{ __html: OLD_BROWSER_CHECK }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
