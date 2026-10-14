import Ably from "ably"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import {
  notificationChannel,
  projectChannel,
  workspaceChannel,
} from "@/lib/ably-channel"
import { getAccessibleProjectIds } from "@/db/queries/project"
import { getAccessibleWorkspaceIds } from "@/db/queries/workspaces"

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!process.env.ABLY_API_KEY) {
    return Response.json({ error: "Realtime not configured" }, { status: 503 })
  }

  const [projectIds, workspaceIds] = await Promise.all([
    getAccessibleProjectIds(session.user.id),
    getAccessibleWorkspaceIds(session.user.id),
  ])

  // Enumerated per user on purpose. A wildcard such as `project:*` would let any
  // logged in user subscribe to any project's canvas.
  const capability: Record<string, ("subscribe" | "publish" | "presence" | "history")[]> = {
    [notificationChannel(session.user.id)]: ["subscribe"],
  }

  for (const projectId of projectIds) {
    capability[projectChannel(projectId)] = ["subscribe"]
  }

  for (const workspaceId of workspaceIds) {
    capability[workspaceChannel(workspaceId)] = ["subscribe"]
  }

  const ably = new Ably.Rest({ key: process.env.ABLY_API_KEY })

  const tokenRequest = await ably.auth.createTokenRequest({ capability })

  return Response.json(tokenRequest)
}