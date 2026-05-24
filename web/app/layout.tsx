import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { QueryProvider } from "@/lib/providers/QueryProvider";
import { AuthHydrator } from "@/lib/providers/AuthHydrator";
import "./globals.css";

export const metadata: Metadata = {
  title: "UniVerse",
  description: "The social network for verified university students.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <QueryProvider>
          <AuthHydrator>{children}</AuthHydrator>
        </QueryProvider>
      </body>
    </html>
  );
}
