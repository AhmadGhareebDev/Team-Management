import Link from "next/link"
import { headers } from "next/headers"
import { FolderKanban } from "lucide-react"
import { auth } from "@/lib/auth"
import {
  getUserWorkSpaces,
  getWorkspaceMembersForWorkspaces,
} from "@/db/queries/workspaces"
import { getUserProjects, type ProjectSort } from "@/db/queries/project"
import ListPager from "@/components/web/ListPager"
import UrlSelect from "@/components/web/UrlSelect"
import type { UrlSelectOption } from "@/components/web/UrlSelect"
import { PAGE_SIZES, toParams } from "@/lib/pagination"
import { getProjectStats, getProgressPct, getProjectHealth } from "@/db/queries/stats"
import { Button } from "@/components/ui/button"
import type { WorkspaceRole } from "@/components/web/AuthGateProvider"
import ProjectCard from "../../workspaces/_components/ProjectCard"

const HEALTH_OPTIONS: UrlSelectOption[] = [
  { value: "all", label: "All health" },
  { value: "at_risk", label: "At risk" },
  { value: "healthy", label: "Healthy" },
]

const SORT_OPTIONS: UrlSelectOption[] = [
  { value: "newest", label: "Newest" },
  { value: "nearest_deadline", label: "Nearest deadline" },
  { value: "name", label: "Name" },
]

export default async function MyProjectsList({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 py-16">
        <p className="text-sm text-muted-foreground">
          You need to be logged in to see your projects.
        </p>
        <Link href="/auth/login">
          <Button>Log in</Button>
        </Link>
      </div>
    )
  }

  const userId = session.user.id
  const params = toParams(searchParams)
  const page = Number(params.page) > 0 ? Number(params.page) : 1
  const health =
    params.health === "at_risk" || params.health === "healthy"
      ? params.health
      : undefined
  const sort = (
    ["newest", "nearest_deadline", "name"].includes(params.sort ?? "")
      ? params.sort
      : "newest"
  ) as ProjectSort
  const pageSize = PAGE_SIZES.projects

  const [projectsResult, memberships] = await Promise.all([
    getUserProjects(userId, {
      page,
      pageSize,
      filters: { health, workspaceId: params.workspace },
      sort,
    }),
    getUserWorkSpaces(userId),
  ])
  const projects = projectsResult.items
  const total = projectsResult.total

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <FolderKanban className="size-8 text-muted-foreground/60" />
        <p className="mt-4 text-sm font-medium text-foreground">
          You are not a member of any project yet
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Projects you join will show up here.
        </p>
      </div>
    )
  }

  const workspaceIds = [...new Set(projects.map((p) => p.workspaceId))]
  const memberRows = await getWorkspaceMembersForWorkspaces(workspaceIds)
  const statsRows = await getProjectStats(projects.map((p) => p.id))
  const statsById = new Map(statsRows.map((row) => [row.projectId, row]))

  const roleByWorkspace = new Map<string, WorkspaceRole | null>(
    memberships.map((m) => [m.workspace.id, m.role])
  )
  const workspaceNameById = new Map(
    memberships.map((m) => [m.workspace.id, m.workspace.name])
  )
  const membersByWorkspace = new Map<string, typeof memberRows>()
  for (const row of memberRows) {
    const list = membersByWorkspace.get(row.workspaceId) ?? []
    list.push(row)
    membersByWorkspace.set(row.workspaceId, list)
  }

  const grouped = new Map<string, typeof projects>()
  for (const project of projects) {
    const list = grouped.get(project.workspaceId) ?? []
    list.push(project)
    grouped.set(project.workspaceId, list)
  }

  const orderedWorkspaceIds = workspaceIds
    .filter((id) => grouped.has(id))
    .sort((a, b) =>
      (workspaceNameById.get(a) ?? "zzz").localeCompare(
        workspaceNameById.get(b) ?? "zzz"
      )
    )

  const workspaceOptions: UrlSelectOption[] = [
    { value: "all", label: "All workspaces" },
    ...memberships.map((m) => ({
      value: m.workspace.id,
      label: m.workspace.name,
    })),
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <UrlSelect
          param="health"
          value={health}
          options={HEALTH_OPTIONS}
          params={params}
          ariaLabel="Filter projects by health"
        />
        <UrlSelect
          param="workspace"
          value={params.workspace}
          options={workspaceOptions}
          params={params}
          ariaLabel="Filter projects by workspace"
        />
        <UrlSelect
          param="sort"
          value={sort}
          options={SORT_OPTIONS}
          params={params}
          ariaLabel="Sort projects"
        />
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <FolderKanban className="size-8 text-muted-foreground/60" />
          <p className="mt-4 text-sm font-medium text-foreground">
            No projects match these filters
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Try clearing a filter or two.
          </p>
        </div>
      ) : (
        <>
          <div className="flex max-h-[60vh] flex-col gap-8 overflow-y-auto scrollbar-thin">
            {orderedWorkspaceIds.map((workspaceId) => (
              <section key={workspaceId} className="flex flex-col gap-4">
                <h2 className="text-lg font-semibold text-foreground">
                  {workspaceNameById.get(workspaceId) ?? "Unknown workspace"}
                </h2>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {grouped.get(workspaceId)!.map((project) => {
                    const projectStats = statsById.get(project.id)

                    return (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        workspaceId={workspaceId}
                        role={roleByWorkspace.get(workspaceId) ?? null}
                        members={membersByWorkspace.get(workspaceId) ?? []}
                        progress={projectStats ? getProgressPct(projectStats) : 0}
                        health={
                          projectStats ? getProjectHealth(projectStats) : "healthy"
                        }
                      />
                    )
                  })}
                </div>
              </section>
            ))}
          </div>

          <ListPager
            page={page}
            total={total}
            pageSize={pageSize}
            params={params}
            noun="projects"
          />
        </>
      )}
    </div>
  )
}