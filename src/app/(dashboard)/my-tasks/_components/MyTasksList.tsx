import Link from "next/link"
import { headers } from "next/headers"
import { ListTodo } from "lucide-react"
import { auth } from "@/lib/auth"
import { getUserAssignedTasks } from "@/db/queries/task"
import { Button } from "@/components/ui/button"
import UserTaskCard from "./UserTaskCard"

export default async function MyTasksList() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return (
      <div className="col-span-full h-screen flex flex-col items-center justify-center gap-4 py-16">
        <p className="text-sm text-muted-foreground">
          You need to be logged in to see your tasks.
        </p>
        <Link href="/auth/login">
          <Button>Log in</Button>
        </Link>
      </div>
    )
  }

  const tasks = await getUserAssignedTasks(session.user.id)

  if (tasks.length === 0) {
    return (
      <div className="col-span-full flex flex-col items-center justify-center py-16">
        <ListTodo className="size-8 text-muted-foreground/60" />
        <p className="mt-4 text-sm font-medium text-foreground">No tasks assigned to you</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Tasks you get assigned will show up here.
        </p>
      </div>
    )
  }

  return (
    <>
      {tasks.map((task) => (
        <UserTaskCard key={task.id} task={task} />
      ))}
    </>
  )
}