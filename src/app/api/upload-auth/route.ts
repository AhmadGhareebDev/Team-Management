import { getUploadAuthParams } from "@imagekit/next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
export async function GET(request: Request) {
    const session = await auth.api.getSession({ headers: await headers() })

    if (!session) {
        return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const folder = new URL(request.url).searchParams.get("folder")

    if (!folder) {
        return Response.json({ error: "folder query parameter is required" }, { status: 400 })
    }

    const avatarPrefix = `avatars/${session.user.id}`
    const isAvatarAllowed = folder === avatarPrefix || folder.startsWith(avatarPrefix + "/")

    if (isAvatarAllowed) {
        return issueAuthParams(folder)
    }

    return Response.json({ error: "folder is not allowed for this user" }, { status: 400 })
}

function issueAuthParams(folder: string) {
    const { token, expire, signature } = getUploadAuthParams({
        privateKey: process.env.IMAGEKIT_PRIVATE_KEY as string,
        publicKey: process.env.IMAGEKIT_PUBLIC_KEY as string,
    })

    return Response.json({ token, expire, signature, publicKey: process.env.IMAGEKIT_PUBLIC_KEY, folder })
}