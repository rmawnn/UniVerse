"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

/**
 * Root error boundary — catches unhandled errors across the entire app.
 * Next.js automatically wraps every layout with this when present.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error (replace with a real error reporting service in production)
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-1 px-4">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10">
          <AlertTriangle className="h-8 w-8 text-red-400" />
        </div>
        <h1 className="mb-2 text-2xl font-bold text-fg-1">Something went wrong</h1>
        <p className="mb-6 text-fg-3">
          An unexpected error occurred. This has been logged and we&apos;ll look
          into it.
        </p>
        {error.digest && (
          <p className="mb-4 font-mono text-xs text-fg-4">
            Error ID: {error.digest}
          </p>
        )}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-purple px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-purple/80"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-lg border border-line-1 px-5 py-2.5 text-sm font-medium text-fg-2 transition-colors hover:bg-bg-2"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}
