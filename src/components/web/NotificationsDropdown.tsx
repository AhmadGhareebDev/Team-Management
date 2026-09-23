"use client"

import * as React from "react"
import { useTransition } from "react"
import { Bell, CheckCheck, Clock } from "lucide-react"
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
import type { Notification } from "@/db/queries/notifications"

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
  if (tab === "members") return notification.type === "member_removed"
  return (taskTypes as readonly string[]).includes(notification.type)
}

export function NotificationsDropdown({
  notifications,
}: {
  notifications: Notification[]
}) {
  const router = useRouter()
  const [activeTab, setActiveTab] = React.useState<NotificationTab>("invitations")
  const [handledIds, setHandledIds] = React.useState<Set<string>>(() => new Set())
  const [isMarkingAll, startMarkAllTransition] = useTransition()

  const items = React.useMemo(
    () => notifications.filter((n) => !handledIds.has(n.id)),
    [notifications, handledIds]
  )

  const unreadCount = items.filter((n) => !n.isRead).length
  const visible = items.filter((n) => matchesTab(n, activeTab))

  const handleHandled = (id: string) => {
    setHandledIds((prev) => new Set(prev).add(id))
  }

  const handleMarkAll = () => {
    startMarkAllTransition(async () => {
      const result = await markAllNotificationsAsRead()

      if (result?.error) {
        toast.add({
          type: "error",
          description: "Could not mark notifications as read.",
        })
        return
      }

      setHandledIds((prev) => {
        const next = new Set(prev)
        for (const n of notifications) {
          if (!n.isRead) next.add(n.id)
        }
        return next
      })
      router.refresh()
      toast.add({
        type: "success",
        description: "All notifications marked as read.",
      })
    })
  }

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open) setActiveTab("invitations")
      }}
    >
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
          {(["invitations", "tasks", "members"] as NotificationTab[]).map(
            (tab) => (
              <Button
                key={tab}
                variant={activeTab === tab ? "secondary" : "ghost"}
                size="xs"
                onClick={() => setActiveTab(tab)}
              >
                {tabLabels[tab]}
              </Button>
            )
          )}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {visible.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Clock className="mx-auto size-6 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium text-foreground">
                No notifications yet
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {visible.map((notification) => (
                <li key={notification.id}>
                  <NotificationRow
                    notification={notification}
                    onHandled={handleHandled}
                  />
                </li>
              ))}
            </ul>
          )}
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