import Link from "next/link"
import { headers } from "next/headers"
import { FolderKanban } from "lucide-react"
import { auth } from "@/lib/auth"
import {
  getUserWorkSpaces,
  getWorkspaceMembersForWorkspaces,
} from "@/db/queries/workspaces"
import { getUserProjects } from "@/db/queries/project"
import { getProjectStats, getProgressPct, getProjectHealth } from "@/db/queries/stats"
import { Button } from "@/components/ui/button"
import type { WorkspaceRole } from "@/components/web/AuthGateProvider"
import ProjectCard from "../../workspaces/_components/ProjectCard"

export default async function MyProjectsList() {
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

  const [projects, memberships] = await Promise.all([
    getUserProjects(userId),
    getUserWorkSpaces(userId),
  ])

  if (projects.length === 0) {
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

  return (
    <div className="flex flex-col gap-8">
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
                  health={projectStats ? getProjectHealth(projectStats) : "healthy"}
                />
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}