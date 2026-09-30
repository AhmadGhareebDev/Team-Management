"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Modal } from "@/components/web/Modal"
import { toast } from "@/components/ui/toast"
import { authClient } from "@/lib/auth-client"
import {
  passwordValidator,
  type PasswordValidatorSchemaType,
} from "@/db/validations"
import { resolveAuthError } from "@/lib/error-messages"

export default function DeleteUserAccount() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const form = useForm<PasswordValidatorSchemaType>({
    resolver: zodResolver(passwordValidator),
    mode: "onSubmit",
    defaultValues: {
      password: "",
    },
  })

  const onSubmit = (data: PasswordValidatorSchemaType) => {
    startTransition(async () => {
      const { error } = await authClient.deleteUser({ password: data.password })

      if (error) {
        toast.add({
          type: "error",
          description: resolveAuthError(
            error,
            "We couldn't delete your account. Please try again in a moment."
          ),
        })
        return
      }

      setOpen(false)
      toast.add({
        type: "success",
        description: "Your account has been deleted.",
      })
      router.push("/")
    })
  }

  return (
    <Modal
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) {
          form.reset()
        }
      }}
      title="Delete account"
      description="This action is permanent and cannot be undone. Enter your password to confirm."
      trigger={<Button variant="destructive">Delete account</Button>}
      confirmLabel="Delete"
      confirmVariant="destructive"
      confirmLoading={isPending}
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <Field>
        <FieldLabel>Password</FieldLabel>
        <Input
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          disabled={isPending}
          {...form.register("password")}
        />
        {form.formState.errors.password && (
          <FieldError errors={[form.formState.errors.password]} />
        )}
      </Field>
    </Modal>
  )
}