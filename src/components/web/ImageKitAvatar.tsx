"use client"

import { ImageKitImage } from "@/components/web/ImageKitImage"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

export function ImageKitAvatar({
  src,
  alt,
  initials,
  size,
  className,
}: {
  src: string | null
  alt: string
  initials: string
  size: number
  className?: string
}) {
  if (!src) {
    return (
      <Avatar className={className}>
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
    )
  }

  return (
    <ImageKitImage
      src={src}
      alt={alt}
      width={size * 2}
      height={size * 2}
      transformation={[{ width: size * 2, height: size * 2, quality: 80 }]}
      className={cn("shrink-0 rounded-full border border-border", className)}
    />
  )
}