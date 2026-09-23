"use client"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus } from "lucide-react"
import { createProject } from "@/actions/project"
import { useTransition, useState } from "react"
import { Modal } from "@/components/web/Modal"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/toast"
import { useRouter } from "next/navigation"
import { useAuthGate } from "@/components/web/AuthGateProvider"
import { WorkspaceRole } from "@/components/web/AuthGateProvider"
import {
  insertProjectSchema,
  type InsertProjectSchemaType,
} from "@/db/validations"

export function CreateProject({workspaceId , role} : {workspaceId: string,  role: WorkspaceRole | null}) {
  const router = useRouter()
  const { require } = useAuthGate()
  const form = useForm<InsertProjectSchemaType>({
    resolver: zodResolver(insertProjectSchema),
    mode: "onSubmit",
    defaultValues: {
      name: "",
      description: "",
    },
  })
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)

  const onSubmit = (data: InsertProjectSchemaType) => {
    require({
      onAllowed: () => {
        startTransition(async () => {
          const result = await createProject(workspaceId ,data)

          if (result?.error) {
            if (result.error === "UNAUTHENTICATED") {
              form.setError("root", { message: "You must be logged in to create a Project." })
              return
            }
            if(result.error === "FORBIDDEN") {
              form.setError("root", { message: "You do not have permission to create a Project." })
              return
            }
            if(result.error === "UNAUTHORIZED") {
              form.setError("root", { message: "You are not a member of this workspace." })
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
              description: "Project created successfully!",
            })
            router.refresh()
          }
        })
      },
    })
  }

  return (
    <>
      <Button
        size="sm"
        className="gap-1.5 shadow-sm transition-all hover:shadow"
        onClick={() =>
          require({
            role,
            requiredRole: ["owner", "admin"],
            onAllowed: () => setOpen(true),
          })
        }
      >
        <Plus className="size-4" />
        <span>New Project</span>
      </Button>
      <Modal
        title="Create Project"
        description="Enter a name for your new project."
        confirmLabel="Create"
        open={open}
        onOpenChange={setOpen}
        confirmDisabled={!form.formState.isValid || isPending}
        confirmLoading={isPending}
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <Field>
            <FieldLabel>Project name</FieldLabel>
            <Input placeholder="My project" {...form.register("name")} />
            {form.formState.errors.name && (
            <FieldError errors={[form.formState.errors.name]} />
            )}
        </Field>
        <Field>
            <FieldLabel>Project description</FieldLabel>
            <Input placeholder="My project description" {...form.register("description")} />
            {form.formState.errors.description && (
            <FieldError errors={[form.formState.errors.description]} />
            )}
        </Field>

      {form.formState.errors.root && (
        <p className="text-sm text-center text-red-400">
          {form.formState.errors.root.message}
        </p>
      )}
    </Modal>
    </>
  )
}