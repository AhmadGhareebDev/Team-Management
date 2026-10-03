"use server"
import { randomUUID } from "crypto"
import { db } from "@/db"
import { project, projectMembers, workspaceMembers, task, taskAssignees, notification } from "@/db/schemas"
import { eq, and, inArray } from "drizzle-orm"
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
        ),
        columns: { id: true, name: true }
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

        // The added member should find out straight away. A notification
        // failure must never undo the membership itself.
        try {
            await db.insert(notification).values({
                id: randomUUID(),
                userId,
                actorId: session.user.id,
                workspaceId,
                projectId,
                type: "project_member_added",
                body: `${session.user.name ?? "Someone"} added you to the project "${projectBelongsToWorkspace.name}".`,
            })
        } catch (error) {
            console.error("Error notifying added project member:", error)
        }

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

        const projectTaskIds = await db.query.task.findMany({
            where: eq(task.projectId, projectId),
            columns: { id: true, title: true },
        })

        const taskIds = projectTaskIds.map((t) => t.id)

        const memberAssignments =
            taskIds.length > 0
                ? await db.query.taskAssignees.findMany({
                    where: and(
                        eq(taskAssignees.userId, userId),
                        inArray(taskAssignees.taskId, taskIds)
                    ),
                    columns: { taskId: true },
                })
                : []

        // Captured before the delete below so the notification can say which
        // tasks the person lost.
        const removedTitles = projectTaskIds
            .filter((t) => memberAssignments.some((a) => a.taskId === t.id))
            .map((t) => t.title)

        // Drop their assignments in this project's tasks too, otherwise they keep
        // tasks they can no longer open (task_assignees has no project_members FK).
        await db.batch([
            db.delete(projectMembers)
                .where(and(
                    eq(projectMembers.projectId, projectId),
                    eq(projectMembers.userId, userId)
                )),
            ...(taskIds.length > 0
                ? [
                    db.delete(taskAssignees).where(and(
                        eq(taskAssignees.userId, userId),
                        inArray(taskAssignees.taskId, taskIds)
                    )),
                ]
                : []),
        ])

        // Tell the person who was removed, but never let a notification failure
        // turn a completed removal into an error.
        try {
            const projectRow = await db.query.project.findFirst({
                where: eq(project.id, projectId),
                columns: { name: true },
            })

            const actorName = session.user.name ?? "An admin"
            const projectName = projectRow?.name ?? "the project"
            const body =
                removedTitles.length > 0
                    ? `${actorName} removed you from the project "${projectName}". Tasks now unassigned: ${removedTitles.map((t) => `"${t}"`).join(", ")}.`
                    : `${actorName} removed you from the project "${projectName}".`

            await db.insert(notification).values({
                id: randomUUID(),
                userId,
                actorId: session.user.id,
                workspaceId,
                projectId,
                type: "member_removed",
                body,
            })
        } catch (error) {
            console.error("Error notifying removed project member:", error)
        }

        return { success: true }

    } catch (error) {
        return { success: false, error: "INTERNAL_SERVER_ERROR" }
    }
}