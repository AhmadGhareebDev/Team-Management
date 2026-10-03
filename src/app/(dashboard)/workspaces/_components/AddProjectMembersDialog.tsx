"use client"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Trash2, Users } from "lucide-react"

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
import { Modal } from "@/components/web/Modal"
import { addProjectMember, removeProjectMember } from "@/actions/project"
import { authClient } from "@/lib/auth-client"
import type { WorkspaceMemberWithUser } from "@/db/queries/workspaces"
import { resolveActionError } from "@/lib/error-messages"

type PendingAction = { type: "add" | "remove"; userId: string } | null

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
  const [pending, setPending] = useState<PendingAction>(null)
  const [removeTarget, setRemoveTarget] = useState<WorkspaceMemberWithUser | null>(null)
  const [isRemovePending, startRemoveTransition] = useTransition()

  const isPendingFor = (type: NonNullable<PendingAction>["type"], userId: string) =>
    pending?.type === type && pending.userId === userId

  const handleAdd = async (userId: string) => {
    setPending({ type: "add", userId })
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
      setPending(null)
    }
  }

  const handleRemove = () => {
    if (!removeTarget) return
    const userId = removeTarget.user.id

    startRemoveTransition(async () => {
      const result = await removeProjectMember({ workspaceId, projectId, userId })

      if (result?.error) {
        toast.add({
          type: "error",
          description: resolveActionError(
            result.error,
            "We couldn't remove this member from the project. Please try again.",
            {
              NOT_PROJECT_MEMBER: "This user isn't a member of this project.",
              FORBIDDEN: "You don't have permission to remove members.",
            }
          ),
        })
        return
      }

      setRemoveTarget(null)
      toast.add({ type: "success", description: "Member removed from the project." })
      router.refresh()
    })
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent
      className="top-[5%]! max-w-[540px]! -translate-y-0! gap-0 overflow-hidden p-0 shadow-xl sm:max-w-[540px]!"
      showCloseButton={false}
    >
      <DialogTitle className="sr-only">Manage project members</DialogTitle>
      <DialogDescription className="sr-only">
        Add or remove workspace members on this project
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
              const isAdding = isPendingFor("add", member.user.id)
              const isRemoving = isPendingFor("remove", member.user.id)
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
                    {isInProject ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pending !== null}
                        onClick={() => setRemoveTarget(member)}
                      >
                        {isRemoving ? (
                          <Spinner data-icon="inline-start" className="size-3.5" />
                        ) : (
                          <Trash2 data-icon="inline-start" className="size-3.5" />
                        )}
                        {isRemoving ? "Removing" : "Remove"}
                      </Button>
                    ) : (
                      <Button
                        variant="default"
                        size="sm"
                        disabled={pending !== null}
                        onClick={() => handleAdd(member.user.id)}
                      >
                        {isAdding && (
                          <Spinner data-icon="inline-start" className="size-3.5" />
                        )}
                        {isAdding ? "Adding" : "Add"}
                      </Button>
                    )}
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

      <Modal
        open={removeTarget !== null}
        onOpenChange={(next) => {
          if (!next) setRemoveTarget(null)
        }}
        title="Remove from project"
        description={
          removeTarget
            ? `Are you sure you want to remove ${removeTarget.user.id === currentUserId ? "yourself" : removeTarget.user.name} from this project? They will be unassigned from its tasks.`
            : ""
        }
        confirmLabel="Remove"
        confirmVariant="destructive"
        confirmLoading={isRemovePending}
        onConfirm={handleRemove}
      />
    </>
  )
}