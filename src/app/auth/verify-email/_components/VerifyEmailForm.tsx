"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import { authClient } from "@/lib/auth-client"
import { useResendCooldown } from "@/hooks/use-resend-cooldown"

interface VerifyEmailFormProps { email: string }

export default function VerifyEmailForm({ email }: VerifyEmailFormProps) {
  const router = useRouter()
  const [otp, setOtp] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { secondsLeft, isActive, startCooldown } = useResendCooldown(email , 60)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
  
    setError(null)
    setPending(true)
    const { error } = await authClient.emailOtp.verifyEmail({ email, otp })
    setPending(false)
    if (error) {
      if (error.code === "OTP_EXPIRED") setError("This code has expired. Request a new one.")
      else if (error.code === "TOO_MANY_ATTEMPTS") setError("Too many attempts. Request a new code.")
      else setError("Invalid code. Please try again.")
      return
    }
    toast.add({ type: "success", description: "Email verified! You can now log in." })
    router.push("/auth/login")
  }

  async function onResend() {
    setError(null)
    if (isActive) return;
    startCooldown()
    const { error } = await authClient.emailOtp.sendVerificationOtp({ email, type: "email-verification" })
    if (error?.status === 429) {
      toast.add({
        type: "info",
        title: "Rate limit exceeded",
        description: "Please wait before trying again.",
      })
      return;
    }
    if (error) {
      toast.add({
        type: "error",
        description: "We couldn't send a new code. Please try again in a moment.",
      })
      return;
    }
    toast.add({ type: "success", description: "A new code has been sent." })
  }

  return (
    <Card className="w-sm">
      <CardHeader>
        <CardTitle>Verify your email</CardTitle>
        <CardDescription>
          We sent a 6-digit code to <span className="text-foreground font-medium">{email}</span>. Enter it below.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-6">
        <form onSubmit={onSubmit} className="flex flex-col items-center gap-6 w-full">
          <InputOTP maxLength={6} value={otp} onChange={setOtp}>
            <InputOTPGroup>
              <InputOTPSlot index={0} /><InputOTPSlot index={1} /><InputOTPSlot index={2} />
              <InputOTPSlot index={3} /><InputOTPSlot index={4} /><InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={pending || otp.length < 6}>
            {pending ? <Spinner data-icon="inline-start" /> : "Verify Email"}
          </Button>
        </form>
        <p className="text-sm text-muted-foreground">
          Did not receive a code?{" "}
          <button
            type="button"
            onClick={onResend}
            disabled={isActive}
            className="text-primary font-medium hover:underline disabled:opacity-50 disabled:no-underline"
          >
            {isActive ? `Resend code in ${secondsLeft}s` : "Resend code"}
        </button>
        </p>
      </CardContent>
    </Card>
  )
}