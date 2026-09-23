"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { EllipsisVertical, Folder, Pencil, Trash2, UserPlus, Users } from "lucide-react"
import Link from "next/link"
import { WorkspaceProjectWithMembers, WorkspaceMemberWithUser } from "@/db/queries/workspaces"
import { AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
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
import AddProjectMembersDialog from "./AddProjectMembersDialog"
import { useAuthGate } from "@/components/web/AuthGateProvider"
import type { WorkspaceRole } from "@/components/web/AuthGateProvider"
import { authClient } from "@/lib/auth-client"
import { deleteProject, editProjectInfo } from "@/actions/project"
import { insertProjectSchema, type InsertProjectSchemaType } from "@/db/validations"
import { cn } from "@/lib/utils"

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
  members,
}: {
  project: WorkspaceProjectWithMembers
  workspaceId: string
  role: WorkspaceRole | null
  members: WorkspaceMemberWithUser[]
}) {
  const router = useRouter()
  const { require } = useAuthGate()
  const { data: session } = authClient.useSession()
  const currentUserId = session?.user.id
  const shownMembers = project.members.slice(0, MAX_AVATARS)
  const hiddenCount = project.members.length - shownMembers.length
  const memberLabel = project.members.length === 1 ? "member" : "members"

  const isManager = role === "owner" || role === "admin"

  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [addMembersOpen, setAddMembersOpen] = useState(false)
  const [isEditPending, startEditTransition] = useTransition()
  const [isDeletePending, startDeleteTransition] = useTransition()
  const projectMemberIds = project.members.map((m) => m.user.id)

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

  const handleCardClick = (e: React.MouseEvent<HTMLElement>) => {
    const target = e.target as HTMLElement
    if (target.closest("a, button, input, [data-stop-nav]")) return
    router.push(`/workspaces/${workspaceId}/project/${project.id}`)
  }

  return (
    <Card
      size="sm"
      onClick={handleCardClick}
      className={cn(
        "group/card relative cursor-pointer border-0 transition-all duration-300",
        "bg-gradient-to-br from-primary/[0.03] via-transparent to-transparent hover:from-primary/[0.08]",
        "hover:shadow-md hover:ring-foreground/15"
      )}
    >
      <CardContent className="flex flex-col gap-4 p-5">
        {/* Top Bar: Icon + Title + Actions */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-muted/60 text-foreground transition-colors group-hover/card:bg-primary group-hover/card:text-primary-foreground">
              <Folder className="h-4 w-4" />
            </div>
            <h3 className="truncate text-base font-semibold tracking-tight text-foreground">
              <Link
                href={`/workspaces/${workspaceId}/project/${project.id}`}
                className="hover:underline focus:outline-none"
              >
                {project.name}
              </Link>
            </h3>
          </div>

          {isManager && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                    aria-label={`Actions for ${project.name}`}
                  />
                }
              >
                <EllipsisVertical className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={openEdit}>
                  <Pencil className="h-4 w-4" />
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
                  <Trash2 className="h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Description Section */}
        {project.description ? (
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {project.description}
          </p>
        ) : (
          <p className="text-sm italic text-muted-foreground/60">
            No description provided.
          </p>
        )}

        {/* Footer: Member stats + Avatars */}
        <div className="flex items-center justify-between border-t border-border/40 pt-3">
          <span className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            {project.members.length} {memberLabel}
          </span>

          <div className="flex items-center gap-1" data-stop-nav>
            <AvatarGroup>
              {shownMembers.map((m) => (
                <ImageKitAvatar
                  key={m.user.id}
                  src={m.user.avatar_url}
                  alt={m.user.id === currentUserId ? "You" : m.user.name}
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

            {isManager && (
              <Button
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground hover:text-foreground"
                aria-label={`Add members to ${project.name}`}
                onClick={() =>
                  require({
                    role,
                    requiredRole: ["owner", "admin"],
                    onAllowed: () => setAddMembersOpen(true),
                  })
                }
              >
                <UserPlus className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
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

      <AddProjectMembersDialog
        open={addMembersOpen}
        onOpenChange={setAddMembersOpen}
        workspaceId={workspaceId}
        projectId={project.id}
        members={members}
        projectMemberIds={projectMemberIds}
      />
    </Card>
  )
}