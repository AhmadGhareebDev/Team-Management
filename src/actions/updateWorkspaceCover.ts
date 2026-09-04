"use server"
import { db } from "@/db";
import { workspace, workspaceMembers } from "@/db/schemas";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { imagekit } from "@/lib/imagekit";
import { headers } from "next/headers";

export async function updateWorkspaceCover({
    workspaceId,
    coverUrl,
    coverFileId,
}: {
    workspaceId: string;
    coverUrl: string;
    coverFileId: string;
}) {

    const session = await auth.api.getSession({ headers: await headers() });

    if (!session) {
        return { success: false, error: "UNAUTHENTICATED" }
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

    const current = await db.query.workspace.findFirst({
        where: eq(workspace.id, workspaceId),
        columns: {
            cover_file_id: true,
        }
    });

    try {
        await db.update(workspace)
            .set({
                cover_url: coverUrl,
                cover_file_id: coverFileId,
            })
            .where(eq(workspace.id, workspaceId));

        if (current?.cover_file_id && current.cover_file_id !== coverFileId) {
            await imagekit.deleteFile(current.cover_file_id);
        }

        return { success: true }

    } catch (error) {
        return { success: false, error: "INTERNAL_ERROR" }
    }
}
