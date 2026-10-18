import { Settings, ArrowLeft } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { headers } from "next/headers"
import { getWorkspaceById, getUserWorkspaceRole } from "@/db/queries/workspaces"
import { requireWorkspaceMembership } from "@/lib/guards"
import { auth } from "@/lib/auth"

import { CreateProject } from "../_components/CreateProject"
import InviteUser from "../_components/InviteUser"
import ProjectList from "../_components/ProjectsList"
import WorkspaceMembersList from "../_components/WorkspaceMembersList"
import { WorkspaceRealtimeBridge } from "@/components/web/WorkspaceRealtimeBridge"
import { ProjectsGridSkeleton, MemberListSkeleton } from "@/components/skeletons"
import { searchParamsKey } from "@/lib/pagination"
import { Suspense } from "react"

export const instant = false

export async function generateMetadata({
  params,
}: {
  params: Promise<{ workspaceId: string }>
}): Promise<Metadata> {
  const { workspaceId } = await params
  const session = await auth.api.getSession({ headers: await headers() })

  if (session && (await getUserWorkspaceRole(workspaceId, session.user.id))) {
    const workspace = await getWorkspaceById(workspaceId)
    return { title: workspace?.name ?? "Workspace" }
  }

  return { title: "Workspace" }
}

export default async function WorkspaceDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { workspaceId } = await params
  const { role } = await requireWorkspaceMembership(workspaceId);
  const workspace = await getWorkspaceById(workspaceId);
  const resolvedSearchParams = await searchParams;
  // Both columns paginate over the same query, so one key covers them: changing
  // the page remounts the boundaries and reveals their skeletons immediately.
  const listKey = searchParamsKey(resolvedSearchParams)

  if (!workspace) {
    notFound();
  }

  return (
    <div className="space-y-6 pt-2">
      <WorkspaceRealtimeBridge workspaceId={workspaceId} />
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/workspaces" className={buttonVariants({ variant: "ghost", size: "icon-sm" })}>
            <ArrowLeft className="size-4" />
          </Link>
          <h1 className="font-serif text-3xl font-semibold text-foreground">
            {workspace.name}
          </h1>
        </div>
        <Link
          href={`/workspaces/${workspaceId}/settings`}
          className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
          aria-label="Workspace settings"
        >
          <Settings className="size-4" />
        </Link>
      </div>

      <div className="grid items-start gap-6 md:grid-cols-12">
        <div className="space-y-4 md:col-span-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Projects</h2>
            <CreateProject workspaceId={workspaceId} role={role}/>
          </div>

          {/* Both columns stream independently: the members list usually
              resolves first, and neither holds up the headings above them. */}
          <Suspense key={listKey} fallback={<ProjectsGridSkeleton />}>
            <ProjectList
              workspaceId={workspaceId}
              role={role}
              searchParams={resolvedSearchParams}
            />
          </Suspense>
        </div>

        <div className="space-y-4 self-start md:col-span-4 md:sticky md:top-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Members</h2>
            <InviteUser workspaceId={workspaceId} role={role} />
          </div>

          <Suspense key={listKey} fallback={<MemberListSkeleton rows={4} />}>
            <WorkspaceMembersList
              workspaceId={workspaceId}
              role={role}
              searchParams={resolvedSearchParams}
            />
          </Suspense>
        </div>
      </div>
    </div>
  )
}