import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { SearchX } from "lucide-react"

/**
 * Rendered whenever `notFound()` is called. This app calls it from
 * `lib/guards.ts` and from the workspace detail and settings pages, where a
 * non-member is deliberately given a 404 rather than a 403 so the response is
 * identical to a workspace that does not exist.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <div className="flex size-12 items-center justify-center rounded-none bg-muted">
          <SearchX className="size-6 text-muted-foreground" />
        </div>

        <div className="space-y-1.5">
          <h1 className="font-serif text-xl font-semibold text-foreground">
            Page not found
          </h1>
          <p className="text-sm text-muted-foreground">
            This page doesn&apos;t exist, or you don&apos;t have access to it.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/workspaces" className={buttonVariants()}>
            Go to workspaces
          </Link>
          <Link href="/my-tasks" className={buttonVariants({ variant: "ghost" })}>
            My tasks
          </Link>
        </div>
      </div>
    </div>
  )
}