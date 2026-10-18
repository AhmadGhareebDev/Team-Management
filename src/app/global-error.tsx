"use client"

/**
 * Last-resort boundary. Unlike `error.tsx`, this one catches failures in the
 * root layout itself, which means it has to render its own <html> and <body>
 * and cannot rely on any provider (theme, toasts, tooltips) being mounted.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <div className="flex min-h-screen items-center justify-center p-6">
          <div className="flex max-w-md flex-col items-center gap-4 text-center">
            <h2 className="font-serif text-xl font-semibold">
              The application failed to load
            </h2>
            <p className="text-sm text-muted-foreground">
              Something broke outside of a single page. Reloading usually
              clears it.
            </p>

            {error.digest && (
              <p className="font-mono text-[11px] text-muted-foreground/60">
                Reference: {error.digest}
              </p>
            )}

            <button
              type="button"
              onClick={reset}
              className="rounded-none bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Reload
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}