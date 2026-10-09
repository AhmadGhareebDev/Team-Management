"use client"

import * as React from "react"
import { useTransition } from "react"
import { Activity, Loader2 } from "lucide-react"
import { toast } from "@/components/ui/toast"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { formatRelativeTime } from "@/lib/relative-time"
import { getInitials, statusLabels } from "@/lib/task-display"
import type { TaskStatus } from "@/db/validations"
import { ImageKitAvatar } from "@/components/web/ImageKitAvatar"
import { loadMoreActivity } from "@/actions/activity"
import type { RecentActivity } from "@/db/queries/activity"
import { PAGE_SIZES } from "@/lib/pagination"

function quote(value: string | undefined, fallback: string) {
  return value ? `"${value}"` : fallback
}

function labelStatus(value: string | undefined) {
  if (!value) return "another status"
  return statusLabels[value as TaskStatus] ?? value
}

function personName(value: string | undefined) {
  return value && value.length > 0 ? value : "a teammate"
}

function describeActivity(item: RecentActivity) {
  const meta = item.metadata ?? {}
  const who = personName(meta.name)
  const target = quote(meta.title, "this task")

  switch (item.type) {
    case "task_created":
      return `created task ${target}`
    case "task_updated":
      return `updated task ${target}`
    case "task_status_changed":
      return `moved ${target} from ${labelStatus(meta.from)} to ${labelStatus(meta.to)}`
    case "task_assigned":
      return `assigned ${who} to ${target}`
    case "task_unassigned":
      return `unassigned ${who} from ${target}`
    case "task_deleted":
      return `deleted task ${target}`
    case "dependency_added":
      return `made ${target} depend on ${quote(meta.name, "another task")}`
    case "dependency_removed":
      return `removed a dependency from ${target}`
    case "subtask_added":
      return `added the subtask ${target}`
    case "subtask_completed":
      return `completed the subtask ${target}`
    case "subtask_deleted":
      return `deleted the subtask ${target}`
    case "project_created":
      return `created the project ${quote(meta.title, "a project")}`
    case "project_updated":
      return `updated the project ${quote(meta.title, "a project")}`
    case "project_deleted":
      return `deleted the project ${quote(meta.title, "a project")}`
    case "member_added":
      return item.entityType === "project_member"
        ? `added ${who} to ${quote(meta.title, "a project")}`
        : "joined the workspace"
    case "member_removed":
      return item.entityType === "project_member"
        ? `removed ${who} from ${quote(meta.title, "a project")}`
        : `removed ${who} from the workspace`
    case "member_role_changed":
      return `changed ${who}'s role from ${labelStatus(
        meta.from
      ).toLowerCase()} to ${labelStatus(meta.to).toLowerCase()}`
    default:
      return "updated the workspace"
  }
}

function ActivityRow({ item }: { item: RecentActivity }) {
  const actorName = item.actor?.name ?? "Someone"

  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <ImageKitAvatar
        src={item.actor?.avatar_url ?? null}
        alt={actorName}
        initials={getInitials(actorName)}
        size={28}
        className="mt-0.5 size-7"
      />

      <div className="min-w-0 flex-1">
        <p className="text-sm leading-6 text-foreground">
          <span className="font-medium">{actorName}</span> {describeActivity(item)}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {[item.workspace?.name, item.project?.name]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>

      <span className="mt-1 shrink-0 text-xs text-muted-foreground">
        {formatRelativeTime(new Date(item.createdAt))}
      </span>
    </li>
  )
}

export default function ActivityFeed({
  initialItems,
  initialTotal,
}: {
  initialItems: RecentActivity[]
  initialTotal: number
}) {
  const [items, setItems] = React.useState(initialItems)
  const [total, setTotal] = React.useState(initialTotal)
  const [isPending, startTransition] = useTransition()

  const hasMore = items.length < total

  const handleLoadMore = () => {
    startTransition(async () => {
      const result = await loadMoreActivity({
        offset: items.length,
        limit: PAGE_SIZES.activity,
      })

      if ("error" in result && result.error) {
        toast.add({
          type: "error",
          description: "We couldn't load more activity. Please try again.",
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

  return (
    <section className="rounded-xl border-0 bg-card shadow-sm ring-1 ring-foreground/5">
      <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <Activity className="size-4 text-muted-foreground" />
          <h2 className="font-serif text-base font-semibold tracking-tight text-foreground">
            Recent activity
          </h2>
        </div>
        <span className="text-xs text-muted-foreground">
          {total === 0
            ? "Nothing yet"
            : `${items.length} of ${total} update${total === 1 ? "" : "s"}`}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">
          Changes made across your workspaces will show up here.
        </p>
      ) : (
        <>
          <ul className="max-h-96 divide-y divide-border/40 overflow-y-auto scrollbar-thin">
            {items.map((item) => (
              <ActivityRow key={item.id} item={item} />
            ))}
          </ul>

          <div
            className={cn(
              "border-t border-border/40 p-2",
              !hasMore && "invisible"
            )}
          >
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleLoadMore}
              disabled={isPending || !hasMore}
            >
              {isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <span>Load more activity</span>
              )}
            </Button>
          </div>
        </>
      )}
    </section>
  )
}