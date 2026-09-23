"use server"
import { db } from "@/db"
import { eq, and } from "drizzle-orm"
import { notification } from "@/db/schemas"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"

export async function markNotificationAsRead(notificationId: string) {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    return { success: false, error: "UNAUTHENTICATED" }
  }

  try {
    await db
      .update(notification)
      .set({ isRead: true })
      .where(
        and(
          eq(notification.id, notificationId),
          eq(notification.userId, session.user.id)
        )
      )

    return { success: true }
  } catch {
    return { success: false, error: "INTERNAL_SERVER_ERROR" }
  }
}

export async function markAllNotificationsAsRead() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    return { success: false, error: "UNAUTHENTICATED" }
  }

  try {
    await db
      .update(notification)
      .set({ isRead: true })
      .where(eq(notification.userId, session.user.id))

    return { success: true }
  } catch {
    return { success: false, error: "INTERNAL_SERVER_ERROR" }
  }
}