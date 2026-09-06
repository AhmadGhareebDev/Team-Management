"use client"
import { ModeToggle } from "./ModeToggle"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { NotificationsDropdown } from "./NotificationsDropdown"
import type { Notification } from "@/db/queries/notifications"
import { authClient } from "@/lib/auth-client"

export function Navbar({
  withSidebarTrigger = false,
  notifications = [],
}: {
  withSidebarTrigger?: boolean
  notifications?: Notification[]
}) {
  const router = useRouter()
  const { data: session, isPending } = authClient.useSession()
  const [isSignOutPending, startSignOutTransition] = useTransition()

  const handleSignOut = () => {
    startSignOutTransition(async () => {
      await authClient.signOut()
      router.push("/")
      router.refresh()
    })
  }

  return (
    <header className="sticky top-0 z-40 flex h-14 w-full items-center gap-2 border-b bg-background px-4">
      {withSidebarTrigger && <SidebarTrigger />}
      <Link
        href="/"
        className="text-sm font-semibold tracking-widest text-foreground uppercase"
      >
        Team Managment
      </Link>
      <div className="ml-auto flex items-center gap-2">
        {isPending ? (
          <Spinner className="size-4" />
        ) : session ? (
          <>
            <NotificationsDropdown notifications={notifications} />
            <ModeToggle />
            <Button
              variant="outline"
              size="sm"
              type="button"
              disabled={isSignOutPending}
              onClick={handleSignOut}
            >
              {isSignOutPending && <Spinner data-icon="inline-start" />}
              Log out
            </Button>
          </>
        ) : (
          <>
            <ModeToggle />
            <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/auth/login" />}>
              Log in
            </Button>
            <Button variant="default" size="sm" nativeButton={false} render={<Link href="/auth/signup" />}>
              Sign up
            </Button>
          </>
        )}
      </div>
    </header>
  )
}