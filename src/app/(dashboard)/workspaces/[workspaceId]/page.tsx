import { Settings } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import {
  Card,
} from "@/components/ui/card"
import { getWorkspaceById, getUserWorkspaceRole } from "@/db/queries/workspaces"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"

import { CreateProject } from "../_components/CreateProject"
import InviteUser from "../_components/InviteUser"
import ProjectList from "../_components/ProjectsList"
import WorkspaceMembersList from "../_components/WorkspaceMembersList"
import SetWorkspaceCover from "../_components/SetWorkspaceCover"
import { ImageKitImage } from "@/components/web/ImageKitImage"


export const instant = false;



export default async function WorkspaceDetailsPage({params} : { params: Promise<{workspaceId: string}> }) {
  const { workspaceId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  const role = session ? await getUserWorkspaceRole(workspaceId, session.user.id) : null;
  const workspace = await getWorkspaceById(workspaceId);
  if (!workspace) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-lg text-muted-foreground">
          Workspace not found
        </p>
      </div>
    )
  }
  return (
    <div className="space-y-6">
      <div className=" absolute top-22 left-8 z-100 ">
                <Link href="/workspaces" className={buttonVariants({variant:"secondary"})}>
                    <ArrowLeft className="size-4"/>
                    Go Back
                </Link>
            </div>
      <div className="relative">
        <div className="group relative aspect-4/1 w-full overflow-hidden rounded-lg bg-muted">
          {workspace.cover_url ? (
            <ImageKitImage
              src={workspace.cover_url}
              alt={`${workspace.name} cover`}
              fill
              loading="eager"
              sizes="100vw"
              className="rounded-lg object-cover"
            />
          ) : null}
          <SetWorkspaceCover
            workspaceId={workspaceId}
            role={role}
            className={
              workspace.cover_url
                ? "absolute inset-0 rounded-lg opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                : "absolute inset-0 rounded-lg"
            }
          />
        </div>
        <div className="flex items-end justify-between gap-4 pt-4">
          <h1 className="font-serif text-3xl font-semibold text-foreground">
            {workspace.name}
          </h1>
          <Link
            href={`/workspaces/${workspaceId}/settings`}
            className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
            aria-label="Workspace settings"
          >
            <Settings />
          </Link>
        </div>
      </div>

      <div className="grid items-start gap-6 md:grid-cols-12">
        <div className="space-y-4 md:col-span-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Projects</h2>
            <CreateProject workspaceId={workspaceId} role={role}/>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ProjectList workspaceId={workspaceId} role={role} />
          </div>
        </div>

        <div className="space-y-4 self-start md:col-span-4 md:sticky md:top-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Members</h2>
            <InviteUser workspaceId={workspaceId} role={role} />
          </div>

          <Card className="overflow-hidden">
            <div className="divide-y divide-border">
              <WorkspaceMembersList workspaceId={workspaceId} role={role} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  )

}