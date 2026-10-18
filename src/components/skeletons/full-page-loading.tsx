import { Spinner } from "@/components/ui/spinner"

/**
 * Centred spinner for full-segment `loading.tsx` files, where the whole page
 * area is being replaced rather than one list inside a stable layout.
 */
export function FullPageLoading({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Spinner className="size-6 text-muted-foreground" aria-label={label} />
    </div>
  )
}