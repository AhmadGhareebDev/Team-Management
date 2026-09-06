"use client"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/toast"
import { updateWorkspaceInfo } from "@/actions/updateWorkspaceInfo"
import { insertWorkspaceSchema, type InsertWorkspaceSchemaType } from "@/db/validations"
import { useAuthGate } from "@/components/web/AuthGateProvider"
import type { WorkspaceRole } from "@/components/web/AuthGateProvider"

export default function UpdateWorkspaceInfo({
  workspaceId,
  name,
  role,
}: {
  workspaceId: string
  name: string
  role: WorkspaceRole | null
}) {
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

  const onSubmit = (data: InsertWorkspaceSchemaType) => {
    require({
      role,
      requiredRole: ["owner", "admin"],
      onAllowed: () => {
        startTransition(async () => {
          const result = await updateWorkspaceInfo(workspaceId, data)

          if (result?.error) {
            if (result.error === "UNAUTHENTICATED") {
              form.setError("root", { message: "You must be logged in to change the workspace name." })
              return
            }
            if (result.error === "INVALID_DATA") {
              form.setError("root", { message: "Invalid name. Please check your input." })
              return
            }
            if (result.error === "UNAUTHORIZED") {
              form.setError("root", { message: "You are not a member of this workspace." })
              return
            }
            if (result.error === "FORBIDDEN") {
              form.setError("root", { message: "Only owners and admins can change the workspace name." })
              return
            }
            if (result.error === "INTERNAL_ERROR") {
              form.setError("root", { message: "Something went wrong, please try again later." })
              return
            }
          }

          if (result?.success) {
            form.reset({ name: data.name })
            toast.add({ type: "success", description: "Workspace name updated!" })
            router.refresh()
          }
        })
      },
    })
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Field>
          <FieldLabel htmlFor="workspace-name">Name</FieldLabel>
          <Input id="workspace-name" placeholder={name} {...form.register("name")} />
          {form.formState.errors.name && (
            <FieldError errors={[form.formState.errors.name]} />
          )}
        </Field>
      </div>
      {form.formState.errors.root && (
        <p className="text-sm text-center text-red-400">
          {form.formState.errors.root.message}
        </p>
      )}
      <div className="flex justify-end">
        <Button type="submit" disabled={!form.formState.isDirty || isPending}>
          {isPending ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </form>
  )
}