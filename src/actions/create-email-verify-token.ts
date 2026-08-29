"use server"
import { createEmailVerifyToken } from "@/lib/email-verify-token"

export async function createEmailVerifyTokenAction(email: string): Promise<string> {
    return await createEmailVerifyToken(email)
}


