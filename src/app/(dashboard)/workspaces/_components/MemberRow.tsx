"use client"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Crown, EllipsisVertical, ShieldCheck, Trash2, UserMinus } from "lucide-react"
import { ImageKitAvatar } from "@/components/web/ImageKitAvatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Modal } from "@/components/web/Modal"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import {
  makeMemberAdmin,
  makeMemberOwner,
  makeMemberRegular,
  removeWorkspaceMember,
} from "@/actions/workspace"
import { authClient } from "@/lib/auth-client"
import { WorkspaceMemberWithUser } from "@/db/queries/workspaces"
import type { WorkspaceRole } from "@/components/web/AuthGateProvider"
import { cn } from "@/lib/utils"
import { resolveActionError } from "@/lib/error-messages"

type MemberAction = "admin" | "member" | "owner"

export default function MemberRow({
  member,
  role,
  workspaceId,
}: {
  member: WorkspaceMemberWithUser
  role: WorkspaceRole | null
  workspaceId: string
}) {
  const router = useRouter()
  const { data: session } = authClient.useSession()
  const isSelf = session?.user.id === member.user.id

  const isManager = role === "owner" || role === "admin"
  const showMenu = isManager && !isSelf && member.role !== "owner" && member.role !== "admin"
  const showMakeAdmin = isManager && member.role === "member"
  const showMakeMember = role === "owner" && member.role === "admin"
  const showMakeOwner = role === "owner" && member.role !== "owner"
  const showRemove =
    (role === "owner" && member.role !== "owner") ||
    (role === "admin" && member.role === "member")

  const [pendingAction, setPendingAction] = useState<MemberAction | null>(null)
  const [removeOpen, setRemoveOpen] = useState(false)
  const [isRemovePending, startRemoveTransition] = useTransition()

  const actionFns: Record<MemberAction, (a: string, b: string) => Promise<{ success: boolean; error?: string }>> = {
    admin: makeMemberAdmin,
    member: makeMemberRegular,
    owner: makeMemberOwner,
  }

  const actionSuccess: Record<MemberAction, string> = {
    admin: "is now an admin",
    member: "is now a member",
    owner: "is now the owner",
  }

  const runAction = async (action: MemberAction) => {
    setPendingAction(action)
    const result = await actionFns[action](workspaceId, member.user.id)
    setPendingAction(null)
    if (result.error) {
      toast.add({
        type: "error",
        description: resolveActionError(
          result.error,
          "We couldn't update this member's role. Please try again."
        ),
      })
      return
    }
    toast.add({ type: "info", description: `${member.user.name} ${actionSuccess[action]}` })
    router.refresh()
  }

  const handleConfirmRemove = () => {
    startRemoveTransition(async () => {
      const result = await removeWorkspaceMember(workspaceId, member.user.id)
      if (result.error) {
        toast.add({
          type: "error",
          description: resolveActionError(
            result.error,
            "We couldn't remove this member. Please try again."
          ),
        })
        return
      }
      setRemoveOpen(false)
      toast.add({ type: "info", description: `${member.user.name} was removed from the workspace` })
      router.refresh()
    })
  }

  const initials = member.user.name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  const displayName = isSelf ? "You" : member.user.name

  return (
    <div key={member.user.id} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40">
      <ImageKitAvatar
        src={member.user.avatar_url}
        alt={displayName}
        initials={initials}
        size={32}
        className="size-8!"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {displayName}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          @{member.user.username}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <RoleBadge role={member.role} />
        {showMenu ? (
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
              {(showMakeAdmin || showMakeMember || showMakeOwner) && (
                <>
                  {showMakeAdmin && (
                    <DropdownMenuItem
                      onClick={() => runAction("admin")}
                      disabled={pendingAction !== null}
                    >
                      {pendingAction === "admin" ? <Spinner className="size-4" /> : <ShieldCheck />}
                      Make admin
                    </DropdownMenuItem>
                  )}
                  {showMakeMember && (
                    <DropdownMenuItem
                      onClick={() => runAction("member")}
                      disabled={pendingAction !== null}
                    >
                      {pendingAction === "member" ? <Spinner className="size-4" /> : <UserMinus />}
                      Make member
                    </DropdownMenuItem>
                  )}
                  {showMakeOwner && (
                    <DropdownMenuItem
                      onClick={() => runAction("owner")}
                      disabled={pendingAction !== null}
                    >
                      {pendingAction === "owner" ? <Spinner className="size-4" /> : <Crown />}
                      Make owner
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                </>
              )}
              {showRemove && (
                <DropdownMenuItem variant="destructive" onClick={() => setRemoveOpen(true)}>
                  <Trash2 />
                  Remove
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          isManager && <div aria-hidden className="size-7" />
        )}
      </div>
      <Modal
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        title="Remove member"
        description={`Are you sure you want to remove ${member.user.name} from this workspace? They will lose access to all its projects.`}
        confirmLabel="Remove"
        confirmVariant="destructive"
        confirmLoading={isRemovePending}
        onConfirm={handleConfirmRemove}
      />
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
        "flex w-16 shrink-0 items-center justify-center rounded-sm px-0 py-0.5 text-[15px] font-mono font-bold leading-none",
        roleStyles[role] ?? roleStyles.member
      )}
    >
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </span>
  )
}