import MyTasksList from "./_components/MyTasksList"
import ActivityFeed from "./_components/ActivityFeed"

export const instant = false

export default function MyTasksPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between border-b border-border/40 pb-4">
        <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground">
          My Tasks
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MyTasksList />
      </div>

      <ActivityFeed />
    </div>
  )
}