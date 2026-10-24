import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next, Martian_Mono, Shantell_Sans } from "next/font/google";
import "./globals.css";

// Gloam's voice for younger age styles. BNCE (bounce) lets its handwriting change with mood.
const shantell = Shantell_Sans({
  variable: "--font-shantell",
  subsets: ["latin"],
  axes: ["BNCE", "INFM"],
});

// Gloam's voice for high school: dry, typed, deadpan. The width axis stretches with mood.
const martian = Martian_Mono({
  variable: "--font-martian",
  subsets: ["latin"],
  axes: ["wdth"],
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
  themeColor: "#0a120f",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${shantell.variable} ${martian.variable} ${atkinson.variable}`}>
      <body>{children}</body>
    </html>
  );
}
