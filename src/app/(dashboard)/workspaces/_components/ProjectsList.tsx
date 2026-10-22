import ProjectCard from "./ProjectCard"
import {
  getWorkspaceMembers,
  getWorkspaceProjectsWithMembers,
} from "@/db/queries/workspaces"
import {
  getProjectStats,
  getProgressPct,
  getProjectHealth,
} from "@/db/queries/stats"
import type { ProjectHealth } from "@/db/queries/stats"
import type { ProjectFilters, ProjectSort } from "@/db/queries/project"
import type { WorkspaceRole } from "@/components/web/AuthGateProvider"
import { PAGE_SIZES, toParams } from "@/lib/pagination"
import ListPager from "@/components/web/ListPager"
import UrlSelect from "@/components/web/UrlSelect"
import type { UrlSelectOption } from "@/components/web/UrlSelect"
import { EmptyState } from "@/components/web/EmptyState"
import { FolderKanban } from "lucide-react"
import { CreateProject } from "./CreateProject"

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

export default async function ProjectList({
  workspaceId,
  role,
  searchParams,
}: {
  workspaceId: string
  role: WorkspaceRole | null
  searchParams: Record<string, string | string[] | undefined>
}) {
  const params = toParams(searchParams)
  const page = Number(params.page) > 0 ? Number(params.page) : 1
  const health = params.health === "at_risk" || params.health === "healthy"
    ? params.health
    : undefined
  const sort = (
    params.sort === "nearest_deadline" || params.sort === "name"
      ? params.sort
      : "newest"
  ) as ProjectSort

  const filters: ProjectFilters = { health }
  const pageSize = PAGE_SIZES.workspaceProjects

  const [projectsResult, members] = await Promise.all([
    getWorkspaceProjectsWithMembers(workspaceId, { page, pageSize, filters, sort }),
    getWorkspaceMembers(workspaceId),
  ])

  const projects = projectsResult.items
  const total = projectsResult.total

  const stats = await getProjectStats(projects.map((project) => project.id))
  const statsById = new Map(stats.map((row) => [row.projectId, row]))

  return (
    <div className="flex flex-col gap-4">
      <div
        role="group"
        aria-label="Filter and sort projects"
        className="flex flex-wrap items-center gap-2"
      >
        <UrlSelect
          param="health"
          value={health}
          options={HEALTH_OPTIONS}
          params={params}
          ariaLabel="Filter projects by health"
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
        <EmptyState
          icon={FolderKanban}
          title={
            total === 0
              ? "No projects in this workspace yet"
              : "No projects match these filters"
          }
          description={
            total === 0
              ? "Create a project to give your team a place to plan and track work."
              : "Try clearing a filter or two."
          }
          action={
            total === 0 ? (
              <CreateProject workspaceId={workspaceId} role={role} />
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {projects.map((project) => {
              const projectStats = statsById.get(project.id)

              return (
                <ProjectCard
                  key={project.id}
                  project={project}
                  workspaceId={workspaceId}
                  role={role}
                  members={members}
                  progress={projectStats ? getProgressPct(projectStats) : 0}
                  health={
                    projectStats
                      ? (getProjectHealth(projectStats) as ProjectHealth)
                      : "healthy"
                  }
                />
              )
            })}
          </div>

          {total > 0 && (
            <ListPager
              page={page}
              total={total}
              pageSize={pageSize}
              params={params}
              noun="projects"
            />
          )}
        </>
      )}
    </div>
  )
}