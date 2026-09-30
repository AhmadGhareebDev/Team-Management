"use client"
import { Card , CardTitle , CardHeader , CardContent , CardDescription } from "@/components/ui/card";
import { Field , FieldError , FieldGroup , FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm , Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { authClient } from "@/lib/auth-client";
import { passwordValidator , type PasswordValidatorSchemaType } from "@/db/validations";
import { toast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { resolveAuthError } from "@/lib/error-messages";



export default function ResetPasswordForm({token}: { token: string }) {

    const router = useRouter();
    const [isResetPending , startResetTransition] = useTransition();
    const form = useForm<PasswordValidatorSchemaType>({
        resolver: zodResolver(passwordValidator),
        mode: "all",
        defaultValues: {
            password: ""
        }
    })

    const onSubmit = async (data: PasswordValidatorSchemaType) => {
        startResetTransition(async () => {
            const { error } = await authClient.resetPassword({
                newPassword: data.password,
                token,              
            })
            if (error?.code === "INVALID_TOKEN") {
                toast.add({ type: "error", description: "Reset link has expired. Please request a new one." })
                router.push("/auth/login")
                return;
            }
            if (error) {
                form.setError("root", {
                    message: resolveAuthError(
                        error,
                        "We couldn't reset your password. Please try again in a moment."
                    ),
                })
                return;
            }

            toast.add({ type: "success", description: "Password reset successfully!" })
            router.push("/auth/login")
        })
    }


    return (
    <Card className="w-sm">
        <CardHeader>
            <CardTitle>Reset Password</CardTitle>
            <CardDescription>Enter your new password below.</CardDescription>
        </CardHeader>
        <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <FieldGroup>
                    <Controller name="password" control={form.control} render={({ field, fieldState }) => (
                        <Field>
                            <FieldLabel>New Password</FieldLabel>
                            <Input placeholder="••••••••" {...field} />
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                    )} />
                </FieldGroup>
                <Button type="submit" className="w-full mt-4" disabled={isResetPending}>
                    {isResetPending ? "Resetting..." : "Reset Password"}
                </Button>
            </form>
        </CardContent>
    </Card>
)
}