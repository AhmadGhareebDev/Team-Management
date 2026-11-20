import { sql, type SQL } from "drizzle-orm"
import { db } from "@/db"

/**
 * Recomputes blocked/todo for a set of tasks in a single statement.
 *
 * This runs as one atomic UPDATE rather than a read-then-write pair, and it
 * updates the whole set at once instead of looping one HTTP request per task.
 * The previous version read each dependent's status, computed the answer in JS,
 * then wrote it back, so concurrent dependency edits could interleave and leave
 * a stale value. RETURNING gives callers "which rows actually changed".
 *
 * db.transaction() is not an option here: the neon-http driver has none.
 */
function blockedUpdate(targets: SQL) {
    return sql`
        WITH targets AS (${targets}),
        pending AS (
            SELECT t.task_id,
                   EXISTS (
                       SELECT 1
                       FROM task_dependencies d
                       JOIN "task" dep ON dep.id = d.depends_on_id
                       WHERE d.task_id = t.task_id AND dep.status <> 'done'
                   ) AS has_pending
            FROM targets t
        )
        UPDATE "task" t
        SET status = (CASE WHEN p.has_pending THEN 'blocked' ELSE 'todo' END)::task_status,
            updated_at = now()
        FROM pending p
        WHERE t.id = p.task_id
          AND (
                (p.has_pending AND t.status <> 'blocked')
             OR (NOT p.has_pending AND t.status = 'blocked')
          )
        RETURNING t.id
    `
}

function changedIds(result: unknown): string[] {
    return (result as { rows?: { id: string }[] }).rows?.map((row) => row.id) ?? []
}

export async function syncTasksBlocked(taskIds: string[]): Promise<string[]> {
    if (taskIds.length === 0) return []

    const idList = sql.join(taskIds.map((id) => sql`${id}`), sql`, `)
    const result = await db.execute(
        blockedUpdate(sql`select unnest(array[${idList}]) as task_id`)
    )

    return changedIds(result)
}

/**
 * Re-evaluates every task blocked by `dependsOnId`. Returns the ids whose
 * status changed so callers can tell other viewers about them; a status change
 * on one task can silently rewrite many others.
 */
export async function recomputeDependents(dependsOnId: string): Promise<string[]> {
    const result = await db.execute(
        blockedUpdate(
            sql`select task_id from task_dependencies where depends_on_id = ${dependsOnId}`
        )
    )

    return changedIds(result)
}
