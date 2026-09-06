import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"
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
import { auth } from "@/lib/auth"
import { headers } from "next/headers"

export const instant = false

export default async function WorkspaceSettingsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>
}) {
  const { workspaceId } = await params

  const workspace = await getWorkspaceById(workspaceId)
  if (!workspace) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-lg text-muted-foreground">Workspace not found</p>
      </div>
    )
  }

  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    redirect("/auth/login")
  }

  const role = await getUserWorkspaceRole(workspaceId, session.user.id)

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <Link
          href={`/workspaces/${workspaceId}`}
          className={buttonVariants({ variant: "secondary", size: "sm" })}
        >
          <ArrowLeft className="size-4" />
          Back to Workspace
        </Link>
      </div>

      <div className="space-y-1">
        <h1 className="font-serif text-2xl">Workspace Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your workspace name and members.
        </p>
      </div>

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
                          Delete This workspace and all associated data.
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
            <CardContent className="divide-y divide-border p-0">
              <WorkspaceMembersList workspaceId={workspaceId} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}