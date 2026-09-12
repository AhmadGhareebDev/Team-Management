import { getWorkspaceMembers } from "@/db/queries/workspaces"
import MemberRow from "./MemberRow"
import type { WorkspaceRole } from "@/components/web/AuthGateProvider"

export default async function WorkspaceMembersList({
  workspaceId,
  role,
}: {
  workspaceId: string
  role: WorkspaceRole | null
}) {
    const members = await getWorkspaceMembers(workspaceId)
    return (
        <>
        {members.map((member) => (
                <MemberRow key={member.id} member={member} role={role} workspaceId={workspaceId} />
              ))}
            </>
    )
}