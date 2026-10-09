import MyProjectsList from "./_components/MyProjectsList"

export const instant = false

export default async function MyProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const resolvedSearchParams = await searchParams

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between border-b border-border/40 pb-4">
        <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground">
          My Projects
        </h1>
      </div>

      <MyProjectsList searchParams={resolvedSearchParams} />
    </div>
  )
}