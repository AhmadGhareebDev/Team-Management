"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import Ably from "ably"
import { AblyProvider, ChannelProvider, useChannel } from "ably/react"

import { toast } from "@/components/ui/toast"
import {
  loadNotifications,
  loadNotificationSeed,
  loadNotificationTabCounts,
} from "@/actions/notifications-loader"
import { markAllNotificationsAsRead } from "@/actions/notifications"
import type {
  Notification,
  NotificationCounts,
} from "@/db/queries/notifications"
import { authClient } from "@/lib/auth-client"
import {
  NOTIFICATION_TAB_TYPES,
  type NotificationTab,
} from "@/lib/notification-tabs"
import { notificationChannel, type NotificationPayload } from "@/lib/ably-channel"
import { getRealtimeClient } from "@/lib/ably-client"
import { PAGE_SIZES } from "@/lib/pagination"
import { resolveActionError } from "@/lib/error-messages"

type NotificationsContextValue = {
  activeTab: NotificationTab
  items: Notification[]
  total: number
  counts: Record<NotificationTab, number>
  unreadCount: number
  hasMore: boolean
  isSeeding: boolean
  isSwitchingTab: boolean
  isLoadingMore: boolean
  isMarkingAll: boolean
  isLocallyRead: (notification: Notification) => boolean
  setTab: (tab: NotificationTab) => void
  loadMore: () => void
  markRead: (id: string) => void
  markAllRead: () => void
  resolveInvitation: (id: string, status: "accepted" | "declined") => void
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
  isSeeding: false,
  isSwitchingTab: false,
  isLoadingMore: false,
  isMarkingAll: false,
  isLocallyRead: (notification) => notification.isRead,
  setTab: () => {},
  loadMore: () => {},
  markRead: () => {},
  markAllRead: () => {},
  resolveInvitation: () => {},
}

const NotificationsContext =
  React.createContext<NotificationsContextValue>(INERT)

export function useNotifications() {
  return React.useContext(NotificationsContext)
}

function toNotification(payload: NotificationPayload): Notification {
  return {
    ...payload,
    createdAt: new Date(payload.createdAt),
    workspaceInvitation: payload.workspaceInvitation
      ? { ...payload.workspaceInvitation }
      : null,
  }
}

function LiveListener({
  channelName,
  onMessage,
}: {
  channelName: string
  onMessage: (payload: NotificationPayload) => void
}) {
  const handler = React.useCallback(
    (message: Ably.Message) => onMessage(message.data as NotificationPayload),
    [onMessage]
  )

  useChannel(channelName, "new", handler)

  return null
}

function RealtimeBridge({
  userId,
  onMessage,
}: {
  userId: string
  onMessage: (payload: NotificationPayload) => void
}) {
  const client = getRealtimeClient()

  if (!client) return null

  const channelName = notificationChannel(userId)

  return (
    <AblyProvider client={client}>
      <ChannelProvider channelName={channelName}>
        <LiveListener channelName={channelName} onMessage={onMessage} />
      </ChannelProvider>
    </AblyProvider>
  )
}

export function NotificationsProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { data: session } = authClient.useSession()
  const userId = session?.user.id ?? null
  const [items, setItems] = React.useState<Notification[]>([])
  const [itemTotal, setItemTotal] = React.useState(0)
  const [activeTab, setActiveTab] =
    React.useState<NotificationTab>("invitations")
  const [tabCounts, setTabCounts] = React.useState<NotificationCounts>({
    invitations: 0,
    tasks: 0,
    members: 0,
  })
  const [unreadCount, setUnreadCount] = React.useState(0)
  const [isSeeding, setIsSeeding] = React.useState(true)
  const [readIds, setReadIds] = React.useState<Set<string>>(() => new Set())
  const [isMarkingAll, startMarkAllTransition] = useTransition()
  const [isSwitchingTab, startTabTransition] = useTransition()
  const [isLoadingMore, startLoadMoreTransition] = useTransition()

  React.useEffect(() => {
    let cancelled = false

    const seed = async () => {
      const result = await loadNotificationSeed().catch(() => null)

      if (cancelled) return

      setIsSeeding(false)

      if (!result || "error" in result) return

      setItems(result.items)
      setItemTotal(result.total)
      setActiveTab(result.tab)
      setTabCounts(result.counts)
      setUnreadCount(
        Object.values(result.unread).reduce((sum, n) => sum + n, 0)
      )
    }

    seed()

    return () => {
      cancelled = true
    }
  }, [])

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

  // An invitation row is rendered from this provider's client state, which a
  // router.refresh() deliberately preserves. The server action succeeding is
  // not enough on its own, so the row is patched here.
  const resolveInvitation = React.useCallback(
    (id: string, status: "accepted" | "declined") => {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id && item.workspaceInvitation
            ? {
                ...item,
                workspaceInvitation: { ...item.workspaceInvitation, status },
              }
            : item
        )
      )
    },
    []
  )

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

  const handleLiveMessage = React.useCallback(
    (payload: NotificationPayload) => {
      const incoming = toNotification(payload)

      const tab = (Object.keys(NOTIFICATION_TAB_TYPES) as NotificationTab[]).find(
        (key) => NOTIFICATION_TAB_TYPES[key].includes(incoming.type)
      )

      if (tab) {
        setTabCounts((prev) => ({ ...prev, [tab]: prev[tab] + 1 }))
      }

      // Only fold it into the visible list when it belongs to the tab on
      // screen, otherwise it would render under the wrong heading.
      if (tab === activeTab) {
        setItems((prev) =>
          prev.some((item) => item.id === incoming.id) ? prev : [incoming, ...prev]
        )
        setItemTotal((total) => total + 1)
      }

      setUnreadCount((count) => count + 1)

      toast.add({ type: "info", description: incoming.body })
    },
    [activeTab]
  )

  const value = React.useMemo<NotificationsContextValue>(
    () => ({
      activeTab,
      items,
      total: itemTotal,
      counts: tabCounts,
      unreadCount,
      hasMore,
      isSeeding,
      isSwitchingTab,
      isLoadingMore,
      isMarkingAll,
      isLocallyRead,
      setTab,
      loadMore,
      markRead,
      markAllRead,
      resolveInvitation,
    }),
    [
      activeTab,
      items,
      itemTotal,
      tabCounts,
      unreadCount,
      hasMore,
      isSeeding,
      isSwitchingTab,
      isLoadingMore,
      isMarkingAll,
      isLocallyRead,
      setTab,
      loadMore,
      markRead,
      markAllRead,
      resolveInvitation,
    ]
  )

  return (
    <NotificationsContext.Provider value={value}>
      {userId && (
        <RealtimeBridge userId={userId} onMessage={handleLiveMessage} />
      )}
      {children}
    </NotificationsContext.Provider>
  )
}
