"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

/**
 * Error boundary for the authenticated (app) route group.
 * Catches errors in feed, messages, communities, etc.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[AppError]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-1 px-4">
      <div className="mx-auto max-w-lg text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-red-500/10">
          <AlertTriangle className="h-7 w-7 text-red-400" />
        </div>
        <h2 className="mb-2 text-xl font-bold text-fg-1">
          Something went wrong
        </h2>
        <p className="mb-1 text-sm text-fg-3">
          {error.message || "An unexpected error occurred."}
        </p>
        {error.digest && (
          <p className="mb-4 font-mono text-xs text-fg-4">
            Ref: {error.digest}
          </p>
        )}
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-purple px-4 py-2 text-sm font-medium text-white hover:bg-brand-purple/80"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-line-1 px-4 py-2 text-sm font-medium text-fg-2 hover:bg-bg-2"
          >
            <Home className="h-4 w-4" />
            Home
          </a>
        </div>
      </div>
    </div>
  );
}
