"use client"

import { type WorkspaceWithRole } from "@/db/queries/workspaces"
import { Card, CardHeader, CardTitle, CardAction, CardFooter } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { ArrowUpRight, Building2 } from "lucide-react"

const roleStyles: Record<string, string> = {
  owner: "bg-primary text-primary-foreground",
  admin: "bg-secondary text-secondary-foreground",
  member: "border border-border text-muted-foreground",
}

function RoleBadge({ role }: { role: "owner" | "admin" | "member" }) {
  return (
    <span
      className={cn(
        "shrink-0 px-2 py-0.5 text-[11px] font-mono font-semibold uppercase tracking-wider",
        roleStyles[role] ?? roleStyles.member
      )}
    >
      {role}
    </span>
  )
}

export function WorkSpaceCard({ workspace }: { workspace: WorkspaceWithRole }) {
  const router = useRouter()
  const name = workspace.workspace?.name ?? "Untitled Workspace"
  const role = (workspace.role ?? "member") as "owner" | "admin" | "member"
  const initial = name.charAt(0).toUpperCase()

  return (
    <Card
      size="sm"
      onClick={() => router.push(`/workspaces/${workspace.workspaceId}`)}
      className={cn(
        "group relative cursor-pointer border-0 transition-all duration-300",
        "bg-gradient-to-br from-primary/[0.03] via-transparent to-transparent hover:from-primary/[0.08]",
        "hover:shadow-md hover:ring-foreground/15"
      )}
    >
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex h-9 w-9 items-center justify-center bg-muted/60 font-mono text-sm font-bold text-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
            {initial ? initial : <Building2 className="h-4 w-4" />}
          </div>

          <CardAction className="flex items-center gap-2">
            <RoleBadge role={role} />
            <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
          </CardAction>
        </div>

        <CardTitle title={name} className="mt-3 truncate text-base font-semibold normal-case tracking-normal">
          {name}
        </CardTitle>
      </CardHeader>

      <CardFooter className="pt-0 text-[12px] font-mono text-muted-foreground">
        <span>Click to view workspace</span>
      </CardFooter>
    </Card>
  )
}