import { SettingsSkeleton } from "@/components/skeletons"

/**
 * Covers the whole two-column settings grid, not just the Profile card, because
 * the page blocks on the session read before any of it renders.
 */
export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="space-y-1">
        <div className="h-7 w-24 animate-pulse bg-muted" />
        <div className="h-4 w-64 animate-pulse bg-muted" />
      </div>

      <SettingsSkeleton />
    </div>
  )
}