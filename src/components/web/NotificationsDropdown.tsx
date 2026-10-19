"use client"

import { Bell, CheckCheck, Clock, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Spinner } from "@/components/ui/spinner"
import NotificationRow from "@/components/web/NotificationRow"
import { useNotifications } from "@/components/web/NotificationsProvider"
import { useIsMobile } from "@/hooks/use-mobile"
import type { NotificationTab } from "@/db/queries/notifications"

const tabLabels: Record<NotificationTab, string> = {
  invitations: "Invitations",
  tasks: "Tasks",
  members: "Members",
}

const tabOrder: NotificationTab[] = ["invitations", "tasks", "members"]

type NotificationsApi = ReturnType<typeof useNotifications>

function NotificationsPanel({ notifications }: { notifications: NotificationsApi }) {
  const {
    activeTab,
    items,
    total,
    counts,
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
  } = notifications

  return (
    <div>
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
        {isSeeding && items.length === 0 ? (
          <div className="flex justify-center px-4 py-10">
            <Spinner className="size-5" />
          </div>
        ) : items.length === 0 ? (
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
                  onInvitationResolved={resolveInvitation}
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
    </div>
  )
}

export function NotificationsDropdown() {
  const isMobile = useIsMobile()
  const notifications = useNotifications()

  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger
          render={
            <Button
              variant="outline"
              size="icon-sm"
              className="relative border-0"
              aria-label="Notifications"
            >
              <Bell />
              {notifications.unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex size-2 items-center justify-center">
                  <span className="absolute size-2 rounded-none bg-primary" />
                  <span className="absolute size-2 animate-ping rounded-none bg-primary/60" />
                </span>
              )}
            </Button>
          }
        />
        <SheetContent side="bottom" showCloseButton={false} className="p-0">
          <SheetTitle className="sr-only">Notifications</SheetTitle>
          <div className="max-h-[80dvh] overflow-y-auto">
            <NotificationsPanel notifications={notifications} />
          </div>
        </SheetContent>
      </Sheet>
    )
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
          >
            <Bell />
            {notifications.unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex size-2 items-center justify-center">
                <span className="absolute size-2 rounded-none bg-primary" />
                <span className="absolute size-2 animate-ping rounded-none bg-primary/60" />
              </span>
            )}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-[360px]! p-0">
        <NotificationsPanel notifications={notifications} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
