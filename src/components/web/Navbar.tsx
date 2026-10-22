"use client"
import { ModeToggle } from "./ModeToggle"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { NotificationsDropdown } from "./NotificationsDropdown"
import { authClient } from "@/lib/auth-client"

export function Navbar({
  withSidebarTrigger = false,
}: {
  withSidebarTrigger?: boolean
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
    <header className="sticky top-0 z-40 flex h-14 w-full items-center gap-2 border-b border-border/40 bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/80">
      {withSidebarTrigger && <SidebarTrigger />}
      <Link
        href="/"
        className="shrink-0 text-sm font-semibold tracking-widest text-foreground uppercase whitespace-nowrap"
      >
        <span aria-hidden="true" className="sm:hidden">TM</span>
        <span className="max-sm:sr-only">Team Management</span>
      </Link>
      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        {isPending ? (
          <Spinner className="size-4" />
        ) : session ? (
          <>
            <NotificationsDropdown />
            <ModeToggle />
            <Button
              variant="outline"
              size="sm"
              type="button"
              disabled={isSignOutPending}
              onClick={handleSignOut}
              className="max-sm:hidden"
            >
              {isSignOutPending && <Spinner data-icon="inline-start" />}
              Log out
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              type="button"
              disabled={isSignOutPending}
              onClick={handleSignOut}
              aria-label="Log out"
              className="sm:hidden"
            >
              {isSignOutPending ? <Spinner className="size-4" /> : <LogOut className="size-4" />}
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