"use server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import {
  getUserNotifications,
  getUserNotificationCounts,
  type NotificationTab,
} from "@/db/queries/notifications"
import { PAGE_SIZES } from "@/lib/pagination"

export async function loadNotifications({
  tab,
  offset = 0,
  limit = PAGE_SIZES.notificationsPage,
}: {
  tab: NotificationTab
  offset?: number
  limit?: number
}) {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    return { error: "UNAUTHENTICATED" as const }
  }

  try {
    const result = await getUserNotifications(session.user.id, {
      tab,
      offset,
      limit,
    })

    return { items: result.items, total: result.total }
  } catch {
    return { error: "INTERNAL_SERVER_ERROR" as const }
  }
}

export async function loadNotificationTabCounts() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    return { error: "UNAUTHENTICATED" as const }
  }

  try {
    return await getUserNotificationCounts(session.user.id)
  } catch {
    return { error: "INTERNAL_SERVER_ERROR" as const }
  }
}