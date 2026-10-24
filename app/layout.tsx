import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next, Shantell_Sans } from "next/font/google";
import "./globals.css";

// Gloam's voice. We keep the BNCE (bounce) and INFM (informal) axes so
// its handwriting can change with its mood.
const shantell = Shantell_Sans({
  variable: "--font-shantell",
  subsets: ["latin"],
  axes: ["BNCE", "INFM"],
});

// Everything the student reads and types.
const atkinson = Atkinson_Hyperlegible_Next({
  variable: "--font-atkinson",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Protégé",
  description: "Teach Gloam something it doesn't get yet.",
};

export const viewport: Viewport = {
  themeColor: "#23402f",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${shantell.variable} ${atkinson.variable}`}>
      <body>{children}</body>
    </html>
  );
}
