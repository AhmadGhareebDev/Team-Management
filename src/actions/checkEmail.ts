"use server"
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { user } from "@/db/schemas";


export async function checkEmail(email: string) {
    try {
    const existing = await db.query.user.findFirst({
        where: eq(user.email, email)
    })

    return { success: true ,available: !existing };

    } catch (error) {
        return { success: false , message: "Something went wrong. Please try again later."}
    }

}