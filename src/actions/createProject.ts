"use server"
import { randomUUID } from "crypto";
import { db } from "@/db";
import { project, projectMembers, workspaceMembers } from "@/db/schemas";
import { insertProjectSchema, type InsertProjectSchemaType } from "@/db/validations";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, and } from "drizzle-orm";

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
                cover_url: parsedData.data.cover_url,
                cover_file_id: parsedData.data.cover_file_id,
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