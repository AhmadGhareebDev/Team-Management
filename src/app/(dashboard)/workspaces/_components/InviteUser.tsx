"use client"

import * as React from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthGate } from "@/components/web/AuthGateProvider";
import type { WorkspaceRole } from "@/components/web/AuthGateProvider";
import InviteMembersDialog from "./InviteMembersDialog";

export default function InviteUser({ workspaceId, role }: { workspaceId: string, role: WorkspaceRole | null }) {
    const { require } = useAuthGate();
    const [open, setOpen] = React.useState(false);

    return (
        <>
            <Button
                variant="outline"
                size="sm"
                onClick={() =>
                    require({
                        role,
                        requiredRole: ["owner", "admin"],
                        onAllowed: () => setOpen(true),
                    })
                }
            >
                <UserPlus />
                Invite
            </Button>
            <InviteMembersDialog
                open={open}
                onOpenChange={setOpen}
                workspaceId={workspaceId}
            />
        </>
    )

}