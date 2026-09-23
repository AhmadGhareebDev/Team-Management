import { db } from "@/db";
import { task } from "@/db/schemas";
import { eq } from "drizzle-orm";

export async function getProjectTasks(projectId: string) {
    return await db.query.task.findMany({
        where: eq(task.projectId, projectId),
        columns: {
            id: true,
            title: true,
            description: true,
            status: true,
            priority: true,
            dueDate: true,
            positionX: true,
            positionY: true,
        },
        with: {
            assignees: {
                columns: {},
                with: {
                    user: {
                        columns: { id: true, name: true, username: true, avatar_url: true },
                    },
                },
            },
            blockedBy: {
                columns: { id: true },
                with: {
                    dependsOn: {
                        columns: { id: true, title: true, status: true, dueDate: true },
                    },
                },
            },
            subtasks: {
                columns: { id: true, title: true, isDone: true, createdAt: true },
                with: {
                    createdBy: { columns: { id: true } },
                },
            },
        },
    });
}
export type ProjectTask = Awaited<ReturnType<typeof getProjectTasks>>[number];