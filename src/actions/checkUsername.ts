"use server"
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { user } from "@/db/schemas";


export async function checkUsername(username: string) {
    try {
    const existing = await db.query.user.findFirst({
        where: eq(user.username, username)
    })

    return { success: true ,available: !existing };

    } catch (error) {
        return { success: false , message: "Something went wrong. Please try again later."}
    }

}