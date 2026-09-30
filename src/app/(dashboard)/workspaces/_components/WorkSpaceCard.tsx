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
        "group cursor-pointer border-0 bg-card transition-colors duration-200",
        "hover:bg-muted/50"
      )}
    >
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-muted font-mono text-sm font-bold text-foreground transition-colors duration-200 group-hover:bg-primary group-hover:text-primary-foreground">
            {initial ? initial : <Building2 className="h-4 w-4" />}
          </div>

          <CardTitle
            title={name}
            className="min-w-0 flex-1 truncate text-base font-semibold normal-case tracking-normal"
          >
            {name}
          </CardTitle>

          <CardAction className="static flex shrink-0 items-center">
            <RoleBadge role={role} />
          </CardAction>
        </div>
      </CardHeader>

      <CardFooter className="flex items-center justify-between pt-0 text-[12px] font-mono text-muted-foreground">
        <span>Click to view workspace</span>
        <ArrowUpRight className="h-4 w-4 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
      </CardFooter>
    </Card>
  )
}