import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { buttonVariants } from "@/components/ui/button"
import DeleteWorkspace from "../../_components/DeleteWorkspace"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import WorkspaceMembersList from "../../_components/WorkspaceMembersList"
import UpdateWorkspaceInfo from "../../_components/UpdateWorkspaceInfo"
import { getWorkspaceById, getUserWorkspaceRole } from "@/db/queries/workspaces"
import { requireWorkspaceManager } from "@/lib/guards"
import type { Metadata } from "next"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { PageHeader } from "@/components/web/PageHeader"

export const instant = false

export async function generateMetadata({
  params,
}: {
  params: Promise<{ workspaceId: string }>
}): Promise<Metadata> {
  const { workspaceId } = await params
  const session = await auth.api.getSession({ headers: await headers() })

  if (session) {
    const [role, workspace] = await Promise.all([
      getUserWorkspaceRole(workspaceId, session.user.id),
      getWorkspaceById(workspaceId),
    ])

    if (role === "owner" || role === "admin") {
      return {
        title: workspace ? `${workspace.name} · Settings` : "Workspace Settings",
      }
    }
  }

  return { title: "Workspace Settings" }
}

export default async function WorkspaceSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { workspaceId } = await params
  const resolvedSearchParams = await searchParams

  const [{ role }, workspace] = await Promise.all([
    requireWorkspaceManager(workspaceId),
    getWorkspaceById(workspaceId),
  ])
  if (!workspace) {
    notFound()
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        title="Workspace Settings"
        description="Manage this workspace's name and members."
        back={
          <Link
            href={`/workspaces/${workspaceId}`}
            className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
            aria-label="Back to workspace"
          >
            <ArrowLeft className="size-4" />
          </Link>
        }
      />

      <div className="grid items-start gap-6 md:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Workspace Name</CardTitle>
              <CardDescription>
                Update the name of your workspace.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <UpdateWorkspaceInfo
                workspaceId={workspaceId}
                name={workspace.name}
                role={role}
              />
            </CardContent>
          </Card>
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">Danger zone</CardTitle>
              <CardDescription>
                Delete this workspace and all associated data.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                This action is permanent and cannot be undone.
              </p>
            </CardContent>
            <CardFooter className="flex justify-end">
              <DeleteWorkspace workspaceId={workspaceId} role={role} />
            </CardFooter>
          </Card>
        </div>

        <div className="space-y-6 self-start md:sticky md:top-20">
          <Card>
            <CardHeader>
              <CardTitle>Members</CardTitle>
              <CardDescription>
                Everyone with access to this workspace.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="p-4">
                <WorkspaceMembersList
                  workspaceId={workspaceId}
                  role={role}
                  searchParams={resolvedSearchParams}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}