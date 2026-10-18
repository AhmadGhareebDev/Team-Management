import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { MemberListSkeleton } from "./member-skeleton"

/**
 * Stands in for `UpdateProfileForm`: the Name and Username fields exactly as
 * that form lays them out, so the Profile card does not change height when the
 * real form arrives.
 */
export function ProfileFormSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <div className="space-y-2">
        <Skeleton className="h-3.5 w-12" />
        <Skeleton className="h-9 w-full" />
      </div>

      <div className="space-y-2">
        <Skeleton className="h-3.5 w-16" />
        <Skeleton className="h-9 w-full" />
      </div>

      <Skeleton className="h-9 w-24" />
    </div>
  )
}

/** Stands in for `ResetPasswordForm` under the "Change password" heading. */
export function PasswordFormSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      <div className="space-y-2">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-9 w-full" />
      </div>
      <Skeleton className="h-9 w-32" />
    </div>
  )
}

/** Mirrors the Profile card header + the `AvatarUploader` block (size-20 avatar). */
export function ProfileCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-3.5 w-48" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="size-20 shrink-0 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-8 w-32" />
          </div>
        </div>

        <ProfileFormSkeleton />
      </CardContent>
    </Card>
  )
}

/** Mirrors the Security card: header, password form, then the reset-request block. */
export function SecurityCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3.5 w-64" />
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <PasswordFormSkeleton />
        </div>

        <div className="space-y-3 border-y py-15">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3.5 w-full max-w-md" />
          <Skeleton className="h-9 w-44" />
        </div>
      </CardContent>
    </Card>
  )
}

/** Whole settings body, matching the `md:grid-cols-[1fr_360px]` two-column grid. */
export function SettingsSkeleton() {
  return (
    <div className="grid items-start gap-6 md:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <SecurityCardSkeleton />
      </div>

      <div className="space-y-6 self-start md:sticky md:top-20">
        <ProfileCardSkeleton />
      </div>
    </div>
  )
}

/** Stands in for `UpdateWorkspaceInfo`: a name field plus a save button. */
export function WorkspaceNameFormSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <div className="space-y-2">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-9 w-full" />
      </div>
      <Skeleton className="h-9 w-24" />
    </div>
  )
}

/** Mirrors the Workspace Name card. */
export function WorkspaceNameCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-3.5 w-56" />
      </CardHeader>
      <CardContent className="space-y-4">
        <WorkspaceNameFormSkeleton />
      </CardContent>
    </Card>
  )
}

/** Mirrors the destructive "Danger zone" card and its right-aligned button. */
export function DangerZoneCardSkeleton() {
  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3.5 w-64" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-3.5 w-72" />
      </CardContent>
      <CardFooter className="flex justify-end">
        <Skeleton className="h-9 w-32" />
      </CardFooter>
    </Card>
  )
}

/**
 * Whole workspace settings body: the back button, the heading block, then the
 * same `md:grid-cols-[1fr_360px]` split the real page uses.
 */
export function WorkspaceSettingsSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Skeleton className="h-8 w-40" />

      <div className="space-y-1">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="grid items-start gap-6 md:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <WorkspaceNameCardSkeleton />
          <DangerZoneCardSkeleton />
        </div>

        <div className="space-y-6 self-start md:sticky md:top-20">
          <Card>
            <CardHeader>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3.5 w-64" />
            </CardHeader>
            <CardContent className="p-0">
              <div className="p-4">
                <MemberListSkeleton rows={4} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}