"use client"

import * as React from "react"
import { useTransition } from "react"
import { Bell, CheckCheck, Clock, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import NotificationRow from "@/components/web/NotificationRow"
import { markAllNotificationsAsRead } from "@/actions/notifications"
import {
  loadNotifications,
  loadNotificationTabCounts,
} from "@/actions/notifications-loader"
import type {
  Notification,
  NotificationTab,
} from "@/db/queries/notifications"
import { resolveActionError } from "@/lib/error-messages"
import { PAGE_SIZES } from "@/lib/pagination"

const tabLabels: Record<NotificationTab, string> = {
  invitations: "Invitations",
  tasks: "Tasks",
  members: "Members",
}

const tabOrder: NotificationTab[] = ["invitations", "tasks", "members"]

export function NotificationsDropdown({
  notifications,
  total,
  counts,
  unreadTotal,
}: {
  notifications: Notification[]
  total: number
  counts: Record<NotificationTab, number>
  unreadTotal: number
}) {
  const router = useRouter()
  const [items, setItems] = React.useState(notifications)
  const [itemTotal, setItemTotal] = React.useState(total)
  const [activeTab, setActiveTab] = React.useState<NotificationTab>("invitations")
  const [tabCounts, setTabCounts] = React.useState(counts)
  const [unreadCount, setUnreadCount] = React.useState(unreadTotal)
  const [readIds, setReadIds] = React.useState<Set<string>>(() => new Set())
  const [isMarkingAll, startMarkAllTransition] = useTransition()
  const [isSwitchingTab, startTabTransition] = useTransition()
  const [isLoadingMore, startLoadMoreTransition] = useTransition()

  // Notifications are never removed from the list. Marking as read only
  // clears the unread dot, so track it locally until the server catches up.
  const isLocallyRead = (n: Notification) => n.isRead || readIds.has(n.id)

  const hasMore = items.length < itemTotal

  const handleRead = (id: string) => {
    setReadIds((prev) => {
      if (prev.has(id)) return prev
      setUnreadCount((count) => Math.max(0, count - 1))
      return new Set(prev).add(id)
    })
  }

  const handleTabChange = (tab: NotificationTab) => {
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
          description: "We couldn't load those notifications. Please try again.",
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
  }

  const handleLoadMore = () => {
    startLoadMoreTransition(async () => {
      const result = await loadNotifications({
        tab: activeTab,
        offset: items.length,
        limit: PAGE_SIZES.notificationsDropdown,
      })

      if ("error" in result && result.error) {
        toast.add({
          type: "error",
          description: "We couldn't load more notifications. Please try again.",
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
  }

  const handleMarkAll = () => {
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
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="icon-sm"
            className="relative border-0"
            aria-label="Notifications"
          />
        }
      >
        <Bell />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex size-2 items-center justify-center">
            <span className="absolute size-2 rounded-full bg-primary" />
            <span className="absolute size-2 animate-ping rounded-full bg-primary/60" />
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[360px]! p-0">
        <div className="flex items-center gap-1 border-b border-border p-2">
          {tabOrder.map((tab) => (
            <Button
              key={tab}
              variant={activeTab === tab ? "secondary" : "ghost"}
              size="xs"
              onClick={() => handleTabChange(tab)}
              disabled={isSwitchingTab}
            >
              {tabLabels[tab]}
              {tabCounts[tab] > 0 && (
                <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">
                  {tabCounts[tab]}
                </span>
              )}
            </Button>
          ))}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Clock className="mx-auto size-6 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium text-foreground">
                No notifications yet
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((notification) => (
                <li key={notification.id}>
                  <NotificationRow
                    notification={{
                      ...notification,
                      isRead: isLocallyRead(notification),
                    }}
                    onRead={handleRead}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div
          className={
            items.length === 0
              ? "hidden"
              : "border-t border-border p-2"
          }
        >
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleLoadMore}
            disabled={isLoadingMore || !hasMore}
          >
            {isLoadingMore ? (
              <Loader2 className="animate-spin" />
            ) : hasMore ? (
              <span>
                Load more ({items.length} of {itemTotal})
              </span>
            ) : (
              <span>All loaded</span>
            )}
          </Button>
        </div>

        <div className="border-t border-border p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={handleMarkAll}
            disabled={isMarkingAll || unreadCount === 0}
          >
            {isMarkingAll ? (
              <Spinner data-icon="inline-start" className="size-3.5" />
            ) : (
              <CheckCheck className="size-4" />
            )}
            Mark all as read
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}