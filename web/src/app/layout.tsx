import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "UniVerse",
  description: "Student-only social platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable}`} suppressHydrationWarning>
      {/*
        suppressHydrationWarning on <body> prevents false-positive mismatch
        warnings caused by browser extensions (e.g. Grammarly) that inject
        attributes like data-new-gr-c-s-check-loaded and data-gr-ext-installed
        into the <body> element at runtime. These attributes are not present in
        the server-rendered HTML, so React would otherwise flag a mismatch.
        This does NOT disable hydration — it only silences the attribute diff
        warning on this single element.
      */}
      <body
        suppressHydrationWarning
        style={{ margin: 0, fontFamily: "var(--font-geist-sans), system-ui, sans-serif" }}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
