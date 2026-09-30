"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Users } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ImageKitAvatar } from "@/components/web/ImageKitAvatar"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import { addProjectMember } from "@/actions/project"
import { authClient } from "@/lib/auth-client"
import type { WorkspaceMemberWithUser } from "@/db/queries/workspaces"
import { resolveActionError } from "@/lib/error-messages"

export default function AddProjectMembersDialog({
  open,
  onOpenChange,
  workspaceId,
  projectId,
  members,
  projectMemberIds,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceId: string
  projectId: string
  members: WorkspaceMemberWithUser[]
  projectMemberIds: string[]
}) {
  const router = useRouter()
  const { data: session } = authClient.useSession()
  const currentUserId = session?.user.id
  const memberIds = new Set(projectMemberIds)
  const [addingId, setAddingId] = useState<string | null>(null)

  const handleAdd = async (userId: string) => {
    setAddingId(userId)
    try {
      const result = await addProjectMember({ workspaceId, projectId, userId })

      if (result?.error) {
        toast.add({
          type: "error",
          description: resolveActionError(
            result.error,
            "We couldn't add this member to the project. Please try again.",
            {
              ALREADY_MEMBER: "This user is already in the project.",
              NOT_WORKSPACE_MEMBER: "This user is not a member of the workspace.",
              FORBIDDEN: "You don't have permission to add members.",
            }
          ),
        })
        return
      }

      toast.add({ type: "success", description: "Member added to the project." })
      router.refresh()
    } finally {
      setAddingId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="top-[5%]! max-w-[540px]! -translate-y-0! gap-0 overflow-hidden p-0 shadow-xl sm:max-w-[540px]!"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Add members to project</DialogTitle>
        <DialogDescription className="sr-only">
          Add workspace members to this project
        </DialogDescription>

        <div className="flex items-center gap-2 px-5 py-4">
          <Users className="size-4 shrink-0 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">Workspace members</p>
        </div>

        <div className="max-h-[50vh] overflow-y-auto">
          {members.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <Users className="mx-auto size-6 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium text-foreground">No members yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Invite people to the workspace first</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {members.map((member) => {
                const isInProject = memberIds.has(member.user.id)
                const isAdding = addingId === member.user.id
                const displayName =
                  member.user.id === currentUserId ? "You" : member.user.name
                const initials = member.user.name
                  .trim()
                  .split(/\s+/)
                  .map((word) => word[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()

                return (
                  <li key={member.user.id}>
                    <div className="flex items-center gap-3 px-5 py-3">
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
                      <Button
                        variant={isInProject ? "secondary" : "default"}
                        size="sm"
                        disabled={isInProject || isAdding}
                        onClick={() => handleAdd(member.user.id)}
                      >
                        {isAdding ? (
                          <Spinner data-icon="inline-start" className="size-3.5" />
                        ) : isInProject ? (
                          <Check data-icon="inline-start" className="size-3.5" />
                        ) : null}
                        {isAdding ? "Adding" : isInProject ? "Added" : "Add"}
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center gap-4 border-t border-border bg-muted/40 px-5 py-3 font-mono text-[15px] text-muted-foreground">
          <span className="ml-auto flex items-center gap-1.5">esc Close</span>
        </div>
      </DialogContent>
    </Dialog>
  )
}