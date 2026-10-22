"use client"

import Link from "next/link"

import { type WorkspaceWithRole } from "@/db/queries/workspaces"
import { Card, CardHeader, CardTitle, CardAction, CardFooter } from "@/components/ui/card"
import { cn } from "@/lib/utils"
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
        "shrink-0 px-2 py-0.5 font-mono text-[11px] font-semibold tracking-wider uppercase",
        roleStyles[role] ?? roleStyles.member
      )}
    >
      {role}
    </span>
  )
}

export function WorkSpaceCard({ workspace }: { workspace: WorkspaceWithRole }) {
  const name = workspace.workspace?.name ?? "Untitled Workspace"
  const role = (workspace.role ?? "member") as "owner" | "admin" | "member"
  const initial = name.charAt(0).toUpperCase()

  return (
    <Card
      size="sm"
      className={cn(
        "group relative bg-card transition-colors duration-200",
        "hover:bg-muted/50 focus-within:bg-muted/50 focus-within:ring-2 focus-within:ring-primary"
      )}
    >
      <CardHeader>
        {/* min-w-0 lets this grid item shrink so the title truncates instead of
            shoving the role badge out of the card. */}
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center bg-muted font-mono text-sm font-bold text-foreground transition-colors duration-200 group-hover:bg-primary group-hover:text-primary-foreground">
            {initial ? initial : <Building2 className="h-4 w-4" />}
          </div>

          <CardTitle className="min-w-0 flex-1 truncate text-base font-semibold tracking-normal normal-case">
            <Link
              href={`/workspaces/${workspace.workspaceId}`}
              title={name}
              className="outline-none after:absolute after:inset-0 after:content-['']"
            >
              {name}
            </Link>
          </CardTitle>

          <CardAction className="static flex shrink-0 items-center">
            <RoleBadge role={role} />
          </CardAction>
        </div>
      </CardHeader>

      <CardFooter className="flex items-center justify-between pt-0 font-mono text-xs text-muted-foreground">
        <span>Open workspace</span>
        <ArrowUpRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </CardFooter>
    </Card>
  )
}
