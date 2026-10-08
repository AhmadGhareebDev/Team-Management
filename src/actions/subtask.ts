"use server"
import { randomUUID } from "crypto"
import { db } from "@/db"
import { task, taskAssignees, subtask } from "@/db/schemas"
import { eq, and } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { getUserProjectAccess } from "@/db/queries/project"
import { insertSubtaskSchema, type InsertSubtaskSchemaType } from "@/db/validations"
import { recordActivity } from "@/lib/activity"

async function canManageSubtasks(
    access: NonNullable<Awaited<ReturnType<typeof getUserProjectAccess>>>,
    taskId: string,
    userId: string
) {
    if (access.role === "owner" || access.role === "admin") {
        return true
    }

    const assignment = await db.query.taskAssignees.findFirst({
        where: and(
            eq(taskAssignees.taskId, taskId),
            eq(taskAssignees.userId, userId)
        ),
        columns: { id: true },
    })

    return Boolean(assignment)
}

export async function addSubtask({
    projectId,
    taskId,
    data,
}: {
    projectId: string
    taskId: string
    data: InsertSubtaskSchemaType
}) {
    const session = await auth.api.getSession({ headers: await headers() })

    if (!session) {
        return { success: false, error: "UNAUTHENTICATED" }
    }

    const parsed = insertSubtaskSchema.safeParse(data)
    if (!parsed.success) {
        return { success: false, error: "INVALID_DATA" }
    }

    const access = await getUserProjectAccess(projectId, session.user.id)
    if (!access) {
        return { success: false, error: "PROJECT_NOT_FOUND" }
    }

    const canView =
        access.role === "owner" || access.role === "admin" || access.isProjectMember
    if (!canView) {
        return { success: false, error: "FORBIDDEN" }
    }

    const existing = await db.query.task.findFirst({
        where: and(eq(task.id, taskId), eq(task.projectId, projectId)),
        columns: { id: true },
    })

    if (!existing) {
        return { success: false, error: "TASK_NOT_FOUND" }
    }

    const canManage = await canManageSubtasks(access, taskId, session.user.id)
    if (!canManage) {
        return { success: false, error: "FORBIDDEN" }
    }

    try {
        const id = randomUUID()
        await db.insert(subtask).values({
            id,
            taskId,
            createdBy: session.user.id,
            title: parsed.data.title,
        })

        await recordActivity({
            workspaceId: access.workspaceId,
            projectId,
            actorId: session.user.id,
            type: "subtask_added",
            entityType: "subtask",
            entityId: id,
            metadata: { title: parsed.data.title },
        })

        return { success: true, subtaskId: id }
    } catch {
        return { success: false, error: "INTERNAL_SERVER_ERROR" }
    }
}

export async function toggleSubtask({
    projectId,
    taskId,
    subtaskId,
}: {
    projectId: string
    taskId: string
    subtaskId: string
}) {
    const session = await auth.api.getSession({ headers: await headers() })

    if (!session) {
        return { success: false, error: "UNAUTHENTICATED" }
    }

    const access = await getUserProjectAccess(projectId, session.user.id)
    if (!access) {
        return { success: false, error: "PROJECT_NOT_FOUND" }
    }

    const canView =
        access.role === "owner" || access.role === "admin" || access.isProjectMember
    if (!canView) {
        return { success: false, error: "FORBIDDEN" }
    }

    const existing = await db.query.task.findFirst({
        where: and(eq(task.id, taskId), eq(task.projectId, projectId)),
        columns: { id: true },
    })

    if (!existing) {
        return { success: false, error: "TASK_NOT_FOUND" }
    }

    const subtaskRow = await db.query.subtask.findFirst({
        where: and(
            eq(subtask.id, subtaskId),
            eq(subtask.taskId, taskId)
        ),
        columns: { id: true, isDone: true, createdBy: true, title: true },
    })

    if (!subtaskRow) {
        return { success: false, error: "SUBTASK_NOT_FOUND" }
    }

    // Only the creator gets to tick a subtask off.
    if (subtaskRow.createdBy !== session.user.id) {
        return { success: false, error: "FORBIDDEN" }
    }

    try {
        const nowDone = !subtaskRow.isDone
        await db
            .update(subtask)
            .set({ isDone: nowDone })
            .where(eq(subtask.id, subtaskId))

        if (nowDone) {
            await recordActivity({
                workspaceId: access.workspaceId,
                projectId,
                actorId: session.user.id,
                type: "subtask_completed",
                entityType: "subtask",
                entityId: subtaskId,
                metadata: { title: subtaskRow.title },
            })
        }

        return { success: true }
    } catch {
        return { success: false, error: "INTERNAL_SERVER_ERROR" }
    }
}

export async function deleteSubtask({
    projectId,
    taskId,
    subtaskId,
}: {
    projectId: string
    taskId: string
    subtaskId: string
}) {
    const session = await auth.api.getSession({ headers: await headers() })

    if (!session) {
        return { success: false, error: "UNAUTHENTICATED" }
    }

    const access = await getUserProjectAccess(projectId, session.user.id)
    if (!access) {
        return { success: false, error: "PROJECT_NOT_FOUND" }
    }

    const canView =
        access.role === "owner" || access.role === "admin" || access.isProjectMember
    if (!canView) {
        return { success: false, error: "FORBIDDEN" }
    }

    const existing = await db.query.task.findFirst({
        where: and(eq(task.id, taskId), eq(task.projectId, projectId)),
        columns: { id: true },
    })

    if (!existing) {
        return { success: false, error: "TASK_NOT_FOUND" }
    }

    const subtaskRow = await db.query.subtask.findFirst({
        where: and(
            eq(subtask.id, subtaskId),
            eq(subtask.taskId, taskId)
        ),
        columns: { id: true, title: true },
    })

    if (!subtaskRow) {
        return { success: false, error: "SUBTASK_NOT_FOUND" }
    }

    const canDelete = await canManageSubtasks(access, taskId, session.user.id)
    if (!canDelete) {
        return { success: false, error: "FORBIDDEN" }
    }

    try {
        await db
            .delete(subtask)
            .where(eq(subtask.id, subtaskId))

        await recordActivity({
            workspaceId: access.workspaceId,
            projectId,
            actorId: session.user.id,
            type: "subtask_deleted",
            entityType: "subtask",
            entityId: subtaskId,
            metadata: { title: subtaskRow.title },
        })

        return { success: true }
    } catch {
        return { success: false, error: "INTERNAL_SERVER_ERROR" }
    }
}