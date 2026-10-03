"use client"

import * as React from "react"
import { useTransition } from "react"
import { BellRing, CheckCheck, Clock } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import NotificationRow from "@/components/web/NotificationRow"
import { markAllNotificationsAsRead } from "@/actions/notifications"
import type { Notification } from "@/db/queries/notifications"
import { cn } from "@/lib/utils"
import { resolveActionError } from "@/lib/error-messages"

type NotificationTab = "invitations" | "tasks" | "members"

const tabLabels: Record<NotificationTab, string> = {
  invitations: "Invitations",
  tasks: "Tasks",
  members: "Members",
}

const taskTypes = [
  "task_assigned",
  "task_unblocked",
  "dependency_overdue",
  "dependency_resolved",
  "deadline_approaching",
  "task_reassigned",
  "task_overdue",
] as const

function matchesTab(
  notification: Notification,
  tab: NotificationTab
): boolean {
  if (tab === "invitations") return notification.type === "workspace_invitation"
  if (tab === "members") {
    return (
      notification.type === "member_removed" ||
      notification.type === "project_member_added"
    )
  }
  return (taskTypes as readonly string[]).includes(notification.type)
}

export default function NotificationsPage({
  notifications,
}: {
  notifications: Notification[]
}) {
  const router = useRouter()
  const [activeTab, setActiveTab] = React.useState<NotificationTab>("invitations")
  const [readIds, setReadIds] = React.useState<Set<string>>(() => new Set())
  const [isMarkingAll, startMarkAllTransition] = useTransition()

  // Notifications are never removed from the list. Marking as read only
  // clears the unread dot, so track it locally until the server catches up.
  const isLocallyRead = (n: Notification) => n.isRead || readIds.has(n.id)

  const unreadCount = React.useMemo(
    () => notifications.filter((n) => !n.isRead && !readIds.has(n.id)).length,
    [notifications, readIds]
  )

  const visible = notifications.filter((n) => matchesTab(n, activeTab))

  const handleRead = (id: string) => {
    setReadIds((prev) => (prev.has(id) ? prev : new Set(prev).add(id)))
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

      setReadIds(new Set(notifications.map((n) => n.id)))
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

      <div className="flex items-center gap-1 border-b border-border">
        {(["invitations", "tasks", "members"] as NotificationTab[]).map(
          (tab) => (
            <Button
              key={tab}
              variant={activeTab === tab ? "secondary" : "ghost"}
              size="xs"
              onClick={() => setActiveTab(tab)}
              className={cn(
                "rounded-none border-b-2",
                activeTab === tab
                  ? "border-primary"
                  : "border-transparent hover:border-border"
              )}
            >
              {tabLabels[tab]}
            </Button>
          )
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-border/60">
        {visible.length === 0 ? (
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
          <ul className="divide-y divide-border">
            {visible.map((notification) => (
              <li key={notification.id}>
                <NotificationRow
                  notification={{ ...notification, isRead: isLocallyRead(notification) }}
                  onRead={handleRead}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}