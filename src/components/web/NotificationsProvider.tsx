"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useTransition } from "react"

import { toast } from "@/components/ui/toast"
import {
  loadNotifications,
  loadNotificationTabCounts,
} from "@/actions/notifications-loader"
import { markAllNotificationsAsRead } from "@/actions/notifications"
import type { Notification, NotificationTab } from "@/db/queries/notifications"
import { PAGE_SIZES } from "@/lib/pagination"
import { resolveActionError } from "@/lib/error-messages"

type NotificationsContextValue = {
  activeTab: NotificationTab
  items: Notification[]
  total: number
  counts: Record<NotificationTab, number>
  unreadCount: number
  hasMore: boolean
  isSwitchingTab: boolean
  isLoadingMore: boolean
  isMarkingAll: boolean
  isLocallyRead: (notification: Notification) => boolean
  setTab: (tab: NotificationTab) => void
  loadMore: () => void
  markRead: (id: string) => void
  markAllRead: () => void
}

// The public layout renders the Navbar without a provider, because it has no
// notification data to seed. Falling back to an inert value keeps the bell
// rendering there instead of throwing.
const INERT: NotificationsContextValue = {
  activeTab: "invitations",
  items: [],
  total: 0,
  counts: { invitations: 0, tasks: 0, members: 0 },
  unreadCount: 0,
  hasMore: false,
  isSwitchingTab: false,
  isLoadingMore: false,
  isMarkingAll: false,
  isLocallyRead: (notification) => notification.isRead,
  setTab: () => {},
  loadMore: () => {},
  markRead: () => {},
  markAllRead: () => {},
}

const NotificationsContext =
  React.createContext<NotificationsContextValue>(INERT)

export function useNotifications() {
  return React.useContext(NotificationsContext)
}

export function NotificationsProvider({
  initialTab,
  notifications,
  total,
  counts,
  unreadTotal,
  children,
}: {
  initialTab: NotificationTab
  notifications: Notification[]
  total: number
  counts: Record<NotificationTab, number>
  unreadTotal: number
  children: React.ReactNode
}) {
  const router = useRouter()
  const [items, setItems] = React.useState(notifications)
  const [itemTotal, setItemTotal] = React.useState(total)
  const [activeTab, setActiveTab] = React.useState<NotificationTab>(initialTab)
  const [tabCounts, setTabCounts] = React.useState(counts)
  const [unreadCount, setUnreadCount] = React.useState(unreadTotal)
  const [readIds, setReadIds] = React.useState<Set<string>>(() => new Set())
  const [isMarkingAll, startMarkAllTransition] = useTransition()
  const [isSwitchingTab, startTabTransition] = useTransition()
  const [isLoadingMore, startLoadMoreTransition] = useTransition()

  // Notifications are never removed from the list. Marking as read only
  // clears the unread dot, so track it locally until the server catches up.
  const isLocallyRead = React.useCallback(
    (notification: Notification) =>
      notification.isRead || readIds.has(notification.id),
    [readIds]
  )

  const hasMore = items.length < itemTotal

  const markRead = React.useCallback((id: string) => {
    setReadIds((prev) => {
      if (prev.has(id)) return prev
      setUnreadCount((count) => Math.max(0, count - 1))
      return new Set(prev).add(id)
    })
  }, [])

  const setTab = React.useCallback(
    (tab: NotificationTab) => {
      if (tab === activeTab) return

      setActiveTab(tab)

      startTabTransition(async () => {
        const [result, countResult] = await Promise.all([
          loadNotifications({
            tab,
            offset: 0,
            limit: PAGE_SIZES.notificationsDropdown,
          }),
          loadNotificationTabCounts(),
        ])

        if ("error" in result && result.error) {
          toast.add({
            type: "error",
            description:
              "We couldn't load those notifications. Please try again.",
          })
          return
        }

        setItems(result.items)
        setItemTotal(result.total)

        if (!("error" in countResult) && "unread" in countResult) {
          setTabCounts(countResult.total)
          setUnreadCount(
            Object.values(countResult.unread).reduce((sum, n) => sum + n, 0)
          )
        }
      })
    },
    [activeTab]
  )

  const loadMore = React.useCallback(() => {
    startLoadMoreTransition(async () => {
      const result = await loadNotifications({
        tab: activeTab,
        offset: items.length,
        limit: PAGE_SIZES.notificationsDropdown,
      })

      if ("error" in result && result.error) {
        toast.add({
          type: "error",
          description:
            "We couldn't load more notifications. Please try again.",
        })
        return
      }

      setItems((prev) => {
        const seen = new Set(prev.map((item) => item.id))
        const next = result.items.filter((item) => !seen.has(item.id))
        return [...prev, ...next]
      })
      setItemTotal(result.total)
    })
  }, [activeTab, items.length])

  const markAllRead = React.useCallback(() => {
    startMarkAllTransition(async () => {
      const result = await markAllNotificationsAsRead()

      if (result?.error) {
        toast.add({
          type: "error",
          description: resolveActionError(
            result.error,
            "We couldn't mark your notifications as read. Please try again."
          ),
        })
        return
      }

      setReadIds(new Set(items.map((n) => n.id)))
      setUnreadCount(0)
      router.refresh()
      toast.add({
        type: "success",
        description: "All notifications marked as read.",
      })
    })
  }, [items, router])

  const value = React.useMemo<NotificationsContextValue>(
    () => ({
      activeTab,
      items,
      total: itemTotal,
      counts: tabCounts,
      unreadCount,
      hasMore,
      isSwitchingTab,
      isLoadingMore,
      isMarkingAll,
      isLocallyRead,
      setTab,
      loadMore,
      markRead,
      markAllRead,
    }),
    [
      activeTab,
      items,
      itemTotal,
      tabCounts,
      unreadCount,
      hasMore,
      isSwitchingTab,
      isLoadingMore,
      isMarkingAll,
      isLocallyRead,
      setTab,
      loadMore,
      markRead,
      markAllRead,
    ]
  )

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  )
}
