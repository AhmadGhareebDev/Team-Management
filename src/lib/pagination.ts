export const PAGE_SIZES = {
  tasks: 12,
  projects: 9,
  workspaceProjects: 8,
  workspaces: 9,
  members: 20,
  activity: 15,
  notificationsDropdown: 15,
} as const

export type Paginated<T> = {
  items: T[]
  total: number
}

export function parsePage(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value
  const parsed = Number.parseInt(raw ?? "", 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
}

export function pageCount(total: number, pageSize: number) {
  return Math.max(1, Math.ceil(total / pageSize))
}

export function toOffset(page: number, pageSize: number) {
  return (Math.max(1, page) - 1) * pageSize
}

export function toParams(
  searchParams: Record<string, string | string[] | undefined> | undefined
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(searchParams ?? {})) {
    const single = Array.isArray(value) ? value[0] : value
    if (single !== undefined && single !== "") {
      out[key] = single
    }
  }
  return out
}

/**
 * Stable string describing the list query, for use as a Suspense `key`.
 *
 * React keeps the previously rendered content on screen while a transition is
 * in flight, so a page/filter change would otherwise look like nothing
 * happened. Changing the boundary's key remounts it, which makes the skeleton
 * fallback render immediately.
 *
 * Keys are sorted so the value only changes when the query actually changes.
 */
export function searchParamsKey(
  searchParams: Record<string, string | string[] | undefined> | undefined
): string {
  const search = new URLSearchParams()

  for (const key of Object.keys(searchParams ?? {}).sort()) {
    const value = searchParams?.[key]
    const single = Array.isArray(value) ? value[0] : value
    if (single !== undefined && single !== "") {
      search.set(key, single)
    }
  }

  return search.toString()
}
