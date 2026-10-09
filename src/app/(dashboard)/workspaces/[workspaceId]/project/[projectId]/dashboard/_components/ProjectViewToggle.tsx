import Link from "next/link"
import { cn } from "@/lib/utils"

export default function ProjectViewToggle({
  workspaceId,
  projectId,
  active,
}: {
  workspaceId: string
  projectId: string
  active: "dashboard" | "canvas"
}) {
  const base = `/workspaces/${workspaceId}/project/${projectId}`

  const items = [
    { key: "dashboard" as const, label: "Dashboard", href: `${base}/dashboard` },
    { key: "canvas" as const, label: "Canvas", href: base },
  ]

  return (
    <div className="flex shrink-0 items-center rounded-lg border-0 bg-muted/40 p-1">
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            active === item.key
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {item.label}
        </Link>
      ))}
    </div>
  )
}
