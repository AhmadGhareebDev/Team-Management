import { db } from "@/db";
import { workspaceMembers } from "@/db/schemas/workspaceMembers";
import { project } from "@/db/schemas/project";
import { eq, and } from "drizzle-orm";
import { workspace } from "@/db/schemas"






export async function getUserWorkSpaces(userId: string) {
    return await db.query.workspaceMembers.findMany({
        where: eq(workspaceMembers.userId, userId),
        with: {
            workspace: {
                columns: {
                    id: true,
                    name: true,
                }
            }
        }
    })
}
export type WorkspaceWithRole = Awaited<ReturnType<typeof getUserWorkSpaces>>[number];

export  async function getWorkspaceById(workspaceId: string) {
    return await db.query.workspace.findFirst({
        where: eq(workspace.id , workspaceId),
        columns: {
            id: true,
            name: true,
        }

    })
}
export type Workspace = Awaited<ReturnType<typeof getWorkspaceById>>;

export async function getUserWorkspaceRole(workspaceId: string, userId: string) {
    const membership = await db.query.workspaceMembers.findFirst({
        where: and(
            eq(workspaceMembers.workspaceId, workspaceId),
            eq(workspaceMembers.userId, userId)
        ),
        columns: {
            role: true,
        }
    })

    return membership?.role ?? null
}


export async function getWorkspaceMembers(workspaceId: string) {
    return await db.query.workspaceMembers.findMany({
        where: eq(workspaceMembers.workspaceId , workspaceId),
        with: {
            user: {
                columns: {
                    id: true,
                    name: true,
                    username: true,
                    avatar_url: true,
                }
            }
        }
    })

}
export type WorkspaceMemberWithUser = Awaited<ReturnType<typeof getWorkspaceMembers>>[number];


export async function getWorkspaceProjectsWithMembers(workspaceId: string) {
    return await db.query.project.findMany({
        where: eq(project.workspaceId, workspaceId),
        columns: {
            id: true,
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
                            avatar_url: true,
                        }
                    }
                }
            }
        }
    })
}
export type WorkspaceProjectWithMembers = Awaited<ReturnType<typeof getWorkspaceProjectsWithMembers>>[number];