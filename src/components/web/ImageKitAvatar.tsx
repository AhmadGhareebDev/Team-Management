"use client"

import { useState } from "react"
import { Image, buildSrc } from "@imagekit/next"
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
  const [loaded, setLoaded] = useState(false)

  if (!src) {
    return (
      <Avatar className={className}>
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
    )
  }

  const placeholder = buildSrc({
    urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT!,
    src,
    transformation: [{ quality: 10, blur: 70 }],
  })

  return (
    <Image
      src={src}
      alt={alt}
      width={size * 2}
      height={size * 2}
      transformation={[{ width: size * 2, height: size * 2, quality: 80 }]}
      style={
        loaded
          ? undefined
          : {
              backgroundImage: `url(${placeholder})`,
              backgroundSize: "cover",
              backgroundRepeat: "no-repeat",
            }
      }
      onLoad={() => setLoaded(true)}
      className={cn("shrink-0 rounded-full border border-border object-cover", className)}
    />
  )
}