"use server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import {
  getRecentActivityForUser,
  type ActivityFilters,
} from "@/db/queries/activity"
import { PAGE_SIZES } from "@/lib/pagination"

export async function loadMoreActivity({
  offset,
  limit = PAGE_SIZES.activity,
  filters,
}: {
  offset: number
  limit?: number
  filters?: ActivityFilters
}) {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    return { error: "UNAUTHENTICATED" as const }
  }

  try {
    const result = await getRecentActivityForUser(session.user.id, {
      offset,
      limit,
      filters,
    })

    return { items: result.items, total: result.total }
  } catch {
    return { error: "INTERNAL_SERVER_ERROR" as const }
  }
}