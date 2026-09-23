"use client"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { insertSignUpUserSchema , InsertSignUpUserSchemaType } from "@/db/validations"
import { Controller , useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Field, FieldError, FieldGroup , FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client"
import { toast } from "@/components/ui/toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Spinner } from "@/components/ui/spinner"
import { checkUsername, checkEmail } from "@/actions/user";
import { Check } from "lucide-react"
import { useState } from "react"
import { createEmailVerifyTokenAction } from "@/actions/user";
export default function SignUp() {
   const router = useRouter();
   const [isLoginPending, startLoginTransition] = useTransition();
  
   const form = useForm<InsertSignUpUserSchemaType>({
      resolver: zodResolver(insertSignUpUserSchema),
      mode: "all",
      defaultValues: {
         name: "",
         username: "",
         email: "",
         password: ""
      }
   })

    const [disableButton , setDisableButton] = useState(false);
    const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");



   const onSubmit = async (data: InsertSignUpUserSchemaType) => {
         startLoginTransition(async () => {
            const emailCheckResult = await checkEmail(data.email);
            if (!emailCheckResult?.success) {
               toast.add({
                  type: "warning",
                  description:"Something went wrong. Please try again later.", 
               })
               return
            }
            if (emailCheckResult?.success) {
               const { available } = emailCheckResult;
               if (!available) {
                  toast.add({
                     type: "warning",
                     description:"Email is already in use. Please use a different email.", 
                  })
                  return
               }
            }
            const { error } = await authClient.signUp.email({
               ...data,        
            })

            if(!error) {
               toast.add({
                  timeout: 10000, 
                  type: "success",
                  description: "Signed up successfully!",
               })
               const token = await createEmailVerifyTokenAction(data.email);
               router.push(`/auth/verify-email?token=${token}`)
               router.refresh()
               return;
            }
            form.setError("root", {
               message: "Something went wrong. Please try again later."
         });
         })
   }


   return (
        <Card className="w-lg">
         <CardHeader>
            <CardTitle>Sign Up</CardTitle>
            <CardDescription>
               Welcome! Please enter your details to create an account.
            </CardDescription>
         </CardHeader>
        
         <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)}>
               <FieldGroup className="gap-3">
                  <Controller name="name" control={form.control} render={({field , fieldState}) => (
                     <Field>
                           <FieldLabel>Name</FieldLabel>
                           <Input  placeholder="John Doe" {...field} />
                           {fieldState.invalid && (
                           <FieldError errors={[fieldState.error]} />
                        )}
  
                  </Field>     
                  )} />
                   <Controller name="username" control={form.control} render={({field , fieldState}) => (
                      <Field>
                            <FieldLabel>Username</FieldLabel>
                            <div className="relative">
                               <Input  placeholder="john_doe" className={usernameStatus !== "idle" ? "pr-8" : ""} {...field} onChange={(e) => {
                                  field.onChange(e);
                                  setUsernameStatus("idle");
                               }} onBlur={async (e) => {
                                  field.onBlur();
               
                                  const value = e.target.value;
                                  if (!value || fieldState.invalid) return; 
                                  setUsernameStatus("checking");
                                  const result = await checkUsername(field.value);
                                  if (!result?.success) {
                                     form.setError("root" , {
                                        message: result.message
                                     })
                                     setUsernameStatus("idle");
                                     return
                                  }
                                  if (!result?.available) {
                                     setDisableButton(true);
                                     setUsernameStatus("taken");
                                     form.setError("username", {
                                        message: "Username is already taken."
                                     });
                                  } else {
                                     form.clearErrors("username");
                                     setDisableButton(false);
                                     setUsernameStatus("available");
                                  }
                               }} />
                               {usernameStatus === "checking" && (
                                  <Spinner className="absolute right-2 top-1/2 -translate-y-1/2" />
                               )}
                               {usernameStatus === "available" && (
                                  <Check className="absolute right-2 top-1/2 -translate-y-1/2 text-green-500" />
                               )}
                            </div>
                            {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                         )}
   
                   </Field>     
                   )} />
                  <Controller name="email" control={form.control} render={({field , fieldState}) => (
                     <Field>
                           <FieldLabel>Email</FieldLabel>
                           <Input  placeholder="john.doe@example.com" {...field} />
                           {fieldState.invalid && (
                           <FieldError errors={[fieldState.error]} />
                        )}
                     </Field>     
                  )} />
                   <Controller name="password" control={form.control} render={({field , fieldState}) => (
                      <Field>
                           <FieldLabel>Password</FieldLabel>
                            <Input className="px-2"  placeholder="••••••••" {...field} />
                            <div className="flex w-full items-start justify-between mt-1.5 gap-2">
                              <div>
                                 {fieldState.invalid && (
                                    <FieldError errors={[fieldState.error]} />
                                 )}
                              </div>
                              
                              </div>
                      </Field>     
                   )} />
                </FieldGroup>
                <Button type="submit" className="w-full mt-4" disabled={isLoginPending || disableButton}>
                   {isLoginPending ? <Spinner data-icon="inline-start" /> : <></>}
                   {isLoginPending ? "Signing up..." : "Sign Up"}

                </Button>
             </form>
             <p className="mt-4 text-center text-sm text-muted-foreground">
                already have an account?{" "}
                <Link href="/auth/login" className="font-medium text-primary hover:underline">Log in</Link>
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