"use client"

import Link from "next/link"

import { type WorkspaceWithRole } from "@/db/queries/workspaces"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { ArrowUpRight, Building2 } from "lucide-react"

const roleStyles: Record<string, string> = {
  owner: "bg-primary text-primary-foreground",
  admin: "bg-secondary text-secondary-foreground",
  member: "bg-muted text-muted-foreground",
}

function RoleBadge({ role }: { role: "owner" | "admin" | "member" }) {
  return (
    <span
      className={cn(
        "shrink-0 px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-[0.14em] uppercase",
        roleStyles[role] ?? roleStyles.member
      )}
    >
      {role}
    </span>
  )
}

function MetaCount({ value, label }: { value?: number; label: string }) {
  if (value === undefined) return null

  return (
    <span className="flex items-baseline gap-1">
      <span className="text-foreground/80 tabular-nums">{value}</span>
      <span>{label}</span>
    </span>
  )
}

export function WorkSpaceCard({ workspace }: { workspace: WorkspaceWithRole }) {
  const name = workspace.workspace?.name ?? "Untitled Workspace"
  const role = (workspace.role ?? "member") as "owner" | "admin" | "member"
  const initial = name.charAt(0).toUpperCase()
  const hasCounts =
    workspace.projectCount !== undefined && workspace.memberCount !== undefined
  const projectLabel = workspace.projectCount === 1 ? "project" : "projects"
  const memberLabel = workspace.memberCount === 1 ? "member" : "members"

  return (
    <Card
      size="sm"
      className={cn(
        "group relative gap-0 bg-card py-0 transition-colors duration-200",
        "hover:bg-muted/40 focus-within:ring-2 focus-within:ring-primary"
      )}
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 z-10 w-0.5 origin-top scale-y-0 bg-primary transition-transform duration-200 group-hover:scale-y-100 group-focus-within:scale-y-100"
      />

      <div className="flex min-w-0 items-start gap-3 px-5 pt-5 pb-4">
        <div className="flex size-11 shrink-0 items-center justify-center bg-muted font-heading text-lg font-semibold text-foreground ring-1 ring-foreground/5 ring-inset transition-colors duration-200 group-hover:bg-primary group-hover:text-primary-foreground">
          {initial ? initial : <Building2 className="size-4" />}
        </div>

        <div className="min-w-0 flex-1">
          <span className="block font-mono text-[10px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
            Workspace
          </span>
          <h3 className="mt-0.5 min-w-0 truncate text-base font-semibold tracking-normal text-foreground">
            <Link
              href={`/workspaces/${workspace.workspaceId}`}
              title={name}
              className="outline-none after:absolute after:inset-0 after:content-['']"
            >
              {name}
            </Link>
          </h3>
        </div>

        <RoleBadge role={role} />
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border/50 px-5 py-3 font-mono text-xs text-muted-foreground">
        {hasCounts ? (
          <div className="flex min-w-0 items-center gap-2">
            <MetaCount value={workspace.projectCount} label={projectLabel} />
            <span aria-hidden className="h-3 w-px shrink-0 bg-border" />
            <MetaCount value={workspace.memberCount} label={memberLabel} />
          </div>
        ) : (
          <span>Open workspace</span>
        )}

        <ArrowUpRight
          aria-hidden
          className="size-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        />
      </div>
    </Card>
  )
}
