import { db } from "@/db";
import { activity, workspaceMembers } from "@/db/schemas";
import { desc, eq, inArray, sql } from "drizzle-orm";

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

    const memberships = await db.query.workspaceMembers.findMany({
        where: eq(workspaceMembers.userId, userId),
        columns: { workspaceId: true },
    });

    const workspaceIds = [...new Set(memberships.map((m) => m.workspaceId))];
    if (workspaceIds.length === 0) {
        return { items: [], total: 0 };
    }

    const scoped =
        options.filters?.workspaceId &&
        workspaceIds.includes(options.filters.workspaceId)
            ? [options.filters.workspaceId]
            : workspaceIds;

    const where = inArray(activity.workspaceId, scoped);

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