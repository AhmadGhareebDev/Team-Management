"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { pageCount } from "@/lib/pagination"

/**
 * Real links rather than `router.push` calls: the browser can prefetch the next
 * page, middle-click opens a tab, and the destination still works without JS.
 *
 * The loading feedback lives in the surrounding Suspense boundary, which is
 * keyed on the query so its skeleton renders while the next page is fetched.
 */
export default function ListPager({
  page,
  total,
  pageSize,
  params,
  noun = "items",
}: {
  page: number
  total: number
  pageSize: number
  params?: Record<string, string | undefined>
  noun?: string
}) {
  const pathname = usePathname()

  const pages = pageCount(total, pageSize)
  const current = Math.min(Math.max(1, page), pages)

  const hrefFor = (target: number) => {
    const search = new URLSearchParams()

    for (const [key, value] of Object.entries(params ?? {})) {
      if (value !== undefined && value !== "") {
        search.set(key, value)
      }
    }

    // Page one is the default, so leave the parameter off entirely.
    if (target <= 1) {
      search.delete("page")
    } else {
      search.set("page", String(target))
    }

    const query = search.toString()
    return query ? `${pathname}?${query}` : pathname
  }

  const linkClass = buttonVariants({ variant: "outline", size: "sm" })

  return (
    <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-xs text-muted-foreground">
        Page {current} of {pages} · {total} {total === 1 ? noun.replace(/s$/, "") : noun}
      </span>

      <div className="flex items-center gap-2">
        {current <= 1 ? (
          <span
            aria-disabled
            className={cn(linkClass, "pointer-events-none flex-1 justify-center opacity-50 sm:flex-none")}
          >
            <ChevronLeft className="size-4" aria-hidden />
            Prev
          </span>
        ) : (
          <Link
            href={hrefFor(current - 1)}
            prefetch
            scroll
            className={cn(linkClass, "flex-1 justify-center sm:flex-none")}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-4" aria-hidden />
            Prev
          </Link>
        )}

        {current >= pages ? (
          <span
            aria-disabled
            className={cn(linkClass, "pointer-events-none flex-1 justify-center opacity-50 sm:flex-none")}
          >
            Next
            <ChevronRight className="size-4" aria-hidden />
          </span>
        ) : (
          <Link
            href={hrefFor(current + 1)}
            prefetch
            scroll
            className={cn(linkClass, "flex-1 justify-center sm:flex-none")}
            aria-label="Next page"
          >
            Next
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        )}
      </div>
    </div>
  )
}
