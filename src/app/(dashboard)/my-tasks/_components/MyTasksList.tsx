import Link from "next/link"
import { headers } from "next/headers"
import { ListTodo } from "lucide-react"
import { auth } from "@/lib/auth"
import { getUserAssignedTasks } from "@/db/queries/task"
import type { TaskPriority, TaskSort } from "@/db/queries/task"
import { getUserWorkSpaces } from "@/db/queries/workspaces"
import { getUserProjects } from "@/db/queries/project"
import { Button } from "@/components/ui/button"
import ListPager from "@/components/web/ListPager"
import UrlSelect from "@/components/web/UrlSelect"
import type { UrlSelectOption } from "@/components/web/UrlSelect"
import { PAGE_SIZES, toParams } from "@/lib/pagination"
import type { TaskStatus } from "@/db/validations"
import { statusLabels } from "@/lib/task-display"
import UserTaskCard from "./UserTaskCard"

const STATUS_OPTIONS: UrlSelectOption[] = [
  { value: "all", label: "All statuses" },
  ...(
    ["todo", "in_progress", "in_review", "blocked", "done"] as TaskStatus[]
  ).map((status) => ({ value: status, label: statusLabels[status] })),
]

const PRIORITY_OPTIONS: UrlSelectOption[] = [
  { value: "all", label: "All priorities" },
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
]

const DUE_OPTIONS: UrlSelectOption[] = [
  { value: "all", label: "Any due date" },
  { value: "overdue", label: "Overdue" },
  { value: "due_soon", label: "Due soon" },
  { value: "none", label: "No due date" },
]

const SORT_OPTIONS: UrlSelectOption[] = [
  { value: "due_asc", label: "Due date" },
  { value: "newest", label: "Newest" },
  { value: "priority", label: "Priority" },
]

export default async function MyTasksList({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return (
      <div className="col-span-full h-screen flex flex-col items-center justify-center gap-4 py-16">
        <p className="text-sm text-muted-foreground">
          You need to be logged in to see your tasks.
        </p>
        <Link href="/auth/login">
          <Button>Log in</Button>
        </Link>
      </div>
    )
  }

  const params = toParams(searchParams)
  const page = Number(params.page) > 0 ? Number(params.page) : 1

  const status = ["todo", "in_progress", "in_review", "blocked", "done"].includes(
    params.status ?? ""
  )
    ? (params.status as TaskStatus)
    : undefined
  const priority = ["urgent", "high", "medium", "low"].includes(params.priority ?? "")
    ? (params.priority as TaskPriority)
    : undefined
  const due =
    params.due === "overdue" || params.due === "due_soon" || params.due === "none"
      ? params.due
      : undefined
  const sort = (
    ["due_asc", "newest", "priority"].includes(params.sort ?? "")
      ? params.sort
      : "due_asc"
  ) as TaskSort

  const pageSize = PAGE_SIZES.tasks

  const [result, memberships, projectRows] = await Promise.all([
    getUserAssignedTasks(session.user.id, {
      page,
      pageSize,
      filters: {
        status,
        priority,
        due,
        workspaceId: params.workspace,
        projectId: params.project,
      },
      sort,
    }),
    getUserWorkSpaces(session.user.id),
    getUserProjects(session.user.id, { pageSize: 200 }),
  ])

  const tasks = result.items
  const total = result.total

  const workspaceOptions: UrlSelectOption[] = [
    { value: "all", label: "All workspaces" },
    ...memberships.map((m) => ({
      value: m.workspace.id,
      label: m.workspace.name,
    })),
  ]

  const selectedWorkspaceId = params.workspace
  const projectOptions: UrlSelectOption[] = [
    { value: "all", label: "All projects" },
    ...projectRows.items
      .filter(
        (p) =>
          !selectedWorkspaceId ||
          p.workspaceId === selectedWorkspaceId
      )
      .map((p) => ({ value: p.id, label: p.name })),
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <UrlSelect
          param="status"
          value={status}
          options={STATUS_OPTIONS}
          params={params}
          ariaLabel="Filter tasks by status"
        />
        <UrlSelect
          param="priority"
          value={priority}
          options={PRIORITY_OPTIONS}
          params={params}
          ariaLabel="Filter tasks by priority"
        />
        <UrlSelect
          param="due"
          value={due}
          options={DUE_OPTIONS}
          params={params}
          ariaLabel="Filter tasks by due date"
        />
        <UrlSelect
          param="workspace"
          value={selectedWorkspaceId}
          options={workspaceOptions}
          params={params}
          ariaLabel="Filter tasks by workspace"
        />
        <UrlSelect
          param="project"
          value={params.project}
          options={projectOptions}
          params={params}
          ariaLabel="Filter tasks by project"
        />
        <UrlSelect
          param="sort"
          value={sort}
          options={SORT_OPTIONS}
          params={params}
          ariaLabel="Sort tasks"
        />
      </div>

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <ListTodo className="size-8 text-muted-foreground/60" />
          <p className="mt-4 text-sm font-medium text-foreground">
            No tasks match these filters
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Try clearing a filter or two.
          </p>
        </div>
      ) : (
        <>
          <div className="grid max-h-[60vh] grid-cols-1 gap-4 overflow-y-auto scrollbar-thin sm:grid-cols-2 lg:grid-cols-3">
            {tasks.map((task) => (
              <UserTaskCard key={task.id} task={task} />
            ))}
          </div>

          <ListPager
            page={page}
            total={total}
            pageSize={pageSize}
            params={params}
            noun="tasks"
          />
        </>
      )}
    </div>
  )
}