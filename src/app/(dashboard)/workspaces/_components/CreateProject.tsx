
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
export default function CreateProject({ workspaceId }: { workspaceId: string }) {

    return (
        <Button size="sm">
            <Plus />
            New Project
        </Button>
    )
}