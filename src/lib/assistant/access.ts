import type { UserProjectAccess } from "@/db/queries/project"

// Distills project access into the assistant's permission capabilities.
export function getAssistantAccess(access: UserProjectAccess | null) {
  const role = access?.role ?? null
  const isProjectMember = Boolean(access?.isProjectMember)
  const canManage = role === "owner" || role === "admin"

  return {
    role,
    isProjectMember,
    canView: canManage || isProjectMember,
    canManage,
  }
}
