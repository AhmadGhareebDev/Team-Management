import { db } from "@/db";
import { project , projectMembers , workspaceMembers } from "@/db/schemas";
import { eq , and } from "drizzle-orm"

export async function getProjectById(projectId: string) {
    return await db.query.project.findFirst({
        where: eq(project.id, projectId),
        columns: {
            id: true,
            workspaceId: true,
            name: true,
            description: true,
        },
        with: {
            members: {
                columns: {},
                with: {
                    user: {
                        columns: {
                            id: true,
                            name: true,
                            username: true,
                            avatar_url: true,
                        },
                    },
                },
            },
        },
    });
}
export type ProjectWithMembers = Awaited<ReturnType<typeof getProjectById>>;

export async function getUserProjectAccess(projectId: string, userId: string) {
    const projectRow = await db.query.project.findFirst({
        where: eq(project.id, projectId),
        columns: { id: true, workspaceId: true },
    });

    if (!projectRow) return null;

    const workspaceMembership = await db.query.workspaceMembers.findFirst({
        where: and(
            eq(workspaceMembers.workspaceId, projectRow.workspaceId),
            eq(workspaceMembers.userId, userId)
        ),
        columns: { role: true },
    });

    const projectMembership = await db.query.projectMembers.findFirst({
        where: and(
            eq(projectMembers.projectId, projectId),
            eq(projectMembers.userId, userId)
        ),
        columns: { id: true },
    });

    return {
        workspaceId: projectRow.workspaceId,
        role: workspaceMembership?.role ?? null,
        isProjectMember: Boolean(projectMembership),
    };
}
export type UserProjectAccess = Awaited<ReturnType<typeof getUserProjectAccess>>;