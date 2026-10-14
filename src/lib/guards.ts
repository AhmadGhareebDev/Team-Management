import { headers } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getUserWorkspaceRole } from "@/db/queries/workspaces"
import type { WorkspaceRole } from "@/components/web/AuthGateProvider"

/**
 * Page level guards. The server actions each verify membership and role on
 * their own, but that only protects writes: without these a page still renders
 * the workspace's projects and member list to anyone holding the URL.
 *
 * A non member is given notFound() rather than a 403 on purpose, so the response
 * is identical for a workspace that does not exist and one they cannot see.
 */
export async function requireWorkspaceMembership(workspaceId: string) {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect("/auth/login")
  }

  const role = await getUserWorkspaceRole(workspaceId, session.user.id)

  if (!role) {
    notFound()
  }

  return { session, role: role as WorkspaceRole }
}

/** Members may view the workspace; only owners and admins may open settings. */
export async function requireWorkspaceManager(workspaceId: string) {
  const { session, role } = await requireWorkspaceMembership(workspaceId)

  if (role !== "owner" && role !== "admin") {
    notFound()
  }

  return { session, role }
}