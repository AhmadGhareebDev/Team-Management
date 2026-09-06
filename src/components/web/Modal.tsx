"use client"

import * as React from "react"
import { useId } from "react"
import type { VariantProps } from "class-variance-authority"

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button, buttonVariants } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

type ModalConfirmVariant = NonNullable<
  VariantProps<typeof buttonVariants>["variant"]
>

type ModalProps = {
  trigger?: React.ReactNode
  title: string
  description?: React.ReactNode
  children?: React.ReactNode
  footer?: React.ReactNode
  cancelLabel?: string
  confirmLabel?: string
  confirmVariant?: ModalConfirmVariant
  confirmDisabled?: boolean
  confirmLoading?: boolean
  onConfirm?: React.MouseEventHandler<HTMLButtonElement>
  onSubmit?: React.FormEventHandler<HTMLFormElement>
} & React.ComponentProps<typeof Dialog>

export function Modal({
  trigger,
  title,
  description,
  children,
  footer,
  cancelLabel = "Cancel",
  confirmLabel,
  confirmVariant = "default",
  confirmDisabled = false,
  confirmLoading = false,
  onConfirm,
  onSubmit,
  ...dialogProps
}: ModalProps) {
  const formId = useId()
  const hasForm = Boolean(onSubmit)

  return (
    <Dialog {...dialogProps}>
      {trigger && <DialogTrigger render={trigger as React.ReactElement} />}

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        {onSubmit ? (
          <form
            id={formId}
            onSubmit={(event) => {
              event.preventDefault()
              onSubmit(event)
            }}
            className="grid gap-4"
          >
            {children}
          </form>
        ) : (
          children
        )}

        <DialogFooter>
          {footer ?? (
            <>
              <DialogClose render={<Button variant="outline" />}>
                {cancelLabel}
              </DialogClose>
              {confirmLabel && (
                <Button
                  type={hasForm ? "submit" : "button"}
                  form={hasForm ? formId : undefined}
                  variant={confirmVariant}
                  disabled={confirmDisabled || confirmLoading}
                  onClick={(event) => {
                    if (!hasForm) {
                      onConfirm?.(event)
                    }
                  }}
                >
                  {confirmLoading && <Spinner data-icon="inline-start" />}
                  {confirmLabel}
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}