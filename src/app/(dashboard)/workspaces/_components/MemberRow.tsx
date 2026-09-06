"use client"
import { Crown, EllipsisVertical, ShieldCheck, Trash2 } from "lucide-react"
import { ImageKitAvatar } from "@/components/web/ImageKitAvatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { WorkspaceMemberWithUser } from "@/db/queries/workspaces"
import { cn } from "@/lib/utils"
export default function MemberRow({ member }: { member: WorkspaceMemberWithUser }) {
    const initials = member.user.name
        .trim()
        .split(/\s+/)
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    return (
        <div
                  key={member.user.id}
                  className="flex items-center gap-3 p-3"
                >
                  <ImageKitAvatar
                    src={member.user.avatar_url}
                    alt={member.user.name}
                    initials={initials}
                    size={32}
                    className="size-8!"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {member.user.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      @{member.user.username}
                    </p>
                  </div>
                  <RoleBadge role={member.role} />
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="border-0"
                          aria-label={`Actions for ${member.user.name}`}
                        />
                      }
                    >
                      <EllipsisVertical />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem>
                        <ShieldCheck />
                        Make admin
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Crown />
                        Make owner
                      </DropdownMenuItem>
                      <DropdownMenuItem variant="destructive">
                        <Trash2 />
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
    )
}

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