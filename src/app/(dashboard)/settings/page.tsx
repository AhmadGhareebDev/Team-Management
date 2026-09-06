import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Suspense } from "react"
import DeleteUserAccount from "./_components/DeleteUserAccount"
import UpdateProfileForm from "./_components/UpdateProfileForm"
import { ResetPasswordForm } from "./_components/ResetPasswordForm"
import { AvatarUploader } from "./_components/AvatarUploader"
import { RequestPasswordReset } from "./_components/RequestPasswordReset"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import  Link  from "next/link"
import { Button } from "@/components/ui/button"

export const instant = false

export default async function SettingsPage() {
const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return (
      <div className="col-span-full h-screen flex flex-col items-center justify-center gap-4 py-16">
        <p className="text-sm text-muted-foreground">You need to be logged in to Manage your settings.</p>
        <Link href="/auth/login">
          <Button>Log in</Button>
        </Link>
      </div>
    )
  }
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="space-y-1">
        <h1 className="font-serif text-2xl">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account settings and profile.
        </p>
      </div>

      <div className="grid items-start gap-6 md:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>
                Manage your password and account security settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-3">
                <h3 className="text-md font-bold mb-10 text-secondary-foreground">
                  Change password
                </h3>
                <ResetPasswordForm />
              </div>
              <div className="py-15 border-t border-b mt-20">
                 <div className="space-y-3">
                <div className="space-y-1">
                  <h3 className="text-md font-bold mb-10 text-secondary-foreground">
                    Forgot password ?
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    We will email you a link to reset your password. Follow the
                    instructions in that email to create a new one.
                  </p>
                </div>
                  <RequestPasswordReset />
              </div>  
              </div>
             
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
              <Suspense fallback={<p>Loading...</p>}>
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
