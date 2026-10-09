"use client"

import { useRouter, usePathname } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { pageCount } from "@/lib/pagination"

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
  const router = useRouter()
  const pathname = usePathname()

  const pages = pageCount(total, pageSize)
  const current = Math.min(Math.max(1, page), pages)

  const go = (next: number) => {
    const search = new URLSearchParams()
    for (const [key, value] of Object.entries(params ?? {})) {
      if (value !== undefined && value !== "") {
        search.set(key, value)
      }
    }
    if (next <= 1) {
      search.delete("page")
    } else {
      search.set("page", String(next))
    }
    const query = search.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  return (
    <div className="flex items-center justify-between gap-3 pt-1">
      <span className="text-xs text-muted-foreground">
        Page {current} of {pages} · {total} {total === 1 ? noun.replace(/s$/, "") : noun}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={current <= 1}
          onClick={() => go(current - 1)}
        >
          <ChevronLeft />
          Prev
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={current >= pages}
          onClick={() => go(current + 1)}
        >
          Next
          <ChevronRight />
        </Button>
      </div>
    </div>
  )
}
