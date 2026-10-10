"use client"

import { Bell, CheckCheck, Clock, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"
import NotificationRow from "@/components/web/NotificationRow"
import { useNotifications } from "@/components/web/NotificationsProvider"
import type { NotificationTab } from "@/db/queries/notifications"

const tabLabels: Record<NotificationTab, string> = {
  invitations: "Invitations",
  tasks: "Tasks",
  members: "Members",
}

const tabOrder: NotificationTab[] = ["invitations", "tasks", "members"]

export function NotificationsDropdown() {
  const {
    activeTab,
    items,
    total,
    counts,
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
  } = useNotifications()

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
              onClick={() => setTab(tab)}
              disabled={isSwitchingTab}
            >
              {tabLabels[tab]}
              {counts[tab] > 0 && (
                <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">
                  {counts[tab]}
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
                    onRead={markRead}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div
          className={
            items.length === 0 ? "hidden" : "border-t border-border p-2"
          }
        >
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={loadMore}
            disabled={isLoadingMore || !hasMore}
          >
            {isLoadingMore ? (
              <Loader2 className="animate-spin" />
            ) : hasMore ? (
              <span>
                Load more ({items.length} of {total})
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
            onClick={markAllRead}
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
