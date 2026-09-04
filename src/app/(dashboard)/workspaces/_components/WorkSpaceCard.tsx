"use client"
import { type WorkspaceWithRole } from "@/db/queries/workspaces"
import { Card } from "@/components/ui/card"
import { ImageKitImage } from "@/components/web/ImageKitImage"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"

const roleStyles: Record<string, string> = {
  owner: "bg-primary text-primary-foreground",
  admin: "bg-secondary text-secondary-foreground",
  member: "border border-border text-muted-foreground",
}

function RoleBadge({ role }: { role: "owner" | "admin" | "member" }) {
  return (
    <span
      className={cn(
        "shrink-0  px-2 py-0.5 text-[15px] font-mono font-bold leading-none",
        roleStyles[role] ?? roleStyles.member
      )}
    >
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </span>
  )
}

export function WorkSpaceCard({ workspace }: { workspace: WorkspaceWithRole }) {
  const router = useRouter();
  const name = workspace.workspace?.name ?? "Untitled Workspace"
  const coverUrl = workspace.workspace?.cover_url
  const initial = name.charAt(0).toUpperCase()
  const role = (workspace.role ?? "member") as "owner" | "admin" | "member"

  return (
    <Card onClick={() => router.push(`workspaces/${workspace.workspaceId}`)} className="group flex flex-col overflow-hidden rounded-none border-0 bg-card p-0">
      {/* Cover Image Container */}
      <div className="relative aspect-video w-full bg-muted/40">
        {coverUrl ? (
          <ImageKitImage
            src={coverUrl}
            alt={name}
            fill
            loading="eager"
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="transition-opacity duration-200 group-hover:opacity-90"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-muted/80 to-muted/20 transition-colors duration-200 group-hover:bg-muted/90">
            <span className="font-mono text-sm font-semibold text-muted-foreground/40 transition-colors duration-200 group-hover:text-muted-foreground/70">
              {initial}
            </span>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="flex items-center justify-between gap-2 px-4 py-4">
        <h3 
          className="truncate font-mono text-sm font-medium text-foreground/80 transition-colors duration-200 group-hover:text-foreground" 
          title={name}
        >
          {name}
        </h3>
        
        <RoleBadge role={role} />
      </div>
    </Card>
  )
}