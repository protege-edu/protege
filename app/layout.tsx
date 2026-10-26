import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next, Recursive, Shantell_Sans } from "next/font/google";
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

export const metadata: Metadata = {
  title: "Protégé",
  description: "Teach Gloam something it doesn't get yet.",
};

export const viewport: Viewport = {
  themeColor: "#0d1613",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${shantell.variable} ${recursive.variable} ${atkinson.variable}`}>
      <body>{children}</body>
    </html>
  );
}
