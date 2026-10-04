import MyProjectsList from "./_components/MyProjectsList"

export const instant = false

export default function MyProjectsPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between border-b border-border/40 pb-4">
        <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground">
          My Projects
        </h1>
      </div>

      <MyProjectsList />
    </div>
  )
}