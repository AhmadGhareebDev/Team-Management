import { WorkspaceProjectWithMembers } from "@/db/queries/workspaces"
import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription } from "@/components/ui/card"
import { ImageKitImage } from "@/components/web/ImageKitImage"
import { ImageDown } from "lucide-react"
export default function ProjectCard({ project }: { project: WorkspaceProjectWithMembers }) {
  return (
    <Card className="relative overflow-hidden">
      {project.cover_url ? (
        <div className="relative aspect-video w-full">
          <ImageKitImage src={project.cover_url} alt={project.name} fill sizes="(min-width: 640px) 50vw, 100vw" />
        </div>
      ) : (
        <div className="flex aspect-video w-full items-center justify-center bg-muted/60 text-muted-foreground">
          <ImageDown className="size-7" />
        </div>
      )}
      <CardContent className="space-y-3 py-4">
        <CardDescription className="truncate text-sm font-semibold text-foreground">
          {project.name}
        </CardDescription>
        <AvatarGroup>
          {project.members.map((m) => (
            <Avatar key={m.user.id} size="sm">
              <AvatarFallback>
                {m.user.name
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ))}
          <AvatarGroupCount>+4</AvatarGroupCount>
        </AvatarGroup>
      </CardContent>
    </Card>
  )
}
