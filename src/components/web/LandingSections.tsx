import Image from "next/image"
import { Image as ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"

const FEATURES = [
  {
    title: "Plan work on a canvas",
    body: "Drag tasks around, connect what depends on what, and see what is blocking what.",
    flip: false,
    image: "/screenshots/canvas.png",
    alt: "Task dependency canvas with connected tasks",
    frame: "aspect-[2/1]",
    img: undefined,
  },
  {
    title: "See changes the moment they happen",
    body: "Everyone's screen shows the same thing at the same time, with no refresh needed.",
    flip: true,
    image: "/screenshots/notifications.png",
    alt: "Realtime notification list updating live",
    frame: undefined,
    img: "object-top",
  },
  {
    title: "Keep every team in its own place",
    body: "Separate spaces per team, with roles that decide who can change what.",
    flip: false,
    image: "/screenshots/workspaces.png",
    alt: "Workspace settings with member roles",
    frame: "aspect-[2/1]",
    img: undefined,
  },
]

function Screenshot({
  image,
  alt,
  priority,
  frame,
  img,
  className,
}: {
  image: string | null
  alt: string
  priority?: boolean
  frame?: string
  img?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "relative aspect-[16/10] w-full overflow-hidden border border-border bg-muted/30",
        frame,
        className
      )}
    >
      {image ? (
        <Image
          src={image}
          alt={alt}
          fill
          priority={priority}
          quality={90}
          sizes="(min-width: 1280px) 560px, (min-width: 768px) 50vw, 100vw"
          className={cn("object-cover", img)}
        />
      ) : (
        <div className="flex h-full items-center justify-center">
          <ImageIcon className="size-10 text-muted-foreground/40" />
        </div>
      )}
    </div>
  )
}

function LandingSection({
  title,
  body,
  image,
  alt,
  priority,
  flip,
  frame,
  img,
}: {
  title: string
  body: string
  image: string | null
  alt: string
  priority?: boolean
  flip: boolean
  frame?: string
  img?: string
}) {
  return (
    <div className="grid items-center gap-10 md:grid-cols-2">
      <div className={cn(flip && "md:order-2")}>
        <h2 className="font-serif text-3xl font-semibold text-foreground">{title}</h2>
        <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
          {body}
        </p>
      </div>
      <Screenshot
        image={image}
        alt={alt}
        priority={priority}
        frame={frame}
        img={img}
        className={cn(flip && "md:order-1")}
      />
    </div>
  )
}

export function LandingSections() {
  return (
    <section className="w-full px-6">
      <div className="mx-auto max-w-6xl space-y-24 py-24">
        {FEATURES.map((feature, index) => (
          <LandingSection
            key={feature.title}
            title={feature.title}
            body={feature.body}
            image={feature.image}
            alt={feature.alt}
            priority={index === 0}
            flip={feature.flip}
            frame={feature.frame}
            img={feature.img}
          />
        ))}
      </div>
    </section>
  )
}
