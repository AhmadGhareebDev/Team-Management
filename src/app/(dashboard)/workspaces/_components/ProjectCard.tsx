"use client"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { EllipsisVertical, Pencil, Trash2, Users } from "lucide-react"
import { WorkspaceProjectWithMembers } from "@/db/queries/workspaces"
import { AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { ImageKitImage } from "@/components/web/ImageKitImage"
import { ImageKitAvatar } from "@/components/web/ImageKitAvatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Modal } from "@/components/web/Modal"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/toast"
import { useAuthGate } from "@/components/web/AuthGateProvider"
import type { WorkspaceRole } from "@/components/web/AuthGateProvider"
import { deleteProject, editProjectInfo } from "@/actions/projectActions"
import { insertProjectSchema, type InsertProjectSchemaType } from "@/db/validations"

const MAX_AVATARS = 4

const projectErrorMessages: Record<string, string> = {
  UNAUTHENTICATED: "You must be logged in.",
  UNAUTHORIZED: "You are not a member of this workspace.",
  FORBIDDEN: "You don't have permission to do this.",
  PROJECT_NOT_FOUND: "Project not found.",
  INTERNAL_SERVER_ERROR: "Something went wrong, please try again later.",
}

export default function ProjectCard({
  project,
  workspaceId,
  role,
}: {
  project: WorkspaceProjectWithMembers
  workspaceId: string
  role: WorkspaceRole | null
}) {
  const router = useRouter()
  const { require } = useAuthGate()
  const shownMembers = project.members.slice(0, MAX_AVATARS)
  const hiddenCount = project.members.length - shownMembers.length
  const memberLabel = project.members.length === 1 ? "member" : "members"

  const isManager = role === "owner" || role === "admin"

  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isEditPending, startEditTransition] = useTransition()
  const [isDeletePending, startDeleteTransition] = useTransition()

  const editForm = useForm<InsertProjectSchemaType>({
    resolver: zodResolver(insertProjectSchema),
    mode: "onSubmit",
    defaultValues: {
      name: project.name,
      description: project.description ?? "",
    },
  })

  const deleteForm = useForm({
    mode: "onSubmit",
    defaultValues: {},
  })

  const openEdit = () => {
    require({
      role,
      requiredRole: ["owner", "admin"],
      onAllowed: () => {
        editForm.reset({
          name: project.name,
          description: project.description ?? "",
        })
        setEditOpen(true)
      },
    })
  }

  const handleEditSubmit = (data: InsertProjectSchemaType) => {
    startEditTransition(async () => {
      const result = await editProjectInfo({ workspaceId, projectId: project.id, data })
      if (result?.error) {
        editForm.setError("root", {
          message: projectErrorMessages[result.error] ?? result.error,
        })
        return
      }
      setEditOpen(false)
      router.refresh()
      toast.add({ type: "success", description: "Project updated." })
    })
  }

  const handleDeleteSubmit = () => {
    startDeleteTransition(async () => {
      const result = await deleteProject({ workspaceId, projectId: project.id })
      if (result?.error) {
        deleteForm.setError("root", {
          message: projectErrorMessages[result.error] ?? result.error,
        })
        return
      }
      setDeleteOpen(false)
      router.refresh()
      toast.add({ type: "success", description: "Project deleted." })
    })
  }

  return (
    <Card className="group/card relative overflow-hidden pt-0 transition-shadow duration-300 hover:shadow-md">
      <div className="relative aspect-video w-full overflow-hidden">
        {project.cover_url ? (
          <ImageKitImage
            src={project.cover_url}
            alt={project.name}
            fill
            sizes="(min-width: 640px) 50vw, 100vw"
            className="transition-transform duration-500 group-hover/card:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted/70 via-muted/40 to-primary/10">
            <span className="font-serif text-4xl font-semibold text-muted-foreground/40">
              {project.name.slice(0, 1).toUpperCase()}
            </span>
          </div>
        )}

        {isManager && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="absolute top-2 right-2 z-10 border border-border/60 bg-background/80 shadow-sm backdrop-blur"
                  aria-label={`Actions for ${project.name}`}
                />
              }
            >
              <EllipsisVertical />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={openEdit}>
                <Pencil />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() =>
                  require({
                    role,
                    requiredRole: ["owner", "admin"],
                    onAllowed: () => setDeleteOpen(true),
                  })
                }
              >
                <Trash2 />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <CardContent className="flex flex-1 flex-col gap-2.5 p-5">
        <h3 className="truncate text-base font-semibold tracking-tight text-foreground">
          {project.name}
        </h3>
        {project.description && (
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground/90">
            {project.description}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between border-t border-border/60 pt-3">
          <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Users className="size-3.5" />
            {project.members.length} {memberLabel}
          </span>
          <AvatarGroup>
            {shownMembers.map((m) => (
              <ImageKitAvatar
                key={m.user.id}
                src={m.user.avatar_url}
                alt={m.user.name}
                initials={m.user.name
                  .trim()
                  .split(/\s+/)
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
                size={24}
                className="size-6!"
              />
            ))}
            {hiddenCount > 0 && <AvatarGroupCount>+{hiddenCount}</AvatarGroupCount>}
          </AvatarGroup>
        </div>
      </CardContent>

      <Modal
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Edit project"
        description="Update the project's name and description."
        confirmLabel="Save"
        confirmDisabled={!editForm.formState.isValid || isEditPending}
        confirmLoading={isEditPending}
        onSubmit={editForm.handleSubmit(handleEditSubmit)}
      >
        <Field>
          <FieldLabel>Project name</FieldLabel>
          <Input placeholder="My project" {...editForm.register("name")} />
          {editForm.formState.errors.name && (
            <FieldError errors={[editForm.formState.errors.name]} />
          )}
        </Field>
        <Field>
          <FieldLabel>Project description</FieldLabel>
          <Input placeholder="My project description" {...editForm.register("description")} />
          {editForm.formState.errors.description && (
            <FieldError errors={[editForm.formState.errors.description]} />
          )}
        </Field>
        {editForm.formState.errors.root && (
          <p className="text-sm text-center text-red-400">
            {editForm.formState.errors.root.message}
          </p>
        )}
      </Modal>

      <Modal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete project"
        description="This action is permanent and cannot be undone. Are you sure you want to delete this project?"
        confirmLabel="Delete"
        confirmVariant="destructive"
        confirmLoading={isDeletePending}
        onSubmit={deleteForm.handleSubmit(handleDeleteSubmit)}
      >
        {deleteForm.formState.errors.root && (
          <p className="text-sm text-center text-red-400">
            {deleteForm.formState.errors.root.message}
          </p>
        )}
      </Modal>
    </Card>
  )
}