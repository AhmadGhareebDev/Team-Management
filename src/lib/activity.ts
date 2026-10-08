import { randomUUID } from "crypto";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { activity, activityTypeEnum, user, type ActivityMetadata } from "@/db/schemas";

export type ActivityType = (typeof activityTypeEnum.enumValues)[number];

type RecordActivityInput = {
    workspaceId: string;
    projectId?: string | null;
    actorId: string;
    type: ActivityType;
    entityType: string;
    entityId: string;
    metadata?: ActivityMetadata;
};

export async function recordActivity(input: RecordActivityInput) {
    try {
        await db.insert(activity).values({
            id: randomUUID(),
            workspaceId: input.workspaceId,
            projectId: input.projectId ?? null,
            actorId: input.actorId,
            type: input.type,
            entityType: input.entityType,
            entityId: input.entityId,
            metadata: input.metadata ?? {},
        });
    } catch (error) {
        console.error("Failed to record activity:", error);
    }
}

export async function getUserNames(userIds: string[]): Promise<Map<string, string>> {
    const unique = [...new Set(userIds.filter(Boolean))];
    if (unique.length === 0) {
        return new Map();
    }

    try {
        const rows = await db.query.user.findMany({
            where: inArray(user.id, unique),
            columns: { id: true, name: true },
        });
        return new Map(rows.map((row) => [row.id, row.name ?? ""]));
    } catch (error) {
        console.error("Failed to load user names:", error);
        return new Map();
    }
}
