"use server"
import { db } from "@/db"
import { project , workspaceMembers } from "@/db/schemas"
import { auth } from "@/lib/auth"
import { eq , and } from "drizzle-orm"
import { headers } from "next/headers"
import { InsertProjectSchemaType } from "@/db/validations"


export async function deleteProject({workspaceId, projectId}: {workspaceId: string, projectId: string}) { 

    const session = await auth.api.getSession({ headers: await headers() });
    
        if (!session) {
            return { success: false, error: "UNAUTHENTICATED" }
        }

        try {

        const projectBelongToWorkspace = await db.query.project.findFirst({
            where: and(
                eq(project.id, projectId),
                eq(project.workspaceId, workspaceId)
            )
        })

        if (!projectBelongToWorkspace) {
            return { success: false, error: "PROJECT_NOT_FOUND" }
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

            await db.delete(project).where(eq(project.id, projectId));
            return { success: true }

        } catch (error) {
            return { success: false, error: "INTERNAL_SERVER_ERROR" }
        }

}

export async function editProjectInfo({workspaceId, projectId, data}: {workspaceId: string, projectId: string, data: InsertProjectSchemaType}) {
    const session = await auth.api.getSession({ headers: await headers() });
    
        if (!session) {
            return { success: false, error: "UNAUTHENTICATED" }
        }

        try {

        const projectBelongToWorkspace = await db.query.project.findFirst({
            where: and(
                eq(project.id, projectId),
                eq(project.workspaceId, workspaceId)
            )
        })

        if (!projectBelongToWorkspace) {
            return { success: false, error: "PROJECT_NOT_FOUND" }
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


        await db.update(project)
                .set({
                    name: data.name,
                    description: data.description,
                })
                .where(eq(project.id, projectId));

                
    } catch (error) {
        return { success: false, error: "INTERNAL_SERVER_ERROR" }
    }
}
