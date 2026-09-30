"use server"
import { randomUUID } from "crypto"
import { db } from "@/db"
import { project, projectMembers, workspaceMembers } from "@/db/schemas"
import { eq, and } from "drizzle-orm"
import { insertProjectSchema, type InsertProjectSchemaType } from "@/db/validations"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"

export async function createProject(workspaceId: string, data: InsertProjectSchemaType) {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session) {
        return { success: false, error: "UNAUTHENTICATED" }
    }

    const parsedData = insertProjectSchema.safeParse(data);

    if (!parsedData.success) {
        return { success: false, error: "INVALID_DATA" }
    }

    const membership = await db.query.workspaceMembers.findFirst({
        where: and(
            eq(workspaceMembers.workspaceId, workspaceId),
            eq(workspaceMembers.userId, session.user.id)
        )
    })

    if (!membership) {
        return { success: false, error: "UNAUTHORIZED" }
    }

    const canCreate = membership.role === "owner" || membership.role === "admin";
    if (!canCreate) {
        return { success: false, error: "FORBIDDEN" }
    }

    const projectId = randomUUID();

    try {
        await db.batch([
            db.insert(project).values({
                id: projectId,
                workspaceId,
                name: parsedData.data.name,
                description: parsedData.data.description ?? null,
            }),
            db.insert(projectMembers).values({
                id: randomUUID(),
                projectId,
                userId: session.user.id,
            }),
        ])

        return { success: true, projectId }
    } catch (error) {
        return { success: false, error: "INTERNAL_SERVER_ERROR" }
    }
}

export async function addProjectMember({
    workspaceId,
    projectId,
    userId,
}: {
    workspaceId: string
    projectId: string
    userId: string
}) {
    const session = await auth.api.getSession({ headers: await headers() })

    if (!session) {
        return { success: false, error: "UNAUTHENTICATED" }
    }

    const projectBelongsToWorkspace = await db.query.project.findFirst({
        where: and(
            eq(project.id, projectId),
            eq(project.workspaceId, workspaceId)
        )
    })

    if (!projectBelongsToWorkspace) {
        return { success: false, error: "PROJECT_NOT_FOUND" }
    }

    const membership = await db.query.workspaceMembers.findFirst({
        where: and(
            eq(workspaceMembers.workspaceId, workspaceId),
            eq(workspaceMembers.userId, session.user.id)
        )
    })

    if (!membership) {
        return { success: false, error: "UNAUTHORIZED" }
    }

    const canManage = membership.role === "owner" || membership.role === "admin"
    if (!canManage) {
        return { success: false, error: "FORBIDDEN" }
    }

    const targetIsWorkspaceMember = await db.query.workspaceMembers.findFirst({
        where: and(
            eq(workspaceMembers.workspaceId, workspaceId),
            eq(workspaceMembers.userId, userId)
        )
    })

    if (!targetIsWorkspaceMember) {
        return { success: false, error: "NOT_WORKSPACE_MEMBER" }
    }

    const alreadyInProject = await db.query.projectMembers.findFirst({
        where: and(
            eq(projectMembers.projectId, projectId),
            eq(projectMembers.userId, userId)
        )
    })

    if (alreadyInProject) {
        return { success: false, error: "ALREADY_MEMBER" }
    }

    try {
        await db.insert(projectMembers).values({
            id: randomUUID(),
            projectId,
            userId,
        })

        return { success: true }
    } catch {
        return { success: false, error: "INTERNAL_SERVER_ERROR" }
    }
}

export async function deleteProject({workspaceId, projectId}: {workspaceId: string, projectId: string}) { 

    const session = await auth.api.getSession({ headers: await headers() });
    
        if (!session) {
            return { success: false, error: "UNAUTHENTICATED" }
        }

        try {

        const projectBelongToWorkspace = await db.query.project.findFirst({
            where: and(
                eq(project.id, projectId),
                eq(project.workspaceId, workspaceId)
            )
        })

        if (!projectBelongToWorkspace) {
            return { success: false, error: "PROJECT_NOT_FOUND" }
        }

        const membership = await db.query.workspaceMembers.findFirst({
            where: and(
                eq(workspaceMembers.workspaceId, workspaceId),
                eq(workspaceMembers.userId, session.user.id)
            )
        });
    
        if (!membership) {
            return { success: false, error: "UNAUTHORIZED" }
        }
    
        const canEdit = membership.role === "owner" || membership.role === "admin";
        if (!canEdit) {
            return { success: false, error: "FORBIDDEN" }
        }

            await db.delete(project).where(eq(project.id, projectId));

            return { success: true }

        } catch (error) {
            return { success: false, error: "INTERNAL_SERVER_ERROR" }
        }

}

export async function editProjectInfo({workspaceId, projectId, data}: {workspaceId: string, projectId: string, data: InsertProjectSchemaType}) {
    const session = await auth.api.getSession({ headers: await headers() });
    
        if (!session) {
            return { success: false, error: "UNAUTHENTICATED" }
        }

        try {

        const projectBelongToWorkspace = await db.query.project.findFirst({
            where: and(
                eq(project.id, projectId),
                eq(project.workspaceId, workspaceId)
            )
        })

        if (!projectBelongToWorkspace) {
            return { success: false, error: "PROJECT_NOT_FOUND" }
        }

        const membership = await db.query.workspaceMembers.findFirst({
            where: and(
                eq(workspaceMembers.workspaceId, workspaceId),
                eq(workspaceMembers.userId, session.user.id)
            )
        });
    
        if (!membership) {
            return { success: false, error: "UNAUTHORIZED" }
        }
    
        const canEdit = membership.role === "owner" || membership.role === "admin";
        if (!canEdit) {
            return { success: false, error: "FORBIDDEN" }
        }

        const parsedData = insertProjectSchema.safeParse(data);

        if (!parsedData.success) {
            return { success: false, error: "INVALID_DATA" }
        }


        await db.update(project)
                .set({
                    name: parsedData.data.name,
                    description: parsedData.data.description,
                })
                .where(eq(project.id, projectId));

        return { success: true }

    } catch (error) {
        return { success: false, error: "INTERNAL_SERVER_ERROR" }
    }
}

export async function removeProjectMember({ workspaceId, projectId, userId }: { workspaceId: string, projectId: string, userId: string }) {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session) {
        return { success: false, error: "UNAUTHENTICATED" }
    }

    try {

        const projectBelongToWorkspace = await db.query.project.findFirst({
            where: and(
                eq(project.id, projectId),
                eq(project.workspaceId, workspaceId)
            )
        })

        if (!projectBelongToWorkspace) {
            return { success: false, error: "PROJECT_NOT_FOUND" }
        }

        const membership = await db.query.workspaceMembers.findFirst({
            where: and(
                eq(workspaceMembers.workspaceId, workspaceId),
                eq(workspaceMembers.userId, session.user.id)
            )
        });

        if (!membership) {
            return { success: false, error: "UNAUTHORIZED" }
        }

        const canEdit = membership.role === "owner" || membership.role === "admin";
        if (!canEdit) {
            return { success: false, error: "FORBIDDEN" }
        }

        const memberInProject = await db.query.projectMembers.findFirst({
            where: and(
                eq(projectMembers.projectId, projectId),
                eq(projectMembers.userId, userId)
            )
        });

        if (!memberInProject) {
            return { success: false, error: "NOT_PROJECT_MEMBER" }
        }

        await db.delete(projectMembers)
            .where(and(
                eq(projectMembers.projectId, projectId),
                eq(projectMembers.userId, userId)
            ));

        return { success: true }

    } catch (error) {
        return { success: false, error: "INTERNAL_SERVER_ERROR" }
    }
}