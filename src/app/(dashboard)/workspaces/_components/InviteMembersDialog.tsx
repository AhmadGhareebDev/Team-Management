"use client"

import * as React from "react"
import { Check, Search, X } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ImageKitAvatar } from "@/components/web/ImageKitAvatar"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import { searchUsersByUsername } from "@/actions/user"
  import type { SearchedUser } from "@/actions/user"
  import { inviteUserToWorkspace } from "@/actions/workspace"
import { cn } from "@/lib/utils"

export default function InviteMembersDialog({
  open,
  onOpenChange,
  workspaceId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceId: string
}) {
  const [query, setQuery] = React.useState("")
  const [users, setUsers] = React.useState<SearchedUser[]>([])
  const [invited, setInvited] = React.useState<Record<string, boolean>>({})
  const [isPending, startTransition] = React.useTransition()
  const [invitingId, setInvitingId] = React.useState<string | null>(null)
  const latestQueryRef = React.useRef("")

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setQuery("")
      setUsers([])
      setInvited({})
      setInvitingId(null)
      latestQueryRef.current = ""
    }
    onOpenChange(nextOpen)
  }

  const runSearch = (value: string) => {
    latestQueryRef.current = value
    setQuery(value)

    if (!value.trim()) {
      setUsers([])
      return
    }

    startTransition(async () => {
      const results = await searchUsersByUsername(value, workspaceId)
      if (latestQueryRef.current === value) {
        setUsers(results)
      }
    })
  }

  const handleInvite = async (inviteeId: string) => {
    setInvitingId(inviteeId)
    try {
      const result = await inviteUserToWorkspace({ workspaceId, inviteeId })

      if (result?.error) {
        if (result.error === "ALREADY_MEMBER") {
          toast.add({ type: "error", description: "This user is already a member of the workspace." })
        } else if (result.error === "ALREADY_INVITED") {
          toast.add({ type: "error", description: "This user has already been invited." })
        } else {
          toast.add({ type: "error", description: "Something went wrong. Please try again." })
        }
        return
      }

      if (result.success) {
        setInvited((prev) => ({ ...prev, [inviteeId]: true }))
        toast.add({ type: "success", description: "Invitation sent." })
      }
    } finally {
      setInvitingId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="top-[5%]! max-w-[540px]! -translate-y-0! gap-0 overflow-hidden p-0 shadow-xl sm:max-w-[540px]!"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Invite members</DialogTitle>
        <DialogDescription className="sr-only">
          Search for people to invite to this workspace
        </DialogDescription>

        <div className="flex items-center gap-2 border-b border-border px-5">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => runSearch(e.target.value)}
            placeholder="Search teammates by username..."
            autoFocus
            className="h-12 border-0 bg-transparent px-0 text-base focus-visible:border-0"
          />
          {query && (
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Clear search"
              onClick={() => runSearch("")}
            >
              <X className="size-4" />
            </Button>
          )}
        </div>

        <div className="px-5 pt-4 pb-2">
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            People &amp; Suggestions
          </p>
        </div>

        <div className="max-h-[50vh] overflow-y-auto">
          {isPending ? (
            <div className="flex items-center justify-center px-5 py-10">
              <Spinner />
            </div>
          ) : users.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <Search className="mx-auto size-6 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium text-foreground">
                {query.trim() ? "No users found" : "Search for a user to invite"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {query.trim() ? "Try a different username" : "Type a username above"}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {users.map((user) => {
                const isInvited =
                  Boolean(invited[user.id]) ||
                  user.workspaceInvitationsReceived.some(
                    (inv) => inv.status === "pending"
                  )
                const isInviting = invitingId === user.id
                const initials = user.name
                  .trim()
                  .split(/\s+/)
                  .map((word) => word[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()

                return (
                  <li key={user.id}>
                    <div className="flex items-center gap-3 px-5 py-3">
                      <div className="relative shrink-0">
                        <ImageKitAvatar
                          src={user.avatar_url}
                          alt={user.name}
                          initials={initials}
                          size={32}
                          className="size-8!"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {user.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          @{user.username}
                        </p>
                      </div>
                      <Button
                        variant={isInvited ? "secondary" : "default"}
                        size="sm"
                        disabled={isInvited || isInviting}
                        onClick={() => handleInvite(user.id)}
                      >
                        {isInviting ? (
                          <Spinner data-icon="inline-start" className="size-3.5" />
                        ) : isInvited ? (
                          <Check data-icon="inline-start" className="size-3.5" />
                        ) : null}
                        {isInviting ? "Inviting" : isInvited ? "Invited" : "Invite"}
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center gap-4 border-t border-border bg-muted/40 px-5 py-3 font-mono text-[15px] text-muted-foreground">
          <span className={cn("ml-auto flex items-center gap-1.5")}>
            esc Close
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}