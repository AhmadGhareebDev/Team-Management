"use server"
import { db } from "@/db"
import { workspace, workspaceMembers } from "@/db/schemas"
import { eq , and} from "drizzle-orm"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { InsertWorkspaceSchemaType , insertWorkspaceSchema } from "@/db/validations"


export async function updateWorkspaceInfo(workspaceId: string, data: InsertWorkspaceSchemaType) {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session) {
        return { success: false , error: "UNAUTHENTICATED" }
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

    const canEdit = membership.role === "owner" || membership.role === "admin";
    if (!canEdit) {
        return { success: false, error: "FORBIDDEN" }
    }

    const parsedData = insertWorkspaceSchema.safeParse(data);

    if(!parsedData.success) {
        return { success: false , error: "INVALID_DATA" }
    }

    try {
        await db.update(workspace)
                .set({
                    name: parsedData.data.name,
                })
                .where(eq(workspace.id, workspaceId));

        return { success : true }
    } catch (error) {
        return { success: false, error: "INTERNAL_SERVER_ERROR" }
    }

}