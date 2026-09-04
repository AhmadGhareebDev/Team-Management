"use client"

import { useState } from "react"
import { Image, buildSrc } from "@imagekit/next"
import type { Transformation } from "@imagekit/next"
import { cn } from "@/lib/utils"

export function ImageKitImage({
  src,
  alt,
  transformation,
  width,
  height,
  fill = false,
  sizes,
  loading,
  className,
}: {
  src: string
  alt: string
  transformation?: Transformation[]
  width?: number
  height?: number
  fill?: boolean
  sizes?: string
  loading?: "lazy" | "eager"
  className?: string
}) {
  const [loaded, setLoaded] = useState(false)

  const placeholder = buildSrc({
    urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT!,
    src,
    transformation: [{ quality: 10, blur: 70 }],
  })

  return (
    <Image
      src={src}
      alt={alt}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      fill={fill || (!width && !height)}
      sizes={sizes}
      loading={loading}
      transformation={transformation}
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
      className={cn("object-cover", className)}
    />
  )
}
