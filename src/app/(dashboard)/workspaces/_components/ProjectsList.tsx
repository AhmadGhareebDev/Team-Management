
import ProjectCard from "./ProjectCard"
import { getWorkspaceProjectsWithMembers } from "@/db/queries/workspaces"
import type { WorkspaceRole } from "@/components/web/AuthGateProvider"

export default async function ProjectList({
  workspaceId,
  role,
}: {
  workspaceId: string
  role: WorkspaceRole | null
}) {
    
    const projects = await getWorkspaceProjectsWithMembers(workspaceId)


    return (
        <>
        {projects.map((project) => (
                      <ProjectCard key={project.id} project={project} workspaceId={workspaceId} role={role} />
                    ))}
        </>
        
    )
}