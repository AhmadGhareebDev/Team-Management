import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Image as ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const FEATURES = [
  {
    eyebrow: "The canvas",
    title: "Plan the work as a graph",
    body: "Drag tasks around, connect what depends on what, and see what is blocking what.",
    flip: false,
    image: "/screenshots/canvas.png",
    alt: "Task dependency canvas with connected tasks",
    frame: "aspect-[2/1]",
    img: undefined,
  },
  {
    eyebrow: "Realtime",
    title: "See changes the moment they happen",
    body: "Everyone's screen shows the same thing at the same time, with no refresh needed.",
    flip: true,
    image: "/screenshots/notifications.png",
    alt: "Realtime notification list updating live",
    frame: undefined,
    img: "object-top",
  },
  {
    eyebrow: "Access control",
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
  eyebrow,
  title,
  body,
  image,
  alt,
  priority,
  flip,
  frame,
  img,
  bordered,
}: {
  eyebrow: string
  title: string
  body: string
  image: string | null
  alt: string
  priority?: boolean
  flip: boolean
  frame?: string
  img?: string
  bordered?: boolean
}) {
  return (
    <div
      className={cn(
        "grid items-center gap-10 md:grid-cols-2",
        bordered && "mt-14 border-t border-border/60 pt-14 md:mt-20 md:pt-20"
      )}
    >
      <div className={cn(flip && "md:order-2")}>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          {eyebrow}
        </p>
        <h2 className="mt-3 font-serif text-3xl font-semibold text-foreground">
          {title}
        </h2>
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

function LandingCta() {
  return (
    <div className="mt-14 border border-border bg-card px-5 py-10 text-center sm:mt-20 sm:px-12 sm:py-14">
      <h2 className="font-serif text-3xl font-semibold text-foreground sm:text-4xl">
        Start inside a workspace that is already full
      </h2>
      <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
        The demo workspaces come with projects, tasks and dependencies already
        in place, so there is something real to open, drag around and watch
        update. Four accounts are ready to sign in with.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button
          size="lg"
          nativeButton={false}
          render={<Link href="/workspaces" />}
          className="gap-2"
        >
          Get started
          <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
        <Button
          variant="outline"
          size="lg"
          nativeButton={false}
          render={<Link href="/auth/login" />}
        >
          Sign in to the demo
        </Button>
      </div>
    </div>
  )
}

export function LandingSections() {
  return (
    <section id="features" className="w-full scroll-mt-16 px-4 sm:px-6">
      <div className="mx-auto max-w-6xl py-14 sm:py-20">
        {FEATURES.map((feature, index) => (
          <LandingSection
            key={feature.title}
            eyebrow={feature.eyebrow}
            title={feature.title}
            body={feature.body}
            image={feature.image}
            alt={feature.alt}
            priority={index === 0}
            flip={feature.flip}
            frame={feature.frame}
            img={feature.img}
            bordered={index > 0}
          />
        ))}

        <LandingCta />
      </div>
    </section>
  )
}
