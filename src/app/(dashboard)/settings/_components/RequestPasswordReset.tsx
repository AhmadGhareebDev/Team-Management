"use client"

import { useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import { authClient } from "@/lib/auth-client"
import { useResendCooldown } from "@/hooks/use-resend-cooldown"

export function RequestPasswordReset() {
  const { data: session } = authClient.useSession()
  const email = session?.user.email
  const { secondsLeft, isActive, startCooldown } = useResendCooldown("settings-password-reset", 60)
  const [isPending, startTransition] = useTransition()

  const onRequest = () => {
    if (isActive) return
    if (!email) {
      toast.add({ type: "error", description: "You need to be signed in." })
      return
    }

    startCooldown()
    startTransition(async () => {
      const { error } = await authClient.requestPasswordReset({
        email,
        redirectTo: "/auth/reset-password",
      })

      if (error) {
        toast.add({
          type: "error",
          description: "Failed to send password reset email. Please try again later.",
        })
        return
      }

      toast.add({
        type: "success",
        description: "We've sent a password reset link to your email.",
      })
    })
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="mt-1"
      type="button"
      disabled={isActive || isPending}
      onClick={onRequest}
    >
      {isPending && <Spinner data-icon="inline-start" />}
      {isActive ? `Resend in ${secondsLeft}s` : "Request password reset"}
    </Button>
  )
}