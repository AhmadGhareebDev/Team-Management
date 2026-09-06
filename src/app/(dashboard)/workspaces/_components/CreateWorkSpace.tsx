"use client"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus } from "lucide-react"
import { createWorkspace } from "@/actions/createWorkSpace"
import { useTransition, useState } from "react"
import { Modal } from "@/components/web/Modal"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/toast"
import { useRouter } from "next/navigation"
import { useAuthGate } from "@/components/web/AuthGateProvider"
import {
  insertWorkspaceSchema,
  type InsertWorkspaceSchemaType,
} from "@/db/validations"

export function CreateWorkSpace() {
  const router = useRouter()
  const { require } = useAuthGate()
  const form = useForm<InsertWorkspaceSchemaType>({
    resolver: zodResolver(insertWorkspaceSchema),
    mode: "onSubmit",
    defaultValues: {
      name: "",
    },
  })
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)

  const onSubmit = (data: InsertWorkspaceSchemaType) => {
    require({
      onAllowed: () => {
        startTransition(async () => {
          const result = await createWorkspace(data)

          if (result?.error) {
            if (result.error === "UNAUTHENTICATED") {
              form.setError("root", { message: "You must be logged in to create a workspace." })
              return
            }
            if (result.error === "INVALID_DATA") {
              form.setError("root", { message: "Invalid data. Please check your input." })
              return
            }
            if (result.error === "INTERNAL_ERROR") {
              form.setError("root", { message: "Something went wrong , please try again later." })
              return
            }
          }

          if (result?.success) {
            form.reset()
            setOpen(false)
            toast.add({
              type: "success",
              description: "Workspace created successfully!",
            })
            router.refresh()
          }
        })
      },
    })
  }

  return (
    <Modal
      title="Create Workspace"
      description="Enter a name for your new workspace."
      confirmLabel="Create"
      open={open}
      onOpenChange={setOpen}
      confirmDisabled={!form.formState.isValid || isPending}
      confirmLoading={isPending}
      onSubmit={form.handleSubmit(onSubmit)}
      trigger={
        <Button 
        size="sm" 
        className="gap-1.5 shadow-sm transition-all hover:shadow"
      >
        <Plus className="size-4" />
        <span>New Workspace</span>
      </Button>
      }
    >
      <Field>
        <FieldLabel>Workspace name</FieldLabel>
        <Input placeholder="My workspace" {...form.register("name")} />
        {form.formState.errors.name && (
          <FieldError errors={[form.formState.errors.name]} />
        )}
      </Field>
      {form.formState.errors.root && (
        <p className="text-sm text-center text-red-400">
          {form.formState.errors.root.message}
        </p>
      )}
    </Modal>
  )
}