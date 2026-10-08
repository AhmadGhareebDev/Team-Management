
import ProjectCard from "./ProjectCard"
import { getWorkspaceMembers, getWorkspaceProjectsWithMembers } from "@/db/queries/workspaces"
import { getProjectStats, getProgressPct, getProjectHealth } from "@/db/queries/stats"
import type { WorkspaceRole } from "@/components/web/AuthGateProvider"

export default async function ProjectList({
  workspaceId,
  role,
}: {
  workspaceId: string
  role: WorkspaceRole | null
}) {
    
    const [projects, members] = await Promise.all([
        getWorkspaceProjectsWithMembers(workspaceId),
        getWorkspaceMembers(workspaceId),
    ])

    const stats = await getProjectStats(projects.map((project) => project.id))
    const statsById = new Map(stats.map((row) => [row.projectId, row]))

    return (
        <>
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
                    health={projectStats ? getProjectHealth(projectStats) : "healthy"}
                />
            )
        })}
        </>
        
    )
}
