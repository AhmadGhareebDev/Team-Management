"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ImageKitAbortError,
  ImageKitInvalidRequestError,
  ImageKitServerError,
  ImageKitUploadNetworkError,
  upload,
} from "@imagekit/next"
import { ImageKitAvatar } from "@/components/web/ImageKitAvatar"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import { authClient } from "@/lib/auth-client"
import { deleteImageKitFile } from "@/actions/storage"
import { uploadErrorMessages } from "@/lib/error-messages"

interface UploadAuthResponse {
  token: string
  expire: number
  signature: string
  publicKey: string
  folder: string
}

export function AvatarUploader({
  name,
  userId,
  avatarUrl,
  oldAvatarFileId,
}: {
  name: string
  userId: string
  avatarUrl: string | null,
  oldAvatarFileId: string | null
}) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)

  const initials = name
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  const getAuthParams = async (
    folder: string
  ): Promise<
    { ok: true; data: UploadAuthResponse } | { ok: false; message: string }
  > => {
    let response: Response
    try {
      response = await fetch(`/api/upload-auth?folder=${encodeURIComponent(folder)}`)
    } catch {
      return { ok: false, message: uploadErrorMessages.startFailed }
    }

    if (!response.ok) {
      return {
        ok: false,
        message:
          response.status === 401
            ? uploadErrorMessages.sessionExpired
            : uploadErrorMessages.startFailed,
      }
    }

    return { ok: true, data: (await response.json()) as UploadAuthResponse }
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!["image/png", "image/jpeg"].includes(file.type)) {
      toast.add({ type: "error", description: uploadErrorMessages.invalidFileType })
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.add({ type: "error", description: uploadErrorMessages.fileTooLarge })
      return
    }

    setIsUploading(true)
    setProgress(0)

    const auth = await getAuthParams(`avatars/${userId}`)
    if (!auth.ok) {
      toast.add({ type: "error", description: auth.message })
      setIsUploading(false)
      return
    }
    const authParams = auth.data

    try {
      const response = await upload({
        file,
        fileName: "avatar.jpg",
        folder: authParams.folder,
        useUniqueFileName: true,
        publicKey: authParams.publicKey,
        token: authParams.token,
        expire: authParams.expire,
        signature: authParams.signature,
        onProgress: (event) => {
          setProgress(event.total > 0 ? Math.round((event.loaded / event.total) * 100) : 0)
        },
      })

      const updateResult = await authClient.updateUser({
        avatar_url: response.filePath,
        avatar_file_id: response.fileId,
      })

      if (updateResult.error) {
        toast.add({ type: "error", description: uploadErrorMessages.saveFailed })
        return
      }

      router.refresh()
      if (oldAvatarFileId) {
        await deleteImageKitFile(oldAvatarFileId)
      }
      toast.add({ type: "success", description: "Avatar updated." })
    } catch (error) {
      if (error instanceof ImageKitAbortError) {
        toast.add({ type: "error", description: uploadErrorMessages.aborted })
      } else if (error instanceof ImageKitInvalidRequestError) {
        toast.add({ type: "error", description: uploadErrorMessages.rejected })
      } else if (error instanceof ImageKitUploadNetworkError) {
        toast.add({ type: "error", description: uploadErrorMessages.network })
      } else if (error instanceof ImageKitServerError) {
        toast.add({ type: "error", description: uploadErrorMessages.serviceError })
      } else {
        toast.add({ type: "error", description: uploadErrorMessages.failed })
      }
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  return (
    <div className="flex items-center gap-4">
      <ImageKitAvatar
        src={avatarUrl}
        alt={name}
        initials={initials}
        size={80}
        className="!size-20"
      />
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">Avatar</p>
        <p className="text-xs text-muted-foreground">PNG or JPG, up to 2MB.</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          disabled={isUploading}
          onChange={handleFileChange}
        />
        <Button
          variant="outline"
          size="sm"
          type="button"
          className="mt-1"
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {isUploading ? `Uploading… ${progress}%` : "Change avatar"}
        </Button>
      </div>
    </div>
  )
}