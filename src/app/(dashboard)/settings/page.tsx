import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Suspense } from "react"
import { ProfileFormSkeleton } from "@/components/skeletons"
import DeleteUserAccount from "./_components/DeleteUserAccount"
import UpdateProfileForm from "./_components/UpdateProfileForm"
import { ResetPasswordForm } from "./_components/ResetPasswordForm"
import { AvatarUploader } from "./_components/AvatarUploader"
import { RequestPasswordReset } from "./_components/RequestPasswordReset"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import  Link  from "next/link"
import { Button } from "@/components/ui/button"
import type { Metadata } from "next"
import { PageHeader } from "@/components/web/PageHeader"

export const metadata: Metadata = {
  title: "Settings",
}

export const instant = false

export default async function SettingsPage() {
const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return (
      <div className="col-span-full flex flex-col items-center justify-center gap-4 py-16">
        <p className="text-sm text-muted-foreground">You need to be logged in to Manage your settings.</p>
        <Link href="/auth/login">
          <Button>Log in</Button>
        </Link>
      </div>
    )
  }
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your account settings and public profile."
      />

      <div className="grid items-start gap-6 md:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>
                Manage your password and account security settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <section className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-foreground">
                    Change password
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Pick a new password for your account.
                  </p>
                </div>
                <ResetPasswordForm />
              </section>

              <section className="space-y-4 border-t border-border/60 pt-6">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-foreground">
                    Forgot your password?
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    We will email you a link to reset it. Follow the instructions
                    in that email to create a new one.
                  </p>
                </div>
                <RequestPasswordReset />
              </section>
            </CardContent>
          </Card>

          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">Danger zone</CardTitle>
              <CardDescription>
                Delete your account and all associated data.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Once deleted, your account cannot be recovered.
              </p>
            </CardContent>
            <CardFooter className="flex justify-end">
              <DeleteUserAccount />
            </CardFooter>
          </Card>
          
          

          
        </div>

        <div className="space-y-6 self-start md:sticky md:top-20">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>
                Your public profile information.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <AvatarUploader
                name={session?.user.name ?? "Account"}
                userId={session?.user.id ?? ""}
                avatarUrl={session?.user.avatar_url ?? null}
                oldAvatarFileId={session?.user.avatar_file_id ?? null}
              />
              <Suspense fallback={<ProfileFormSkeleton />}>
              <UpdateProfileForm
                name={session?.user.name ?? "John Doe"}
                username={session?.user.username ?? "johndoe"}
              />
              </Suspense>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
