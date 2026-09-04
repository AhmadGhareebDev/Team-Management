"use server"
import { randomUUID } from "crypto";
import { db } from "@/db";
import {  workspace , workspaceMembers } from "@/db/schemas";
import { insertWorkspaceSchema , InsertWorkspaceSchemaType } from "@/db/validations"; 
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function createWorkspace(data: InsertWorkspaceSchemaType) {

    const session = await auth.api.getSession({ headers: await headers() });

    if (!session) {
        return { success: false , error: "UNAUTHENTICATED" }
    }

    const parsedData = insertWorkspaceSchema.safeParse(data);

    if (!parsedData.success) {
        return { success: false , error: "INVALID_DATA" }
    }


    const workspaceId = randomUUID();


    try {
        await db.batch([
            db.insert(workspace).values({
                id: workspaceId,
                name: data.name,
            }),
            db.insert(workspaceMembers).values({
                id: randomUUID(),
                workspaceId,
                userId: session.user.id,
                role: "owner",
            }),
            ])

        return { success: true, workspaceId: workspaceId }
         
    } catch (error) {
        return { success : false , error : "INTERNAL_ERROR" }
    }

}