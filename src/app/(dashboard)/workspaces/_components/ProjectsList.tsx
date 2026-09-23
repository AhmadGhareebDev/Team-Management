
import ProjectCard from "./ProjectCard"
import { getWorkspaceMembers, getWorkspaceProjectsWithMembers } from "@/db/queries/workspaces"
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

    return (
        <>
        {projects.map((project) => (
                      <ProjectCard key={project.id} project={project} workspaceId={workspaceId} role={role} members={members} />
                    ))}
        </>
        
    )
}