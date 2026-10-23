import { db } from "@/db";
import { activity, workspaceMembers } from "@/db/schemas";
import { and, desc, eq, inArray, sql } from "drizzle-orm";

export type ActivityFilters = {
    workspaceId?: string;
};

export async function getRecentActivityForUser(
    userId: string,
    options: {
        limit?: number;
        offset?: number;
        filters?: ActivityFilters;
    } = {}
) {
    const limit = options.limit ?? 15;
    const offset = options.offset ?? 0;

    if (!userId) {
        return { items: [], total: 0 };
    }

    // One query instead of a membership lookup followed by an activity lookup.
    // The membership subquery also makes an explicit workspace filter safe: a
    // workspace the user does not belong to yields no rows.
    const where = and(
        inArray(
            activity.workspaceId,
            db
                .select({ workspaceId: workspaceMembers.workspaceId })
                .from(workspaceMembers)
                .where(eq(workspaceMembers.userId, userId))
        ),
        options.filters?.workspaceId
            ? eq(activity.workspaceId, options.filters.workspaceId)
            : undefined
    );

    const [items, countRows] = await Promise.all([
        db.query.activity.findMany({
            where,
            orderBy: [desc(activity.createdAt)],
            limit,
            offset,
            with: {
                actor: { columns: { id: true, name: true, avatar_url: true } },
                project: { columns: { id: true, name: true } },
                workspace: { columns: { id: true, name: true } },
            },
        }),
        db
            .select({ count: sql<number>`count(*)::int` })
            .from(activity)
            .where(where),
    ]);

    return { items, total: countRows[0]?.count ?? 0 };
}

export type RecentActivity = Awaited<
    ReturnType<typeof getRecentActivityForUser>
>["items"][number];