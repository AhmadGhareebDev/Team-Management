import { headers } from "next/headers"
import { Activity } from "lucide-react"
import { auth } from "@/lib/auth"
import { getRecentActivityForUser, type RecentActivity } from "@/db/queries/activity"
import { formatRelativeTime } from "@/lib/relative-time"
import { getInitials, statusLabels } from "@/lib/task-display"
import type { TaskStatus } from "@/db/validations"
import { ImageKitAvatar } from "@/components/web/ImageKitAvatar"

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

export default async function ActivityFeed() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return null
  }

  const items = await getRecentActivityForUser(session.user.id, 15)

  return (
    <section className="rounded-xl border border-border/60 bg-card">
      <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <Activity className="size-4 text-muted-foreground" />
          <h2 className="font-serif text-base font-semibold tracking-tight text-foreground">
            Recent activity
          </h2>
        </div>
        <span className="text-xs text-muted-foreground">
          {items.length === 0
            ? "Nothing yet"
            : `${items.length} update${items.length === 1 ? "" : "s"}`}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">
          Changes made across your workspaces will show up here.
        </p>
      ) : (
        <ul className="divide-y divide-border/40">
          {items.map((item) => {
            const actorName = item.actor?.name ?? "Someone"

            return (
              <li key={item.id} className="flex items-start gap-3 px-4 py-3">
                <ImageKitAvatar
                  src={item.actor?.avatar_url ?? null}
                  alt={actorName}
                  initials={getInitials(actorName)}
                  size={28}
                  className="mt-0.5 size-7"
                />

                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-6 text-foreground">
                    <span className="font-medium">{actorName}</span>{" "}
                    {describeActivity(item)}
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
          })}
        </ul>
      )}
    </section>
  )
}
