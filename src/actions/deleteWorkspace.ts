"use server"
import { db } from "@/db";
import { auth } from "@/lib/auth";
import { workspaceMembers , workspace } from "@/db/schemas";
import { eq , and } from "drizzle-orm"
import { headers } from "next/headers";
import { imagekit } from "@/lib/imagekit";




export async function deleteWorkspace(workspaceId: string) {

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

    try {
        await db.delete(workspace)
            .where(eq(workspace.id, workspaceId));
        await imagekit.deleteFolder(`workspaces/${workspaceId}`);
        return { success: true }

    }catch (error) {
        return { success: false, error: "INTERNAL_SERVER_ERROR" }
    }
    

}