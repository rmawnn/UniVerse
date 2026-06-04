import Link from "next/link";
import { Home } from "lucide-react";

/**
 * Global 404 page — shown when no route matches.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-1 px-4">
      <div className="mx-auto max-w-md text-center">
        <div className="mb-6 text-7xl font-bold text-brand-purple/30">404</div>
        <h1 className="mb-2 text-2xl font-bold text-fg-1">Page not found</h1>
        <p className="mb-8 text-fg-3">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-purple px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-purple/80"
          >
            <Home className="h-4 w-4" />
            Go home
          </Link>
          <Link
            href="/explore"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-line-1 px-5 py-2.5 text-sm font-medium text-fg-2 transition-colors hover:bg-bg-2"
          >
            Explore
          </Link>
        </div>
      </div>
    </div>
  );
}
