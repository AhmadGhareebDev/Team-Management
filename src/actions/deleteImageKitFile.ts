"use server"
import { imagekit } from "@/lib/imagekit"
import { auth } from "@/lib/auth"
import { headers } from "next/headers";


export async function deleteImageKitFile(fileId: string) {
    const session = await auth.api.getSession({headers: await headers()});
    if (!session) {
        return { success: false , error: "UNAUTHORIZED" }
    };

    try {
        await imagekit.deleteFile(fileId);
        return { success: true }

    } catch (error) {
        console.error("Error deleting file from ImageKit:", error);
        return { success: false, error: "FAILED_TO_DELETE_FILE" }
    }
}
