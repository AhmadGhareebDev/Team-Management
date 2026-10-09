"use client"

import * as React from "react"
import { useTransition } from "react"
import { BellRing, CheckCheck, Clock, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
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
import { cn } from "@/lib/utils"
import { resolveActionError } from "@/lib/error-messages"
import { PAGE_SIZES } from "@/lib/pagination"

const tabLabels: Record<NotificationTab, string> = {
  invitations: "Invitations",
  tasks: "Tasks",
  members: "Members",
}

const tabOrder: NotificationTab[] = ["invitations", "tasks", "members"]

export default function NotificationsPage({
  initialNotifications,
  initialTotal,
  initialTab,
  counts,
}: {
  initialNotifications: Notification[]
  initialTotal: number
  initialTab: NotificationTab
  counts: Record<NotificationTab, number>
}) {
  const router = useRouter()
  const [items, setItems] = React.useState(initialNotifications)
  const [total, setTotal] = React.useState(initialTotal)
  const [activeTab, setActiveTab] = React.useState<NotificationTab>(initialTab)
  const [tabCounts, setTabCounts] = React.useState(counts)
  const [readIds, setReadIds] = React.useState<Set<string>>(() => new Set())
  const [isMarkingAll, startMarkAllTransition] = useTransition()
  const [isSwitchingTab, startTabTransition] = useTransition()
  const [isLoadingMore, startLoadMoreTransition] = useTransition()

  // Notifications are never removed from the list. Marking as read only
  // clears the unread dot, so track it locally until the server catches up.
  const isLocallyRead = (n: Notification) => n.isRead || readIds.has(n.id)

  const hasMore = items.length < total

  const handleRead = (id: string) => {
    setReadIds((prev) => (prev.has(id) ? prev : new Set(prev).add(id)))
  }

  const handleTabChange = (tab: NotificationTab) => {
    if (tab === activeTab) return

    setActiveTab(tab)

    startTabTransition(async () => {
      const [result, countResult] = await Promise.all([
        loadNotifications({
          tab,
          offset: 0,
          limit: PAGE_SIZES.notificationsPage,
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
      setTotal(result.total)

      if (!("error" in countResult) && "total" in countResult) {
        setTabCounts(countResult.total)
      }
    })
  }

  const handleLoadMore = () => {
    startLoadMoreTransition(async () => {
      const result = await loadNotifications({
        tab: activeTab,
        offset: items.length,
        limit: PAGE_SIZES.notificationsPage,
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
      setTotal(result.total)
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
      router.refresh()
      toast.add({
        type: "success",
        description: "All notifications marked as read.",
      })
    })
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between border-b border-border/40 pb-4">
        <div className="flex items-center gap-3">
          <BellRing className="size-5 text-muted-foreground" />
          <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground">
            Notifications
          </h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleMarkAll}
          disabled={isMarkingAll || items.every((n) => isLocallyRead(n))}
        >
          {isMarkingAll ? (
            <Spinner data-icon="inline-start" className="size-3.5" />
          ) : (
            <CheckCheck className="size-4" />
          )}
          Mark all as read
        </Button>
      </div>

      <div className="flex items-center gap-1 border-b border-border">
        {tabOrder.map((tab) => (
          <Button
            key={tab}
            variant={activeTab === tab ? "secondary" : "ghost"}
            size="xs"
            onClick={() => handleTabChange(tab)}
            disabled={isSwitchingTab}
            className={cn(
              "rounded-none border-b-2",
              activeTab === tab
                ? "border-primary"
                : "border-transparent hover:border-border"
            )}
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

      <div className="rounded-lg border border-border/60">
        {items.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <Clock className="mx-auto size-8 text-muted-foreground/60" />
            <p className="mt-4 text-sm font-medium text-foreground">
              No notifications yet
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Task assignments, due dates and unblocked tasks will show up here.
            </p>
          </div>
        ) : (
          <>
            <ul className="max-h-[60vh] divide-y divide-border overflow-y-auto scrollbar-thin">
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

            <div
              className={cn(
                "border-t border-border p-2",
                !hasMore && "invisible"
              )}
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
                ) : (
                  <span>
                    Load more ({items.length} of {total})
                  </span>
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}