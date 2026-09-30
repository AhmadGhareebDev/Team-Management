"use client"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { insertLoginUserSchema , InsertLoginUserSchemaType , emailValidator } from "@/db/validations"
import { Controller , useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Field, FieldError, FieldGroup , FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client"
import { createEmailVerifyTokenAction } from "@/actions/user"
import { toast } from "@/components/ui/toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { Spinner } from "@/components/ui/spinner"
import { useResendCooldown } from "@/hooks/use-resend-cooldown";
import { resolveAuthError } from "@/lib/error-messages";


export default function Login() {
   const router = useRouter();
   const [isLoginPending, startLoginTransition] = useTransition();
   const [emailUnverified, setEmailUnverified] = useState(false);
   const [resendPending, setResendPending] = useState(false);
   const { secondsLeft , isActive , startCooldown  } = useResendCooldown("resend-password-reset-code", 60);
  
   const form = useForm<InsertLoginUserSchemaType>({
      resolver: zodResolver(insertLoginUserSchema),
      mode: "all",
      defaultValues: {
         email: "",
         password: ""
      }
   })

    const onSubmit = async (data: InsertLoginUserSchemaType) => {
          setEmailUnverified(false)
          startLoginTransition(async () => {
            const { error } = await authClient.signIn.email({
               ...data,        
            })

            if(!error) {
               toast.add({
                  timeout: 10000, 
                  type: "success",
                  description: "Logged in successfully!",
               })
               router.push('/workspaces')
               router.refresh()
               return;
            }

            if(error.code === "INVALID_EMAIL_OR_PASSWORD") {
               form.setError("root" , { message: "Invalid email or password." })
               return;
            }
             if(error.status === 403) {
                form.setError("email" , { message: "Please verify your email before logging in." })
                setEmailUnverified(true)
                return
             }
            form.setError("root", {
               message: resolveAuthError(
                  error,
                  "We couldn't log you in. Please try again in a moment."
               ),
         });
          })
    }

    async function onResendCode() {
      const email = form.getValues("email")
      if (!email) return

      const safeParsedEmail = emailValidator.safeParse({ email });
      if (!safeParsedEmail.success) {
        toast.add({ type: "error", description: "Invalid email format." });
        return;
      }

      setResendPending(true)
      const { error } = await authClient.emailOtp.sendVerificationOtp({ email, type: "email-verification" })
      if(error?.status === 429) {
         toast.add({
            type: "info",
            title: "Rate limit exceeded",
            description: "Please wait before trying again.",
         })
         setResendPending(false)
         return;
      }
      if (error) {
        toast.add({ type: "warning", description: "Couldn't send the code. Please try again." })
        setResendPending(false)
        return
      }
      setResendPending(false)
      setEmailUnverified(false)
      form.clearErrors("email")
      const token = await createEmailVerifyTokenAction(email)
      router.push(`/auth/verify-email?token=${token}`)
    }

    async function onForgotPassword() {
      if (isActive) return;
      const email = form.getValues("email");
      if (!email) return;
      const safeParsedEmail = emailValidator.safeParse({ email });
      if (!safeParsedEmail.success) {
        toast.add({ type: "error", description: "Invalid email format." });
        return;
      }
      startCooldown()
      const { error } = await authClient.requestPasswordReset({
         email,
         redirectTo: `/auth/reset-password`
      });

      if (error) {
         console.error("Failed to send password reset email:", error);
         toast.add({
            type: "error",
            title: "error",
            description: "Failed to send password reset email. Please try again later.",
         })
         return;
      }

      toast.add({
         type: "success",
         title: "Password reset email sent",
         description: "Please check your email for further instructions.",
      })
    }

    return (
        <Card className="w-lg">
         <CardHeader>
            <CardTitle>Log In</CardTitle>
            <CardDescription>
               Welcome back! Please enter your credentials to access your account.
            </CardDescription>
         </CardHeader>
        
         <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)}>
               <FieldGroup className="gap-7">
                   <Controller name="email" control={form.control} render={({field , fieldState}) => (
                      <Field>
                            <FieldLabel>Email</FieldLabel>
                            <Input  placeholder="john.doe@example.com" {...field} />
                            {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                         )}
                            {emailUnverified && (
                               <button
                                  type="button"
                                  onClick={onResendCode}
                                  disabled={resendPending}
                                  className="mt-1 text-sm text-primary hover:underline disabled:opacity-60"
                               >
                                  {resendPending ? "Sending code..." : "Resend verification code"}
                               </button>
                            )}
   
                      </Field>     
                   )} />
                   <Controller name="password" control={form.control} render={({field , fieldState}) => (
                      <Field>
                           <FieldLabel>Password</FieldLabel>
                            <Input className="px-2"  placeholder="••••••••" {...field} />
                             <div className="flex w-full items-start justify-between mt-1.5 ">
                               <div className="max-w-75">
                                  {fieldState.invalid && (
                                     <FieldError errors={[fieldState.error]} />
                                  )}
                               </div>
                               <button type="button"  className="text-sm text-primary hover:underline" onClick={onForgotPassword} disabled={isActive}>
                                  {isActive ? `Resend code in ${secondsLeft}s` : "Forgot password?"}
                               </button>
                               </div>
                      </Field>     
                   )} />
                </FieldGroup>
                <Button type="submit" className="w-full mt-4" disabled={isLoginPending}>
                   {isLoginPending ? <Spinner data-icon="inline-start" /> : <></>}
                   {isLoginPending ? "Logging in..." : "Login"}
                </Button>
             </form>
             <p className="mt-4 text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link href="/auth/signup" className="font-medium text-primary hover:underline">Sign up</Link>
             </p>
             
            <CardFooter className="flex flex-col items-center mt-5">
                {form.formState.errors.root && (
                <p className="text-red-400 text-center text-sm">
                    {form.formState.errors.root.message}
                </p>
                    )}
            </CardFooter>
         </CardContent>

        </Card>
   ) 
}