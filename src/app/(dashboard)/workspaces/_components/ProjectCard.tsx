import { WorkspaceProjectWithMembers } from "@/db/queries/workspaces"
import { AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription } from "@/components/ui/card"
import { ImageKitImage } from "@/components/web/ImageKitImage"
import { ImageKitAvatar } from "@/components/web/ImageKitAvatar"
import { ImageDown } from "lucide-react"

const MAX_AVATARS = 4

export default function ProjectCard({ project }: { project: WorkspaceProjectWithMembers }) {
  const shownMembers = project.members.slice(0, MAX_AVATARS)
  const hiddenCount = project.members.length - shownMembers.length

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
      </CardContent>
    </Card>
  )
}