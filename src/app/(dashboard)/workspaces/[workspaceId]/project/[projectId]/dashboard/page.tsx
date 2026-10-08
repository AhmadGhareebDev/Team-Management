import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { getProjectById, getUserProjectAccess } from "@/db/queries/project"
import { getProjectTasks } from "@/db/queries/task"
import { getProjectStats } from "@/db/queries/stats"
import ProjectDashboard from "./_components/ProjectDashboard"

export const instant = false

export default async function ProjectDashboardPage({
    params,
}: {
    params: Promise<{ workspaceId: string; projectId: string }>
}) {
    const { workspaceId, projectId } = await params
    const session = await auth.api.getSession({ headers: await headers() })
    const project = await getProjectById(projectId)

    if (!project || project.workspaceId !== workspaceId) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-3">
                <p className="text-lg text-muted-foreground">Project not found</p>
                <Link
                    href={`/workspaces/${workspaceId}`}
                    className={buttonVariants({ variant: "secondary" })}
                >
                    <ArrowLeft className="size-4" /> Go back
                </Link>
            </div>
        )
    }

    const access = session
        ? await getUserProjectAccess(projectId, session.user.id)
        : null

    if (!access) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-3">
                <p className="text-lg font-medium text-foreground">
                    You don&apos;t have access to this project
                </p>
                <p className="text-sm text-muted-foreground">
                    Only project members can open this dashboard.
                </p>
                <Link
                    href={`/workspaces/${workspaceId}`}
                    className={buttonVariants({ variant: "secondary" })}
                >
                    <ArrowLeft className="size-4" /> Go back
                </Link>
            </div>
        )
    }

    const isManager = access.role === "owner" || access.role === "admin"

    if (!isManager) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-3">
                <p className="text-lg font-medium text-foreground">
                    You don&apos;t have access to this dashboard
                </p>
                <p className="text-sm text-muted-foreground">
                    Only workspace owners and admins can view project dashboards.
                </p>
                <Link
                    href={`/workspaces/${workspaceId}/project/${projectId}`}
                    className={buttonVariants({ variant: "secondary" })}
                >
                    <ArrowLeft className="size-4" /> Back to canvas
                </Link>
            </div>
        )
    }

    const [tasks, statsRows] = await Promise.all([
        getProjectTasks(projectId),
        getProjectStats([projectId]),
    ])

    return (
        <ProjectDashboard
            workspaceId={workspaceId}
            project={project}
            tasks={tasks}
            stats={statsRows[0]}
        />
    )
}
