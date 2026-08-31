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
import { AvatarUploader } from "./_components/AvatarUploader"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"

export const instant = false

export default async function SettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() })

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

        <div className="space-y-6 self-start md:sticky md:top-6">
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
