import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function InviteUser({workspaceId , userId} : {workspaceId: string , userId: string}) {
    return (
    <Button variant="outline" size="sm">
       <UserPlus />
        Invite
    </Button>
    )

}