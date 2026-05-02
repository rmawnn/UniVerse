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
      <body style={{ margin: 0, fontFamily: "var(--font-geist-sans), system-ui, sans-serif" }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
