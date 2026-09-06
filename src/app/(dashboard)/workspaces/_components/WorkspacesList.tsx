import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { getUserWorkSpaces } from "@/db/queries/workspaces"
import { WorkSpaceCard } from "./WorkSpaceCard"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default async function WorkspacesList() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return (
      <div className="col-span-full h-screen flex flex-col items-center justify-center gap-4 py-16">
        <p className="text-sm text-muted-foreground">You need to be logged in to create workspaces.</p>
        <Link href="/auth/login">
          <Button>Log in</Button>
        </Link>
      </div>
    )
  }

  const workspaces = await getUserWorkSpaces(session.user.id)

  if (workspaces.length === 0) {
    return (
      <div className="col-span-full flex items-center justify-center py-16">
        <p className="text-sm text-muted-foreground">No workspaces yet.</p>
      </div>
    )
  }

  return (
    <>
      {workspaces.map((workspace) => (
        <WorkSpaceCard key={workspace.id} workspace={workspace} />
      ))}
    </>
  )
}