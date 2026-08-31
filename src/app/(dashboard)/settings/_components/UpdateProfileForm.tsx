"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Check } from "lucide-react"

import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import { authClient } from "@/lib/auth-client"
import { checkUsername } from "@/actions/checkUsername"
import {
  updateProfileSchema,
  type UpdateProfileSchemaType,
} from "@/db/validations"

export default function UpdateProfileForm({
  name,
  username,
}: {
  name: string
  username: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [usernameStatus, setUsernameStatus] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle")

  const form = useForm<UpdateProfileSchemaType>({
    resolver: zodResolver(updateProfileSchema),
    mode: "all",
    defaultValues: {
      name,
      username,
    },
  })

  const onSubmit = (data: UpdateProfileSchemaType) => {
    startTransition(async () => {
      const { error } = await authClient.updateUser({
        name: data.name,
        username: data.username,
      })

      if (error) {
        toast.add({
          type: "error",
          description:
           "Something went wrong. Please try again later.",
        })
        return
      }

      setUsernameStatus("idle")
      toast.add({
        type: "success",
        description: "Profile updated successfully.",
      })
      router.refresh()
    })
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup className="gap-3">
        <Field>
          <FieldLabel>Name</FieldLabel>
          <Input
            placeholder="John Doe"
            disabled={isPending}
            {...form.register("name")}
          />
          {form.formState.errors.name && (
            <FieldError errors={[form.formState.errors.name]} />
          )}
        </Field>

        <Field>
          <FieldLabel>Username</FieldLabel>
          <div className="relative">
            <Input
              placeholder="john_doe"
              className={usernameStatus !== "idle" ? "pr-8" : ""}
              disabled={isPending}
              {...form.register("username", {
                onChange: (event) => {
                  form.setValue("username", event.target.value, {
                    shouldValidate: true,
                  })
                  setUsernameStatus("idle")
                  form.clearErrors("username")
                },
                onBlur: async (event) => {
                  const value = event.target.value
                  if (!value || value === username || form.formState.errors.username) {
                    setUsernameStatus("idle")
                    return
                  }
                  setUsernameStatus("checking")
                  const result = await checkUsername(value)
                  if (!result?.success) {
                    setUsernameStatus("idle")
                    return
                  }
                  if (result.available) {
                    setUsernameStatus("available")
                  } else {
                    setUsernameStatus("taken")
                    form.setError("username", {
                      message: "Username is already taken.",
                    })
                  }
                },
              })}
            />
            {usernameStatus === "checking" && (
              <Spinner className="absolute right-2 top-1/2 -translate-y-1/2" />
            )}
            {usernameStatus === "available" && (
              <Check className="absolute right-2 top-1/2 -translate-y-1/2 text-green-500" />
            )}
          </div>
          {usernameStatus !== "taken" && form.formState.errors.username && (
            <FieldError errors={[form.formState.errors.username]} />
          )}
        </Field>
      </FieldGroup>

      <div className="mt-4 flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? <Spinner data-icon="inline-start" /> : <></>}
          {isPending ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </form>
  )
}