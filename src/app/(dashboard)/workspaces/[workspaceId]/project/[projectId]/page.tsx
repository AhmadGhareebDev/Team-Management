import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { getProjectById, getUserProjectAccess } from "@/db/queries/project"
import CanvasStage from "@/components/canvas/CanvasStage"
import { getProjectTasks } from "@/db/queries/task"

export const instant = false

export default async function ProjectCanvasPage({
    params,
    searchParams,
}: { params: Promise<{ workspaceId: string; projectId: string }>, searchParams: Promise<{ task?: string }> }) {
    const { workspaceId, projectId } = await params
    const session = await auth.api.getSession({ headers: await headers() })
    const project = await getProjectById(projectId)

    if (!project) {
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

    const canView =
        access?.role === "owner" ||
        access?.role === "admin" ||
        access?.isProjectMember === true

    if (!canView) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-3">
                <p className="text-lg font-medium text-foreground">
                    You don&apos;t have access to this project
                </p>
                <p className="text-sm text-muted-foreground">
                    Only project members can open this canvas.
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

    const tasks = await getProjectTasks(projectId)
    const role = access?.role ?? null

    const { task: taskParam } = await searchParams
    const initialTaskId =
        typeof taskParam === "string" && tasks.some((t) => t.id === taskParam)
            ? taskParam
            : null

    return (
        <div className="-m-6 h-[calc(100dvh-3.5rem)] overflow-hidden">
            <CanvasStage
                tasks={tasks}
                projectId={projectId}
                role={role}
                project={project}
                workspaceId={workspaceId}
                currentUserId={session!.user.id}
                initialTaskId={initialTaskId}
            />
        </div>
    )
}