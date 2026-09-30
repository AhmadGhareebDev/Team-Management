"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { deleteWorkspace } from "@/actions/workspace"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/web/Modal"
import { toast } from "@/components/ui/toast"
import { useAuthGate } from "@/components/web/AuthGateProvider"
import type { WorkspaceRole } from "@/components/web/AuthGateProvider"
import { resolveActionError } from "@/lib/error-messages"

export default function DeleteWorkspace({
  workspaceId,
  role,
}: {
  workspaceId: string
  role: WorkspaceRole | null
}) {
  const router = useRouter()
  const { require } = useAuthGate()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    require({
      role,
      requiredRole: ["owner"],
      onAllowed: () => setOpen(true),
    })
  }

  const onSubmit = () => {
    startTransition(async () => {
        const result =  await deleteWorkspace(workspaceId)

      if (result?.error) {
            if(result.error === "UNAUTHENTICATED") {
                toast.add({
                    type: "error",
                    description: "You must be logged in to delete this workspace.",
                })
            } else if(result.error === "UNAUTHORIZED") {
                toast.add({
                    type: "error",
                    description: "You are not a member of this workspace.",
                })
            } else if(result.error === "FORBIDDEN") {
                toast.add({
                    type: "error",
                    description: "You do not have permission to delete this workspace.",
                })
            } else {
                toast.add({
                    type: "error",
                    description: resolveActionError(
                        result.error,
                        "We couldn't delete this workspace. Please try again in a moment."
                    ),
                })
            }
        }

        if(result.success) {
            setOpen(false)
            toast.add({
                type: "info",
                description: "Workspace deleted successfully.",
            })
            router.push("/workspaces")
        }

      
    })
  }

  return (
    <>
      <Button variant="destructive" onClick={handleDelete}>
        Delete workspace
      </Button>
      <Modal
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen)
        }}
        title="Delete workspace"
        description="This action is permanent and cannot be undone. Are you sure you want to delete this workspace?"
        confirmLabel="Delete"
        confirmVariant="destructive"
        confirmLoading={isPending}
        onConfirm={onSubmit}
      >
      </Modal>
    </>
  )
}