import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { WorkspaceMemberWithUser } from "@/db/queries/workspaces"
import { cn } from "@/lib/utils"
export default function MemberRow({ member }: { member: WorkspaceMemberWithUser }) {
    return (
        <div
                  key={member.user.id}
                  className="flex items-center gap-3 p-3"
                >
                  <Avatar>
                    <AvatarFallback>
                      {member.user.name
                        .split(" ")
                        .map((w) => w[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {member.user.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      @{member.user.username}
                    </p>
                  </div>
                  <RoleBadge role={member.role} />
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