"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { TriangleAlert } from "lucide-react"
import { useRouter } from "next/navigation"

/**
 * Route-level error boundary. Catches anything thrown while rendering a page or
 * a component below it, so a single failing query shows this instead of a blank
 * screen with no way back.
 *
 * The layout is deliberately not replaced: the sidebar and navbar stay put, so
 * the user can still navigate away instead of being stranded.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  useEffect(() => {
    console.error("Route error:", error)
  }, [error])

  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <div className="flex size-12 items-center justify-center rounded-none bg-destructive/10">
          <TriangleAlert className="size-6 text-destructive" />
        </div>

        <div className="space-y-1.5">
          <h2 className="font-serif text-xl font-semibold text-foreground">
            Something went wrong
          </h2>
          <p className="text-sm text-muted-foreground">
            We couldn&apos;t load this page. It may have been a temporary
            problem — try again, or head back to your workspaces.
          </p>
        </div>

        {error.digest && (
          <p className="font-mono text-[11px] text-muted-foreground/60">
            Reference: {error.digest}
          </p>
        )}

        <div className="flex items-center gap-2">
          <Button onClick={reset}>Try again</Button>
          <Button variant="ghost" onClick={() => router.push("/workspaces")}>
            Back to workspaces
          </Button>
        </div>
      </div>
    </div>
  )
}