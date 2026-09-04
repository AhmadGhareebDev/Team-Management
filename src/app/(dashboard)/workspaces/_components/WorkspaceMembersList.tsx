import { getWorkspaceMembers } from "@/db/queries/workspaces"
import MemberRow from "./MemberRow"
export default async function WorkspaceMembersList({ workspaceId }: { workspaceId: string }) {
    const members = await getWorkspaceMembers(workspaceId)
    return (
        <>
        {members.map((member) => (
                <MemberRow key={member.id} member={member} />
              ))}
            </>
    )
}