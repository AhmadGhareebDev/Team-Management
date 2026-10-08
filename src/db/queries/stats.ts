import { db } from "@/db";
import { task } from "@/db/schemas";
import { inArray, sql } from "drizzle-orm";

export type ProjectStats = {
    projectId: string;
    total: number;
    done: number;
    inProgress: number;
    inReview: number;
    todo: number;
    blocked: number;
    overdue: number;
};

export type ProjectHealth = "healthy" | "at_risk";

export async function getProjectStats(projectIds: string[]): Promise<ProjectStats[]> {
    const uniqueIds = [...new Set(projectIds)];

    if (uniqueIds.length === 0) {
        return [];
    }

    const rows = await db
        .select({
            projectId: task.projectId,
            total: sql<number>`count(*)::int`,
            done: sql<number>`count(*) filter (where ${task.status} = 'done')::int`,
            inProgress: sql<number>`count(*) filter (where ${task.status} = 'in_progress')::int`,
            inReview: sql<number>`count(*) filter (where ${task.status} = 'in_review')::int`,
            todo: sql<number>`count(*) filter (where ${task.status} = 'todo')::int`,
            blocked: sql<number>`count(*) filter (where ${task.status} = 'blocked')::int`,
            overdue: sql<number>`count(*) filter (where ${task.dueDate} is not null and ${task.dueDate} < now() and ${task.status} <> 'done')::int`,
        })
        .from(task)
        .where(inArray(task.projectId, uniqueIds))
        .groupBy(task.projectId);

    const byProjectId = new Map(rows.map((row) => [row.projectId, row]));

    return uniqueIds.map(
        (projectId) =>
            byProjectId.get(projectId) ?? {
                projectId,
                total: 0,
                done: 0,
                inProgress: 0,
                inReview: 0,
                todo: 0,
                blocked: 0,
                overdue: 0,
            }
    );
}

export function getProgressPct(stats: ProjectStats) {
    if (stats.total === 0) {
        return 0;
    }

    return Math.round((stats.done / stats.total) * 100);
}

export function getProjectHealth(stats: ProjectStats): ProjectHealth {
    return stats.overdue > 0 ? "at_risk" : "healthy";
}
