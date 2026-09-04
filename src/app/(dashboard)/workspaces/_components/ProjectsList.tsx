
import ProjectCard from "./ProjectCard"
import { getWorkspaceProjectsWithMembers } from "@/db/queries/workspaces"

export default async function ProjectList({ workspaceId }: { workspaceId: string }) {
    
    const projects = await getWorkspaceProjectsWithMembers(workspaceId)


    return (
        <>
        {projects.map((project) => (
                      <ProjectCard key={project.id} project={project} />
                    ))}
        </>
        
    )
}