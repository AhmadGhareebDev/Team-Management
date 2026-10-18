"use server"
import { imagekit } from "@/lib/imagekit"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"


export async function deleteImageKitFile(fileId: string) {
    const session = await auth.api.getSession({headers: await headers()});
    if (!session) {
        return { success: false , error: "UNAUTHORIZED" }
    };

    // A session is not enough: without this any signed-in user could pass
    // someone else's fileId and delete it, because the ImageKit private key
    // makes this call fully privileged. Uploads are already scoped to
    // avatars/{userId} by /api/upload-auth; deletes must match that.
    //
    // The folder is read from ImageKit rather than from the user row on
    // purpose. AvatarUploader writes the new avatar_file_id before deleting the
    // old one, so a "is this still your current avatar?" check would fail and
    // leak every previous avatar forever.
    let filePath: string | undefined
    try {
        const file = await imagekit.getFileDetails(fileId)
        filePath = file?.filePath
    } catch (error) {
        // Unknown file, or ImageKit unreachable. Refuse either way rather than
        // reporting which fileIds exist.
        console.error("Error looking up file in ImageKit:", error);
        return { success: false, error: "FORBIDDEN" }
    }

    const allowedPrefix = `/avatars/${session.user.id}/`
    if (!filePath?.startsWith(allowedPrefix)) {
        return { success: false, error: "FORBIDDEN" }
    }

    try {
        await imagekit.deleteFile(fileId);
        return { success: true }

    } catch (error) {
        console.error("Error deleting file from ImageKit:", error);
        return { success: false, error: "FAILED_TO_DELETE_FILE" }
    }
}