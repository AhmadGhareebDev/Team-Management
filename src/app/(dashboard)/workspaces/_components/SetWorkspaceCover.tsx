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
import { ImageDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "@/components/ui/toast"
import { updateWorkspaceCover } from "@/actions/updateWorkspaceCover"
import { useAuthGate } from "@/components/web/AuthGateProvider"
import type { WorkspaceRole } from "@/components/web/AuthGateProvider"

interface UploadAuthResponse {
  token: string
  expire: number
  signature: string
  publicKey: string
  folder: string
}

export default function SetWorkspaceCover({
  workspaceId,
  role,
  className,
}: {
  workspaceId: string
  role: WorkspaceRole | null
  className?: string
}) {
  const router = useRouter()
  const { require } = useAuthGate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const getAuthParams = async (folder: string): Promise<UploadAuthResponse> => {
    const response = await fetch(`/api/upload-auth?folder=${encodeURIComponent(folder)}`)
    if (!response.ok) {
      throw new Error(`Upload authentication failed (${response.status})`)
    }
    return response.json()
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!["image/png", "image/jpeg"].includes(file.type)) {
      toast.add({ type: "error", description: "Please choose a PNG or JPG image." })
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.add({ type: "error", description: "Image must be 5MB or smaller." })
      return
    }

    setIsUploading(true)
    setProgress(0)

    let authParams: UploadAuthResponse
    try {
      authParams = await getAuthParams(`workspaces/${workspaceId}/cover-image`)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not start the upload."
      toast.add({ type: "error", description: message })
      setIsUploading(false)
      return
    }

    try {
      const response = await upload({
        file,
        fileName: "cover.jpg",
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

      if (!response.filePath || !response.fileId) {
        toast.add({ type: "error", description: "Upload returned an invalid response." })
        return
      }

      const result = await updateWorkspaceCover({
        workspaceId,
        coverUrl: response.filePath,
        coverFileId: response.fileId,
      })

      if (!result.success) {
        toast.add({ type: "error", description: "Cover uploaded, but saving it failed." })
        return
      }

      router.refresh()
      toast.add({ type: "success", description: "Cover updated." })
    } catch (error) {
      if (error instanceof ImageKitAbortError) {
        toast.add({ type: "error", description: "Upload was aborted." })
      } else if (error instanceof ImageKitInvalidRequestError) {
        toast.add({ type: "error", description: error.message })
      } else if (error instanceof ImageKitUploadNetworkError) {
        toast.add({ type: "error", description: "Network error while uploading." })
      } else if (error instanceof ImageKitServerError) {
        toast.add({ type: "error", description: error.message })
      } else {
        toast.add({ type: "error", description: "Something went wrong." })
      }
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleClick = () => {
    require({
      role,
      requiredRole: ["owner", "admin"],
      onAllowed: () => fileInputRef.current?.click(),
    })
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        disabled={isUploading}
        onChange={handleFileChange}
      />
      <button
        type="button"
        aria-label="Set workspace cover"
        disabled={isUploading}
        onClick={handleClick}
        className={cn(
          "flex aspect-4/1 w-full cursor-pointer items-center justify-center rounded-lg bg-muted text-muted-foreground transition-all hover:bg-muted/70 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60",
          className
        )}
      >
        {isUploading ? (
          <span className="text-sm">Uploading… {progress}%</span>
        ) : (
          <ImageDown className="size-8" />
        )}
      </button>
    </>
  )
}
