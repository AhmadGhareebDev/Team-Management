"use client"

import { useRouter, usePathname } from "next/navigation"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

export type UrlSelectOption = { value: string; label: string }

const ALL_VALUE = "all"

export default function UrlSelect({
  param,
  value,
  options,
  params,
  ariaLabel,
  className,
}: {
  param: string
  value?: string
  options: UrlSelectOption[]
  params?: Record<string, string | undefined>
  ariaLabel: string
  className?: string
}) {
  const router = useRouter()
  const pathname = usePathname()

  const selected = value && value.length > 0 ? value : ALL_VALUE

  const handleChange = (next: string | null) => {
    if (next === null) return
    const search = new URLSearchParams()
    for (const [key, val] of Object.entries(params ?? {})) {
      if (val !== undefined && val !== "") {
        search.set(key, val)
      }
    }
    if (next === ALL_VALUE) {
      search.delete(param)
    } else {
      search.set(param, next)
    }
    search.delete("page")
    const query = search.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  return (
    <Select value={selected} onValueChange={handleChange}>
      <SelectTrigger
        aria-label={ariaLabel}
        className={cn(
          "h-9! rounded-md border border-border/60 bg-background px-3 text-xs font-normal normal-case tracking-normal",
          className
        )}
      >
        <SelectValue>
          {(current) => {
            const label =
              options.find((option) => option.value === current)?.label ?? options[0]?.label
            return <span className="truncate">{label}</span>
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="start" className="rounded-md">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value} className="text-xs">
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
