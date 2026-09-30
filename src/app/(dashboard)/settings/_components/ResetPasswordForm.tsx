"use client"
import { authClient } from "@/lib/auth-client"
import { Field , FieldGroup , FieldError , FieldLabel } from "@/components/ui/field"
import { resetPasswordSchema , ResetPasswordSchemaType } from "@/db/validations"
import { useForm , Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "@/components/ui/toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useTransition } from "react"
import { resolveAuthError } from "@/lib/error-messages"
export function ResetPasswordForm() {
    const [isResetPending , startResetTransition] = useTransition();
    const form = useForm<ResetPasswordSchemaType>({
        resolver: zodResolver(resetPasswordSchema),
        mode: "onSubmit",
        defaultValues: {
            currentPassword: "",
            newPassword: "",
        }
    })

    const onSubmit =  (data: ResetPasswordSchemaType) => {
        startResetTransition(async () => {
            const { error } = await authClient.changePassword({
                currentPassword: data.currentPassword,
                newPassword: data.newPassword,
                revokeOtherSessions: true,
            })

            if (error) {
                if (error.code === "INVALID_PASSWORD") {
                    form.setError("currentPassword", { message: "Current password is incorrect" })
                    return
                }
                toast.add({
                    type: "error",
                    title: "Reset failed",
                    description: resolveAuthError(
                        error,
                        "We couldn't change your password. Please try again in a moment."
                    ),
                })
                return;
            }

            toast.add({
                type: "success",
                title: "Password reset successful",
                description: "Your password has been successfully reset."
            })
            form.reset()
            })
        
    }

    return (

        <form className="flex flex-col" onSubmit={form.handleSubmit(onSubmit)} >
                <FieldGroup>
                    <Controller name="currentPassword" control={form.control} render={({ field, fieldState }) => (
                        <Field className="w-1/2">
                            <FieldLabel>Current Password</FieldLabel>
                            <Input placeholder="••••••••" {...field} />
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                    )} />
                    <Controller name="newPassword" control={form.control} render={({ field, fieldState }) => (
                        <Field className="w-1/2">
                            <FieldLabel>New Password</FieldLabel>
                            <Input placeholder="••••••••" {...field} />
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                    )} />
                </FieldGroup>
                <Button type="submit" className="mt-4  self-end" disabled={isResetPending}>
                    {isResetPending ? "Resetting..." : "Reset Password"}
                </Button>
            </form>

    )
}
